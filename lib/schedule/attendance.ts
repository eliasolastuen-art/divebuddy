import { minutes, mondayOf, weekNumber, DAY_SHORT, dateNum, weekdayIndex } from './format'
import { pairGroups, pairPasses, type PassPair } from './pairing'
import type { ScheduleData, SchedulePass } from './types'

// Närvaro (design screen 5): a coach's own parts of each pass, merged per
// pass, with a check that sets schedule_session_coaches.attendance.

export interface AttendanceRow {
  id: string // pair id
  date: string
  day: string // "Tis 10"
  group: string // "TG + FG" or "TG · extrapass"
  time: string // my parts only: "17:45–19:00"
  start: string
  end: string
  minutes: number
  partIds: string[]
  present: boolean
}

function actualMinutes(p: SchedulePass) {
  return minutes(p)
}

export function myRows(d: ScheduleData, staffId: string, pairs: PassPair[] = pairPasses(d.passes)): AttendanceRow[] {
  return pairs
    .filter(p => !p.cancelled)
    .map(p => ({ p, mine: p.parts.filter(x => x.staffIds.includes(staffId) && x.cancelledReason === null) }))
    .filter(({ mine }) => mine.length > 0)
    .map(({ p, mine }) => {
      const starts = mine.map(x => x.start).filter(Boolean).sort()
      const ends = mine.map(x => x.end).filter(Boolean).sort()
      const start = starts[0] ?? ''
      const end = ends[ends.length - 1] ?? ''
      return {
        id: p.id,
        date: p.date,
        day: `${DAY_SHORT[weekdayIndex(p.date)]} ${dateNum(p.date)}`,
        group: `${pairGroups(d, p)}${p.parts.some(x => x.isExtra) ? ' · extrapass' : ''}`,
        time: start && end ? `${start}–${end}` : start || 'Tid ej satt',
        start, end,
        minutes: mine.reduce((s, x) => s + actualMinutes(x), 0),
        partIds: mine.map(x => x.id),
        present: mine.every(x => x.attendance?.[staffId] === 'narvarande'),
      }
    })
}

export function byWeek(rows: AttendanceRow[]) {
  const weeks = new Map<string, AttendanceRow[]>()
  for (const r of rows) {
    const m = mondayOf(r.date)
    weeks.set(m, [...(weeks.get(m) ?? []), r])
  }
  return Array.from(weeks.entries()).map(([monday, rs]) => ({ monday, label: `Vecka ${weekNumber(monday)}`, rows: rs }))
}

// Present passes per coach for the whole term (Hela laget)
export function teamReport(d: ScheduleData) {
  const pairs = pairPasses(d.passes)
  return d.staff
    .map(s => ({ staff: s, n: myRows(d, s.id, pairs).filter(r => r.present).length }))
    .sort((a, b) => b.n - a.n)
}

// One line per present pass, for Excel (semicolon-separated, Swedish Excel default)
export function attendanceCsv(d: ScheduleData) {
  const pairs = pairPasses(d.passes)
  const lines = [['Tränare', 'Datum', 'Grupp', 'Start', 'Slut', 'Minuter'].join(';')]
  for (const s of d.staff) {
    for (const r of myRows(d, s.id, pairs).filter(x => x.present)) {
      lines.push([s.name, r.date, r.group, r.start, r.end, String(r.minutes)].map(v => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(';'))
    }
  }
  return '﻿' + lines.join('\r\n') // BOM so Excel reads å/ä/ö
}
