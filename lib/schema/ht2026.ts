import { SCHEDULE_DSL } from './ht2026-data'

// Parses the HT2026 schedule from the Claude Design handoff into plain
// sessions. Only used to seed the demo data in lib/schedule/demoSeed.ts.

export interface Session {
  id: string
  date: string
  groups: string[]
  start: string
  end: string
  place: string
  coaches: string[]
}

const ALL_TRAINING_GROUPS = ['N1N', 'N1F', 'N2', 'FG', 'TG']

function parseSchedule(dsl: string): { sessions: Session[] } {
  const sessions: Session[] = []
  let date: string | null = null
  let dayIndex = 0

  for (const raw of dsl.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (/^\d{4}-\d{2}-\d{2}\s/.test(line)) {
      date = line.split(/\s+/)[0]
      dayIndex = 0
      continue
    }
    if (!date) continue

    // Training lines only; markers (x) and club events (e) live in demoSeed's EVENTS
    const p = line.split('|')
    if (p[0] === 't') {
      sessions.push({
        id: `${date}#${dayIndex++}`, date,
        groups: p[1] === 'ALLA' ? ALL_TRAINING_GROUPS : p[1].split('+'),
        start: p[2] || '', end: p[3] || '', place: p[4] || '',
        coaches: (p[5] || '').split(',').map(s => s.trim()).filter(Boolean),
      })
    } else if (p[0] === 'e' && p[3] === 'all') {
      dayIndex++ // events took an index before; keep pass ids already saved in browsers stable
    }
  }
  return { sessions }
}

export const BASE_SCHEDULE = parseSchedule(SCHEDULE_DSL)
