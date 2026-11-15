import { addDays, daysBetween, shortDate, weekdayIndex } from './format'
import type { BlockCategory, PassContent, PlanTemplate, ScheduleData, SchedulePass } from './types'

export const BLOCK_CATEGORIES: { id: BlockCategory; label: string; color: string }[] = [
  { id: 'uppvarmning', label: 'Uppvärmning', color: '#C2410C' },
  { id: 'vatten', label: 'Vatten', color: '#2B5C9E' },
  { id: 'land', label: 'Land', color: '#B45309' },
  { id: 'styrka', label: 'Styrka', color: '#B91C1C' },
  { id: 'rorlighet', label: 'Rörlighet', color: '#15803D' },
  { id: 'tavling', label: 'Tävling', color: '#4F46E5' },
]

export const CATEGORY_BY_ID = Object.fromEntries(BLOCK_CATEGORIES.map(c => [c.id, c])) as Record<BlockCategory, (typeof BLOCK_CATEGORIES)[number]>

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`

export const emptyContent = (source = 'Eget'): PassContent => ({ blocks: [], notes: '', source })

export function hasContent(c?: PassContent | null) {
  return !!c && (c.blocks.length > 0 || c.notes.trim().length > 0)
}

// Fresh ids so a copy can be edited without touching the original
export function cloneContent(c: PassContent, source: string): PassContent {
  return {
    notes: c.notes,
    source,
    blocks: c.blocks.map(b => ({ ...b, id: newId(), items: b.items.map(i => ({ ...i, id: newId() })) })),
  }
}

export function contentSummary(c?: PassContent | null) {
  if (!c) return ''
  const items = c.blocks.reduce((n, b) => n + b.items.length, 0)
  const parts = [`${c.blocks.length} block`, `${items} övningar`]
  return parts.join(' · ')
}

const sameGroups = (a: string[], b: string[]) => a.length === b.length && a.every(g => b.includes(g))

// The most recent earlier pass that looks like the same slot and has content:
// same groups, weekday, start time and place — searched up to 8 weeks back.
export function findPreviousPlanned(d: ScheduleData, pass: SchedulePass): SchedulePass | null {
  const candidates = d.passes.filter(p =>
    !p.removed && p.id !== pass.id && p.date < pass.date && hasContent(p.content) &&
    sameGroups(p.groupIds, pass.groupIds) && weekdayIndex(p.date) === weekdayIndex(pass.date))

  for (let w = 1; w <= 8; w++) {
    const date = addDays(pass.date, -7 * w)
    const exact = candidates.find(p => p.date === date && p.start === pass.start && p.place === pass.place)
    if (exact) return exact
  }
  return candidates
    .filter(p => p.place === pass.place)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null
}

// ── Moving planned content between weeks ───────────────────────────────────

const plannable = (p: SchedulePass) => !p.removed && p.cancelledReason === null

// Copy every planned pass in one week onto the matching passes of another
// week (same groups, weekday, start and place) that have no content yet.
export function copyBetweenWeeks(d: ScheduleData, fromMonday: string, toMonday: string, groupIds: string[] | null) {
  const offset = daysBetween(fromMonday, toMonday)
  const fromSunday = addDays(fromMonday, 6)
  const sources = d.passes.filter(p =>
    plannable(p) && hasContent(p.content) && p.date >= fromMonday && p.date <= fromSunday &&
    (!groupIds || p.groupIds.some(g => groupIds.includes(g))))

  let copied = 0
  const used = new Set<string>()
  const passes = d.passes.map(t => {
    if (!plannable(t) || hasContent(t.content) || used.has(t.id)) return t
    const src = sources.find(s =>
      addDays(s.date, offset) === t.date && sameGroups(s.groupIds, t.groupIds) &&
      s.start === t.start && s.place === t.place)
    if (!src?.content) return t
    used.add(t.id)
    copied++
    return { ...t, content: cloneContent(src.content, `Kopierat från ${shortDate(src.date)}`), contentStatus: 'draft' as const }
  })
  return { passes, copied }
}

// Save one group's planned week as a reusable 1-week template
export function weekToTemplate(d: ScheduleData, monday: string, groupId: string, name: string): PlanTemplate {
  const sunday = addDays(monday, 6)
  const entries = d.passes
    .filter(p => plannable(p) && hasContent(p.content) && p.groupIds.includes(groupId) && p.date >= monday && p.date <= sunday)
    .sort((a, b) => (a.date === b.date ? (a.start < b.start ? -1 : 1) : a.date < b.date ? -1 : 1))
    .map(p => ({ weekNumber: 1, dayOfWeek: weekdayIndex(p.date), start: p.start, place: p.place, content: cloneContent(p.content!, name) }))
  return { id: `tpl-${newId()}`, name, weeks: 1, source: 'local', entries }
}

// Lay a template onto a group's real passes, starting at a given week.
// Entries are matched by weekday, then start time + place, otherwise by order that day.
export function applyTemplate(d: ScheduleData, template: PlanTemplate, groupId: string, startMonday: string) {
  let applied = 0
  const filled = new Set<string>()
  const byId = new Map(d.passes.map(p => [p.id, p]))

  for (let w = 1; w <= template.weeks; w++) {
    const monday = addDays(startMonday, (w - 1) * 7)
    for (let day = 0; day < 7; day++) {
      const date = addDays(monday, day)
      const entries = template.entries.filter(e => e.weekNumber === w && e.dayOfWeek === day)
      if (!entries.length) continue
      const targets = d.passes
        .filter(p => p.date === date && p.groupIds.includes(groupId) && plannable(p) && !hasContent(p.content))
        .sort((a, b) => ((a.start || '99') < (b.start || '99') ? -1 : 1))
      const free = [...targets]
      for (const e of entries) {
        const exact = free.findIndex(t => t.start === e.start && t.place === e.place)
        const idx = exact >= 0 ? exact : (e.start || e.place ? -1 : 0)
        const target = idx >= 0 ? free.splice(idx, 1)[0] : free.shift()
        if (!target) continue
        filled.add(target.id)
        byId.set(target.id, { ...target, content: cloneContent(e.content, `${template.name} · v.${w}`), contentStatus: 'draft' })
        applied++
      }
    }
  }
  return { passes: d.passes.map(p => (filled.has(p.id) ? byId.get(p.id)! : p)), applied }
}
