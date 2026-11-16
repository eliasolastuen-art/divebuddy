import { isTimeMode } from '@/lib/library/trainingSave'

// Counts for a pass: "2 block · 6 övningar · 11 hopp · 15 min".
// A row counts as time when duration_seconds is set and reps is empty.

export interface CountItem { reps?: number | null; duration_seconds?: number | null }

const timeMode = (it: CountItem) => isTimeMode({ reps: it.reps ?? undefined, duration_seconds: it.duration_seconds ?? undefined })

export function divesAndMinutes<T extends CountItem>(items: T[], isDive: (it: T) => boolean) {
  const hopp = items.filter(it => !timeMode(it) && isDive(it)).reduce((s, it) => s + (it.reps ?? 0), 0)
  const min = Math.round(items.filter(timeMode).reduce((s, it) => s + (it.duration_seconds ?? 0), 0) / 60)
  return { hopp, min }
}

export function passSummary<T extends CountItem>(blocks: { items: T[] }[], isDive: (it: T) => boolean) {
  const items = blocks.flatMap(b => b.items)
  const { hopp, min } = divesAndMinutes(items, isDive)
  return [
    `${blocks.length} block`,
    `${items.length} ${items.length === 1 ? 'övning' : 'övningar'}`,
    hopp ? `${hopp} hopp` : '',
    min ? `${min} min` : '',
  ].filter(Boolean).join(' · ')
}
