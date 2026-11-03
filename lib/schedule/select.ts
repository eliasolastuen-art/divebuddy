import { addDays, DAY_LONG, minutes, passStatus, todayISO, weekdayIndex } from './format'
import type { ClubEvent, PassStatus, ScheduleData, SchedulePass } from './types'

export const activePasses = (d: ScheduleData) => d.passes.filter(p => !p.removed)

export function passesBetween(d: ScheduleData, from: string, to: string) {
  return activePasses(d)
    .filter(p => p.date >= from && p.date <= to)
    .sort(comparePasses)
}

export function comparePasses(a: SchedulePass, b: SchedulePass) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  return (a.start || '99') < (b.start || '99') ? -1 : 1
}

export function groupMap(d: ScheduleData) {
  return Object.fromEntries(d.groups.map(g => [g.id, g]))
}

export function staffMap(d: ScheduleData) {
  return Object.fromEntries(d.staff.map(s => [s.id, s]))
}

export function groupLabel(d: ScheduleData, p: SchedulePass) {
  const gm = groupMap(d)
  const trainingGroups = d.groups.filter(g => g.name !== 'Vuxen').length
  if (p.groupIds.length >= trainingGroups && trainingGroups > 1) return 'Alla'
  return p.groupIds.map(id => gm[id]?.name ?? '?').join(' + ')
}

export function staffNames(d: ScheduleData, ids: string[]) {
  const sm = staffMap(d)
  return ids.map(id => sm[id]?.name ?? '?').join(', ')
}

// How much of a week still needs planning (only passes that can still be planned)
export function planningSummary(d: ScheduleData, monday: string, today = todayISO(), groupIds?: string[]) {
  const counts: Record<PassStatus, number> = { unplanned: 0, draft: 0, planned: 0, completed: 0, cancelled: 0, past: 0 }
  for (const p of passesBetween(d, monday, addDays(monday, 6))) {
    if (groupIds && !p.groupIds.some(g => groupIds.includes(g))) continue
    counts[passStatus(p, today)]++
  }
  const open = counts.unplanned + counts.draft
  const plannable = counts.unplanned + counts.draft + counts.planned
  return { counts, open, plannable }
}

// "Tisdag 16:30–17:45" per group, derived from the passes themselves
export function groupRhythm(d: ScheduleData, groupId: string) {
  const byDay = new Map<number, Map<string, number>>()
  const spans = new Map<string, { start: string; end: string }>()

  for (const p of activePasses(d)) {
    if (!p.groupIds.includes(groupId) || !p.start || !p.end || p.isExtra) continue
    const cur = spans.get(p.date)
    spans.set(p.date, cur
      ? { start: p.start < cur.start ? p.start : cur.start, end: p.end > cur.end ? p.end : cur.end }
      : { start: p.start, end: p.end })
  }
  spans.forEach((span, date) => {
    const wd = weekdayIndex(date)
    const key = `${span.start}–${span.end}`
    const m = byDay.get(wd) ?? new Map<string, number>()
    m.set(key, (m.get(key) ?? 0) + 1)
    byDay.set(wd, m)
  })

  return Array.from(byDay.entries())
    .map(([wd, m]) => {
      const [time, count] = Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0]
      return { weekday: wd, day: DAY_LONG[wd], time, count }
    })
    .filter(r => r.count >= 3) // ignore one-off sessions
    .sort((a, b) => a.weekday - b.weekday)
}

export function groupTimesText(d: ScheduleData, groupId: string) {
  return groupRhythm(d, groupId).map(r => `${r.day} ${r.time}`).join(' · ')
}

export function passCountByGroup(d: ScheduleData) {
  const counts: Record<string, number> = Object.fromEntries(d.groups.map(g => [g.id, 0]))
  for (const p of activePasses(d)) {
    if (p.cancelledReason !== null) continue
    for (const g of p.groupIds) if (g in counts) counts[g]++
  }
  return counts
}

export function passCountByStaff(d: ScheduleData) {
  const counts: Record<string, number> = Object.fromEntries(d.staff.map(s => [s.id, 0]))
  for (const p of activePasses(d)) {
    if (p.cancelledReason !== null) continue
    for (const s of p.staffIds) if (s in counts) counts[s]++
  }
  return counts
}

// Time on deck for one person: overlapping passes on the same day
// (e.g. Land and Vatten 17–19 at once) are only counted once.
export function staffMinutes(passes: SchedulePass[]) {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const byDate = new Map<string, [number, number][]>()
  for (const p of passes) {
    if (!minutes(p)) continue
    const list = byDate.get(p.date) ?? []
    list.push([toMin(p.start), toMin(p.end)])
    byDate.set(p.date, list)
  }
  let total = 0
  byDate.forEach(list => {
    list.sort((a, b) => a[0] - b[0])
    let [s, e] = list[0]
    for (const [ns, ne] of list.slice(1)) {
      if (ns <= e) e = Math.max(e, ne)
      else { total += e - s; [s, e] = [ns, ne] }
    }
    total += e - s
  })
  return total
}

export function upcomingEvents(d: ScheduleData, from = todayISO()) {
  return [...d.events].filter(e => e.endsOn >= from).sort((a, b) => (a.startsOn < b.startsOn ? -1 : 1))
}

// The next competition, optionally only one that involves any of the given groups
export function nextCompetition(d: ScheduleData, from = todayISO(), groupIds?: string[]): ClubEvent | null {
  return upcomingEvents(d, from).find(e =>
    e.type === 'comp' && e.startsOn >= from &&
    (!groupIds || e.groupIds.length === 0 || e.groupIds.some(g => groupIds.includes(g)))) ?? null
}

// Passes left before an event for the groups taking part
export function passesUntil(d: ScheduleData, event: ClubEvent, from = todayISO()) {
  return activePasses(d).filter(p =>
    p.date >= from && p.date < event.startsOn && p.cancelledReason === null &&
    (event.groupIds.length === 0 || p.groupIds.some(g => event.groupIds.includes(g))))
}
