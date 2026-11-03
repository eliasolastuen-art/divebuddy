'use client'

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import { buildDemoSchedule, groupsCoachedBy } from './demoSeed'
import { addDays, shortDate } from './format'
import { applyTemplate, cloneContent, copyBetweenWeeks, findPreviousPlanned, hasContent, newId, weekToTemplate } from './content'
import type { ClubEvent, ContentStatus, PassContent, PassReview, PlanTemplate, ScheduleData, SchedulePass } from './types'

// Schedule state shared by Planning, Dashboard and (later) Live and the athlete view.
// Source today: in-memory demo data, kept in this browser between reloads.
// Etapp 3 replaces this store's loader and actions with Supabase calls.

const STORAGE_KEY = 'divebuddy-schedule-demo-v1'

// ── Browser-backed store (external to React) ───────────────────────────────

const SERVER_SNAPSHOT = buildDemoSchedule()
let current: ScheduleData | null = null
const listeners = new Set<() => void>()

// Older saved demo data lacks fields added later; fill them in
function migrate(d: ScheduleData): ScheduleData {
  return {
    ...d,
    staff: d.staff.map(s => ({ ...s, groupIds: s.groupIds ?? groupsCoachedBy(s.id, d.passes) })),
    weekFocus: d.weekFocus ?? [],
    templates: d.templates ?? [],
  }
}

function getSnapshot(): ScheduleData {
  if (!current) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      current = raw ? migrate(JSON.parse(raw) as ScheduleData) : buildDemoSchedule()
    } catch {
      current = buildDemoSchedule()
    }
  }
  return current
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function write(next: ScheduleData, persist = true) {
  current = next
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }
  listeners.forEach(l => l())
}

const update = (fn: (d: ScheduleData) => ScheduleData) => write(fn(getSnapshot()))

const patchPass = (id: string, patch: Partial<SchedulePass>) =>
  update(d => ({ ...d, passes: d.passes.map(p => (p.id === id ? { ...p, ...patch } : p)) }))

// ── Actions ────────────────────────────────────────────────────────────────

function copyWeekTo(fromMonday: string, toMonday: string, groupIds: string[] | null): number {
  const { passes, copied } = copyBetweenWeeks(getSnapshot(), fromMonday, toMonday, groupIds)
  update(d => ({ ...d, passes }))
  return copied
}

export type NewPass =Pick<SchedulePass, 'date' | 'start' | 'end' | 'place' | 'groupIds' | 'staffIds'>
export type EventInput = Omit<ClubEvent, 'id'>

const actions = {
  // Planning content
  setContentStatus: (id: string, contentStatus: ContentStatus) => patchPass(id, { contentStatus }),
  saveContent: (id: string, content: PassContent, contentStatus: ContentStatus) =>
    patchPass(id, { content, contentStatus: hasContent(content) ? contentStatus : 'none' }),
  clearContent: (id: string) => patchPass(id, { content: null, contentStatus: 'none' }),

  // Copy last week's content into every pass this week that has none yet
  copyPreviousWeek: (monday: string, groupIds: string[] | null): number => {
    const d = getSnapshot()
    const sunday = addDays(monday, 6)
    let copied = 0
    const passes = d.passes.map(p => {
      if (p.removed || p.cancelledReason !== null || p.date < monday || p.date > sunday) return p
      if (groupIds && !p.groupIds.some(g => groupIds.includes(g))) return p
      if (hasContent(p.content)) return p
      const prev = findPreviousPlanned(d, p)
      if (!prev?.content) return p
      copied++
      return { ...p, content: cloneContent(prev.content, `Kopierat från ${shortDate(prev.date)}`), contentStatus: 'draft' as const }
    })
    write({ ...d, passes })
    return copied
  },

  // Schedule (admin)
  updatePass: (id: string, patch: Partial<NewPass>) => patchPass(id, patch),
  cancelPass: (id: string, reason: string) => patchPass(id, { cancelledReason: reason }),
  uncancelPass: (id: string) => patchPass(id, { cancelledReason: null }),
  removePass: (id: string) => patchPass(id, { removed: true }),
  restorePass: (id: string) => patchPass(id, { removed: false }),
  addExtraPass: (p: NewPass): string => {
    const id = `p-${newId()}`
    update(d => ({
      ...d,
      passes: [...d.passes, { ...p, id, contentStatus: 'none', content: null, completed: false, cancelledReason: null, isExtra: true, removed: false }],
    }))
    return id
  },

  // Viktiga datum
  addEvent: (e: EventInput) => update(d => ({ ...d, events: [...d.events, { ...e, id: `e-${newId()}` }] })),
  updateEvent: (id: string, e: EventInput) => update(d => ({ ...d, events: d.events.map(x => (x.id === id ? { ...e, id } : x)) })),
  deleteEvent: (id: string) => update(d => ({ ...d, events: d.events.filter(x => x.id !== id) })),

  // Cancel the passes an event affects (e.g. a competition weekend); returns how many
  cancelPassesFor: (e: EventInput): number => {
    const d = getSnapshot()
    let n = 0
    const passes = d.passes.map(p => {
      const hit = !p.removed && p.cancelledReason === null && p.date >= e.startsOn && p.date <= e.endsOn &&
        (e.groupIds.length === 0 || p.groupIds.some(g => e.groupIds.includes(g)))
      if (!hit) return p
      n++
      return { ...p, cancelledReason: e.title }
    })
    write({ ...d, passes })
    return n
  },

  // Week planning
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
    const tpl = weekToTemplate(getSnapshot(), monday, groupId, name)
    if (tpl.entries.length) update(d => ({ ...d, templates: [tpl, ...d.templates] }))
    return tpl.entries.length
  },
  applyTemplate: (template: PlanTemplate, groupId: string, startMonday: string): number => {
    const { passes, applied } = applyTemplate(getSnapshot(), template, groupId, startMonday)
    update(d => ({ ...d, passes }))
    return applied
  },
  deleteTemplate: (id: string) => update(d => ({ ...d, templates: d.templates.filter(t => t.id !== id) })),
  saveReview: (id: string, review: PassReview | null) => patchPass(id, { review }),

  // Ledare (admin)
  setStaffGroups: (staffId: string, groupIds: string[]) =>
    update(d => ({ ...d, staff: d.staff.map(s => (s.id === staffId ? { ...s, groupIds } : s)) })),

  resetDemo: () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    write(buildDemoSchedule(), false)
  },
}

export type ScheduleActions = typeof actions

// ── React API ──────────────────────────────────────────────────────────────

interface ScheduleContextValue extends ScheduleActions {
  data: ScheduleData
  source: 'demo'
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null)

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const data = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT)
  const value = useMemo(() => ({ data, source: 'demo' as const, ...actions }), [data])
  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext)
  if (!ctx) throw new Error('useSchedule must be used inside ScheduleProvider')
  return ctx
}
