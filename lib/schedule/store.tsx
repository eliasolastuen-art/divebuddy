'use client'

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { addDays, shortDate } from './format'
import { applyTemplate, cloneContent, copyBetweenWeeks, findPreviousPlanned, hasContent, newId, weekToTemplate } from './content'
import { loadSchedule, writes } from './queries'
import type { ClubEvent, ContentStatus, PassContent, PassReview, PlanTemplate, ScheduleData, SchedulePass, WeekFocus } from './types'

// Schedule state shared by Planning, Dashboard, Live and the athlete view.
// Source: Supabase (schedule_sessions, club_staff, club_events). Pass content
// that is not yet a `training` (draft content, reviews, week focus, saved
// weeks) still lives in this browser until the new pass builder lands.

const LOCAL_KEY = 'divebuddy-schedule-local-v2'

interface LocalLayer {
  content: Record<string, { content: PassContent | null; contentStatus: ContentStatus }>
  review: Record<string, PassReview | null>
  weekFocus: WeekFocus[]
  templates: PlanTemplate[]
  staffGroups: Record<string, string[]>
}

const EMPTY: ScheduleData = {
  term: { id: 'term', name: '', startsOn: '2026-08-01', endsOn: '2026-12-31' },
  groups: [], staff: [], passes: [], events: [], weekFocus: [], templates: [],
}

// ── Store (external to React) ──────────────────────────────────────────────

let current: ScheduleData = EMPTY
let status: { loading: boolean; error: string | null; clubId: string | null } = { loading: true, error: null, clubId: null }
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(l => l())

function readLocal(): LocalLayer {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) return { content: {}, review: {}, weekFocus: [], templates: [], staffGroups: {}, ...JSON.parse(raw) }
  } catch {}
  return { content: {}, review: {}, weekFocus: [], templates: [], staffGroups: {} }
}

function saveLocal(d: ScheduleData) {
  const layer: LocalLayer = { content: {}, review: {}, weekFocus: d.weekFocus, templates: d.templates, staffGroups: {} }
  for (const p of d.passes) {
    if (p.content || (p.contentStatus !== 'none' && !p.trainingId)) layer.content[p.id] = { content: p.content ?? null, contentStatus: p.contentStatus }
    if (p.review) layer.review[p.id] = p.review
  }
  for (const s of d.staff) layer.staffGroups[s.id] = s.groupIds
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(layer)) } catch {}
}

function mergeLocal(d: ScheduleData): ScheduleData {
  const l = readLocal()
  return {
    ...d,
    weekFocus: l.weekFocus,
    templates: l.templates,
    staff: d.staff.map(s => ({ ...s, groupIds: l.staffGroups[s.id] ?? s.groupIds })),
    passes: d.passes.map(p => {
      const c = l.content[p.id]
      const review = l.review[p.id] ?? null
      if (p.trainingId) return { ...p, review }
      return c ? { ...p, content: c.content, contentStatus: c.contentStatus, review } : { ...p, review }
    }),
  }
}

const getSnapshot = () => current
const getStatus = () => status
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

function write(next: ScheduleData) {
  current = next
  saveLocal(next)
  notify()
}

const update = (fn: (d: ScheduleData) => ScheduleData) => write(fn(current))

const patchPass = (id: string, patch: Partial<SchedulePass>) =>
  update(d => ({ ...d, passes: d.passes.map(p => (p.id === id ? { ...p, ...patch } : p)) }))

async function reload(clubId: string) {
  status = { ...status, loading: true, clubId }
  notify()
  try {
    const d = await loadSchedule(createClient(), clubId)
    current = mergeLocal(d)
    status = { loading: false, error: null, clubId }
  } catch (e) {
    status = { loading: false, error: e instanceof Error ? e.message : 'Kunde inte läsa schemat', clubId }
  }
  notify()
}

// Run a database write; on failure show the error and reload the truth
function persist(run: () => Promise<void>) {
  run().catch(e => {
    console.error('Schedule write failed:', e)
    status = { ...status, error: e instanceof Error ? e.message : 'Kunde inte spara' }
    notify()
    if (status.clubId) reload(status.clubId)
  })
}

// ── Actions ────────────────────────────────────────────────────────────────

export type NewPass = Pick<SchedulePass, 'date' | 'start' | 'end' | 'place' | 'groupIds' | 'staffIds'>
export type EventInput = Omit<ClubEvent, 'id'>

function copyWeekTo(fromMonday: string, toMonday: string, groupIds: string[] | null): number {
  const { passes, copied } = copyBetweenWeeks(current, fromMonday, toMonday, groupIds)
  update(d => ({ ...d, passes }))
  return copied
}

const db = () => createClient()

