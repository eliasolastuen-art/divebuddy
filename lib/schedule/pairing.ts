import { DAY_LONG, MONTHS_FULL, parseISO, weekdayIndex } from './format'
import { groupLabel, staffNames } from './select'
import type { ScheduleData, SchedulePass, TrainingSummary } from './types'

// Land + vatten for the same groups on the same day, back to back or
// overlapping, are shown as one pass with two parts. Nothing is stored:
// the parts stay separate rows in schedule_sessions.

export interface PassPair {
  id: string // first part's id
  date: string
  start: string
  end: string
  groupIds: string[]
  parts: SchedulePass[]
  staffIds: string[] // everyone on any part
  training: TrainingSummary | null
  trainingId: string | null
  cancelled: boolean
}

export type PairStatus = 'planned' | 'running' | 'done' | 'cancelled'

const key = (p: SchedulePass) => [...p.groupIds].sort().join(',')

function makePair(parts: SchedulePass[]): PassPair {
  const sorted = [...parts].sort((a, b) => (a.start || '99').localeCompare(b.start || '99'))
  const starts = sorted.map(p => p.start).filter(Boolean)
  const ends = sorted.map(p => p.end).filter(Boolean).sort()
  const withTraining = sorted.find(p => p.trainingId)
  return {
    id: sorted[0].id,
    date: sorted[0].date,
    start: starts[0] ?? '',
    end: ends[ends.length - 1] ?? '',
    groupIds: sorted[0].groupIds,
    parts: sorted,
    staffIds: Array.from(new Set(sorted.flatMap(p => p.staffIds))),
    training: withTraining?.training ?? null,
    trainingId: withTraining?.trainingId ?? null,
    cancelled: sorted.every(p => p.cancelledReason !== null),
  }
}

export function pairPasses(passes: SchedulePass[]): PassPair[] {
  const sorted = passes.filter(p => !p.removed).sort((a, b) =>
    a.date.localeCompare(b.date) || key(a).localeCompare(key(b)) || (a.start || '99').localeCompare(b.start || '99'))

  const out: PassPair[] = []
  let run: SchedulePass[] = []
  const flush = () => { if (run.length) out.push(makePair(run)); run = [] }

  for (const p of sorted) {
    const last = run[run.length - 1]
    const joins = last && last.date === p.date && key(last) === key(p) &&
      !!last.end && !!p.start && p.start <= last.end
    if (!joins) flush()
    run.push(p)
  }
  flush()
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.start || '99').localeCompare(b.start || '99'))
}

export function pairStatus(p: PassPair): PairStatus {
  if (p.parts.some(x => x.live?.status === 'active')) return 'running'
  if (p.parts.some(x => x.live?.status === 'ended')) return 'done'
  if (p.cancelled) return 'cancelled'
  return 'planned'
}

export const PAIR_STATUS_LABEL: Record<PairStatus, string> = {
  planned: 'Planerat', running: 'Pågår', done: 'Klart', cancelled: 'Inställt',
}

export const pairTime = (p: Pick<PassPair, 'start' | 'end'>) =>
  p.start && p.end ? `${p.start}–${p.end}` : p.start || 'Tid ej satt'

export const pairGroups = (d: ScheduleData, p: PassPair) => groupLabel(d, p.parts[0])

// "Land 17:00, vatten 17:45 · med Maria" (others than me)
export function pairSummary(d: ScheduleData, p: PassPair, meId: string | null) {
  const parts = p.parts.map((x, i) => {
    const place = i === 0 ? x.place : x.place.toLowerCase()
    return x.start ? `${place} ${x.start}` : place
  }).join(', ')
  const others = p.staffIds.filter(id => id !== meId)
  return others.length ? `${parts} · med ${staffNames(d, others)}` : parts
}

export const longDate = (date: string) => {
  const d = parseISO(date)
  return `${DAY_LONG[weekdayIndex(date)]} ${d.getDate()} ${MONTHS_FULL[d.getMonth()].toLowerCase()}`
}

export const hasMe = (p: PassPair, meId: string | null | undefined) => !!meId && p.staffIds.includes(meId)
