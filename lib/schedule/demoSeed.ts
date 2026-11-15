// In-memory demo data for HT2026, built from the Claude Design handoff
// (lib/schema/ht2026-data.ts). Used locally until the Supabase tables exist.
// Nothing here is written to the database.

import { BASE_SCHEDULE } from '@/lib/schema/ht2026'
import type { ClubEvent, ScheduleData, ScheduleGroup, SchedulePass, Staff } from './types'

const GROUPS: (ScheduleGroup & { key: string })[] = [
  { id: 'g-n1n', key: 'N1N', name: 'N1 Nybörjare', color: '#059669' },
  { id: 'g-n1f', key: 'N1F', name: 'N1 Fortsättning', color: '#B45309' },
  { id: 'g-n2', key: 'N2', name: 'N2', color: '#2563EB' },
  { id: 'g-fg', key: 'FG', name: 'FG', color: '#7C3AED' },
  { id: 'g-tg', key: 'TG', name: 'TG', color: '#C2410C' },
  { id: 'g-vux', key: 'VUX', name: 'Vuxen', color: '#56637A' },
]

const STAFF: Staff[] = [
  { id: 's-maria', name: 'Maria', color: '#DB2777', profileId: null, groupIds: [] },
  { id: 's-anna', name: 'Anna', color: '#B45309', profileId: null, groupIds: [] },
  { id: 's-elias', name: 'Elias', color: '#2563EB', profileId: null, groupIds: [] },
  { id: 's-ville', name: 'Ville', color: '#7C3AED', profileId: null, groupIds: [] },
  { id: 's-leo', name: 'Leo', color: '#059669', profileId: null, groupIds: [] },
  { id: 's-vega', name: 'Vega', color: '#2B5C9E', profileId: null, groupIds: [] },
  { id: 's-anton', name: 'Anton', color: '#C2410C', profileId: null, groupIds: [] },
]

const groupId = (key: string) => GROUPS.find(g => g.key === key)?.id
const staffId = (name: string) => STAFF.find(s => s.name === name)?.id
const ids = (keys: string[]) => keys.map(groupId).filter((x): x is string => !!x)

const TRAINING = ['N1N', 'N1F', 'N2', 'FG', 'TG']
const ALL = [...TRAINING, 'VUX']

// Viktiga datum från designen, med riktiga datum och berörda grupper
const EVENTS: ClubEvent[] = [
  { id: 'e-1', startsOn: '2026-08-08', endsOn: '2026-08-09', title: 'Uppstartsläger', type: 'camp', note: 'Alla grupper · 10–16', groupIds: ids(TRAINING), staffIds: [] },
  { id: 'e-2', startsOn: '2026-08-15', endsOn: '2026-08-16', title: 'Basutbildning tränare', type: 'edu', note: '', groupIds: [], staffIds: [] },
  { id: 'e-3', startsOn: '2026-08-20', endsOn: '2026-08-22', title: 'Prova på simhopp', type: 'tryout', note: '20 & 22 aug · Rekrytering', groupIds: [], staffIds: [] },
  { id: 'e-4', startsOn: '2026-09-05', endsOn: '2026-09-06', title: 'Simtävling VÖSS', type: 'cancelled', note: 'Ingen träning', groupIds: ids(['N1N', 'N2', 'FG', 'TG']), staffIds: [] },
  { id: 'e-5', startsOn: '2026-09-25', endsOn: '2026-09-27', title: 'Speedo Dive', type: 'comp', note: 'Tävling · JKPG', groupIds: [], staffIds: [] },
  { id: 'e-6', startsOn: '2026-10-17', endsOn: '2026-10-18', title: 'Simtävling VÖSS', type: 'cancelled', note: 'Ingen träning', groupIds: ids(TRAINING), staffIds: [] },
  { id: 'e-7', startsOn: '2026-10-27', endsOn: '2026-10-27', title: 'Träning Alla', type: 'event', note: 'Gemensamt pass', groupIds: ids(TRAINING), staffIds: [] },
  { id: 'e-8', startsOn: '2026-10-29', endsOn: '2026-11-01', title: 'Diving Lund', type: 'comp', note: 'Tävling', groupIds: ids(['FG', 'TG']), staffIds: [] },
  { id: 'e-9', startsOn: '2026-11-07', endsOn: '2026-11-07', title: 'Triangel Tävling VÖSS', type: 'comp', note: 'N1, N1F, N2, FG · 09–17', groupIds: ids(['N1N', 'N1F', 'N2', 'FG']), staffIds: [] },
  { id: 'e-10', startsOn: '2026-11-14', endsOn: '2026-11-15', title: 'Simtävling VÖSS', type: 'cancelled', note: 'Ingen träning', groupIds: ids(TRAINING), staffIds: [] },
  { id: 'e-11', startsOn: '2026-12-04', endsOn: '2026-12-06', title: 'Julklappshoppet', type: 'comp', note: 'Tävling · JKPG', groupIds: ids(['FG', 'TG']), staffIds: [] },
  { id: 'e-12', startsOn: '2026-12-19', endsOn: '2026-12-19', title: 'Lucia & avslutning HT', type: 'event', note: 'Vatten · Alla', groupIds: ids(ALL), staffIds: [] },
]

export function buildDemoSchedule(): ScheduleData {
  const passes: SchedulePass[] = BASE_SCHEDULE.sessions
    .map(s => ({
      id: `p-${s.id}`,
      date: s.date,
      start: s.start,
      end: s.end,
      place: s.place,
      groupIds: ids(s.groups),
      staffIds: s.coaches.map(staffId).filter((x): x is string => !!x),
      contentStatus: 'none',
      completed: false,
      cancelledReason: null,
      isExtra: false,
      removed: false,
    }))

  return {
    term: { id: 't-ht2026', name: 'HT2026', startsOn: '2026-08-08', endsOn: '2026-12-20' },
    groups: GROUPS.map(g => ({ id: g.id, name: g.name, color: g.color })),
    staff: STAFF.map(s => ({ ...s, groupIds: groupsCoachedBy(s.id, passes) })),
    passes,
    events: EVENTS,
    weekFocus: [],
    templates: [],
  }
}

// Prefill "mina grupper": the groups a person is scheduled with
export function groupsCoachedBy(staffId: string, passes: SchedulePass[]) {
  const set = new Set<string>()
  passes.forEach(p => { if (p.staffIds.includes(staffId)) p.groupIds.forEach(g => set.add(g)) })
  return GROUPS.map(g => g.id).filter(id => set.has(id))
}