const actions = {
  // Planning content (local until the new pass builder)
  setContentStatus: (id: string, contentStatus: ContentStatus) => patchPass(id, { contentStatus }),
  saveContent: (id: string, content: PassContent, contentStatus: ContentStatus) =>
    patchPass(id, { content, contentStatus: hasContent(content) ? contentStatus : 'none' }),
  clearContent: (id: string) => patchPass(id, { content: null, contentStatus: 'none' }),

  copyPreviousWeek: (monday: string, groupIds: string[] | null): number => {
    const d = current
    const sunday = addDays(monday, 6)
    let copied = 0
    const passes = d.passes.map(p => {
      if (p.removed || p.cancelledReason !== null || p.date < monday || p.date > sunday) return p
      if (groupIds && !p.groupIds.some(g => groupIds.includes(g))) return p
      if (p.trainingId || hasContent(p.content)) return p
      const prev = findPreviousPlanned(d, p)
      if (!prev?.content) return p
      copied++
      return { ...p, content: cloneContent(prev.content, `Kopierat från ${shortDate(prev.date)}`), contentStatus: 'draft' as const }
    })
    write({ ...d, passes })
    return copied
  },

  // Schedule (written to Supabase)
  updatePass: (id: string, patch: Partial<NewPass>) => {
    const before = current.passes.find(p => p.id === id)
    patchPass(id, patch)
    if (before) persist(() => writes.updateSession(db(), id, patch, before))
  },
  cancelPass: (id: string, reason: string) => {
    patchPass(id, { cancelledReason: reason })
    persist(() => writes.setCancelled(db(), [id], reason))
  },
  uncancelPass: (id: string) => {
    patchPass(id, { cancelledReason: null })
    persist(() => writes.setCancelled(db(), [id], null))
  },
  removePass: (id: string) => {
    update(d => ({ ...d, passes: d.passes.filter(p => p.id !== id) }))
    persist(() => writes.deleteSession(db(), id))
  },
  // Removed passes are deleted in the database and cannot be restored
  restorePass: (_id: string) => {},
  addExtraPass: (p: NewPass): string => {
    const id = newId()
    update(d => ({
      ...d,
      passes: [...d.passes, { ...p, id, trainingId: null, contentStatus: 'none', content: null, completed: false, cancelledReason: null, isExtra: true, removed: false }],
    }))
    if (status.clubId) persist(() => writes.insertSession(db(), status.clubId!, id, p))
    return id
  },

  // Viktiga datum
  addEvent: (e: EventInput) => {
    const id = newId()
    update(d => ({ ...d, events: [...d.events, { ...e, id }] }))
    if (status.clubId) persist(() => writes.upsertEvent(db(), status.clubId!, id, e))
  },
  updateEvent: (id: string, e: EventInput) => {
    update(d => ({ ...d, events: d.events.map(x => (x.id === id ? { ...e, id } : x)) }))
    if (status.clubId) persist(() => writes.upsertEvent(db(), status.clubId!, id, e))
  },
  deleteEvent: (id: string) => {
    update(d => ({ ...d, events: d.events.filter(x => x.id !== id) }))
    persist(() => writes.deleteEvent(db(), id))
  },

  // Cancel the passes an event affects (e.g. a competition weekend); returns how many
  cancelPassesFor: (e: EventInput): number => {
    const hit = current.passes.filter(p => !p.removed && p.cancelledReason === null && p.date >= e.startsOn && p.date <= e.endsOn &&
      (e.groupIds.length === 0 || p.groupIds.some(g => e.groupIds.includes(g))))
    const ids = new Set(hit.map(p => p.id))
    update(d => ({ ...d, passes: d.passes.map(p => (ids.has(p.id) ? { ...p, cancelledReason: e.title } : p)) }))
    if (hit.length) persist(() => writes.setCancelled(db(), Array.from(ids), e.title))
    return hit.length
  },

  // Week planning (local)
  setWeekFocus: (groupId: string, monday: string, text: string) => update(d => ({
    ...d,
    weekFocus: [
      ...d.weekFocus.filter(f => !(f.groupId === groupId && f.monday === monday)),
      ...(text.trim() ? [{ groupId, monday, text: text.trim() }] : []),
    ],
  })),
  copyWeekTo,
  repeatWeek: (monday: string, weeksAhead: number, groupIds: string[] | null): number =>
    copyWeekTo(monday, addDays(monday, weeksAhead * 7), groupIds),
  saveWeekAsTemplate: (monday: string, groupId: string, name: string): number => {
    const tpl = weekToTemplate(current, monday, groupId, name)
    if (tpl.entries.length) update(d => ({ ...d, templates: [tpl, ...d.templates] }))
    return tpl.entries.length
  },
  applyTemplate: (template: PlanTemplate, groupId: string, startMonday: string): number => {
    const { passes, applied } = applyTemplate(current, template, groupId, startMonday)
    update(d => ({ ...d, passes }))
    return applied
  },
  deleteTemplate: (id: string) => update(d => ({ ...d, templates: d.templates.filter(t => t.id !== id) })),
  saveReview: (id: string, review: PassReview | null) => patchPass(id, { review }),

  // Ledare (admin): which groups a coach counts as "mine" (local)
  setStaffGroups: (staffId: string, groupIds: string[]) =>
    update(d => ({ ...d, staff: d.staff.map(s => (s.id === staffId ? { ...s, groupIds } : s)) })),

  reload: () => { if (status.clubId) reload(status.clubId) },
}

export type ScheduleActions = typeof actions

// ── React API ──────────────────────────────────────────────────────────────

interface ScheduleContextValue extends ScheduleActions {
  data: ScheduleData
  loading: boolean
  error: string | null
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null)
const SERVER_STATUS = { loading: true, error: null, clubId: null }

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useUser()
  const clubId = profile?.club_id ?? null
  const data = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
  const st = useSyncExternalStore(subscribe, getStatus, () => SERVER_STATUS)

  useEffect(() => {
    if (clubId && clubId !== status.clubId) reload(clubId)
  }, [clubId])

  const value = useMemo(() => ({ data, loading: st.loading, error: st.error, ...actions }), [data, st])
  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext)
  if (!ctx) throw new Error('useSchedule must be used inside ScheduleProvider')
  return ctx
}
