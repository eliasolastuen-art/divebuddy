import { SCHEDULE_DSL } from './ht2026-data'

export type GroupKey = 'N1N' | 'N1F' | 'N2' | 'FG' | 'TG' | 'VUX'
export type EventType = 'camp' | 'edu' | 'tryout' | 'cancelled' | 'comp' | 'event'

export interface Group {
  key: GroupKey
  name: string
  color: string
  days: string[]
  times: string
}

export interface Coach {
  name: string
  color: string
}

export interface Session {
  id: string
  date: string
  day: string
  groups: string[]
  label: string
  start: string
  end: string
  place: string
  coaches: string[]
  isEvent: boolean
  edited?: boolean
}

export interface Marker {
  date: string
  day: string
  title: string
  note: string
}

export interface Override {
  start: string
  end: string
  place: string
  coaches: string[]
}

export const CLUB_NAME = 'VÖSS Simhopp'
export const TERM = 'Höstterminen 2026'
export const OVERRIDES_KEY = 'voss-simhopp-ht2026-overrides-v1'

export const GROUPS: Group[] = [
  { key: 'N1N', name: 'N1 Nybörjare', color: 'oklch(0.66 0.13 150)', days: ['lör'], times: 'Lördag 09:00–10:00' },
  { key: 'N1F', name: 'N1 Fortsättning', color: 'oklch(0.64 0.12 198)', days: ['tor'], times: 'Torsdag 16:30–17:45' },
  { key: 'N2', name: 'N2', color: 'oklch(0.58 0.13 248)', days: ['tis', 'lör'], times: 'Tisdag 16:30–17:45 · Lördag 09:30–10:45' },
  { key: 'FG', name: 'FG', color: 'oklch(0.56 0.13 292)', days: ['tis', 'tor', 'lör'], times: 'Tisdag 17:00–19:00 · Torsdag 17:00–19:00 · Lördag 10:00–11:30' },
  { key: 'TG', name: 'TG', color: 'oklch(0.60 0.14 26)', days: ['tis', 'tor', 'lör', 'sön'], times: 'Tisdag 17:00–19:00 · Torsdag 17:00–19:00 · Lördag 11:30–13:45' },
  { key: 'VUX', name: 'Vuxen', color: 'oklch(0.56 0.045 262)', days: ['sön'], times: 'Söndag 16:30–18:00' },
]

export const GROUP_MAP: Record<string, Group> = Object.fromEntries(GROUPS.map(g => [g.key, g]))

export const COACHES: Coach[] = [
  { name: 'Maria', color: 'oklch(0.60 0.13 26)' },
  { name: 'Anna', color: 'oklch(0.62 0.12 58)' },
  { name: 'Elias', color: 'oklch(0.56 0.12 250)' },
  { name: 'Ville', color: 'oklch(0.56 0.12 292)' },
  { name: 'Leo', color: 'oklch(0.58 0.12 158)' },
  { name: 'Vega', color: 'oklch(0.56 0.11 202)' },
  { name: 'Anton', color: 'oklch(0.56 0.10 330)' },
]

export const PLACES = ['Land', 'Vatten', 'Styrka Actic', 'Gymnastikens hus', 'Teori/lek']

const PLACE_COLORS: Record<string, { bg: string; fg: string }> = {
  'Vatten': { bg: 'oklch(0.93 0.045 235)', fg: 'oklch(0.42 0.11 240)' },
  'Land': { bg: 'oklch(0.93 0.05 80)', fg: 'oklch(0.45 0.08 68)' },
  'Styrka Actic': { bg: 'oklch(0.93 0.045 300)', fg: 'oklch(0.45 0.11 300)' },
  'Gymnastikens hus': { bg: 'oklch(0.93 0.05 152)', fg: 'oklch(0.42 0.09 152)' },
  'Teori/lek': { bg: 'oklch(0.93 0.035 62)', fg: 'oklch(0.45 0.06 60)' },
}

export function placeColors(place: string) {
  return PLACE_COLORS[place] ?? { bg: 'oklch(0.95 0.006 240)', fg: 'oklch(0.50 0.02 248)' }
}

export const RHYTHM: { day: string; items: [GroupKey, string][] }[] = [
  { day: 'Tisdag', items: [['N2', '16:30–17:45'], ['FG', '17:00–19:00'], ['TG', '17:00–19:00']] },
  { day: 'Torsdag', items: [['N1F', '16:30–17:45'], ['FG', '17:00–19:00'], ['TG', '17:00–19:00']] },
  { day: 'Lördag', items: [['N1N', '09:00–10:00'], ['N2', '09:30–10:45'], ['FG', '10:00–11:30'], ['TG', '11:30–13:45']] },
  { day: 'Söndag', items: [['VUX', '16:30–18:00']] },
]

export const TERM_EVENTS: { when: string; title: string; note: string; type: EventType }[] = [
  { when: '8–9 aug', title: 'Uppstartsläger', note: 'Alla grupper · 10–16', type: 'camp' },
  { when: '15–16 aug', title: 'Basutbildning tränare', note: '', type: 'edu' },
  { when: '20 & 22 aug', title: 'Prova på simhopp', note: 'Rekrytering', type: 'tryout' },
  { when: '5–6 sep', title: 'Simtävling VÖSS', note: 'Ingen träning', type: 'cancelled' },
  { when: '25–27 sep', title: 'Speedo Dive', note: 'Tävling · JKPG', type: 'comp' },
  { when: '17–18 okt', title: 'Simtävling VÖSS', note: 'Ingen träning', type: 'cancelled' },
  { when: '27 okt', title: 'Träning Alla', note: 'Gemensamt pass', type: 'event' },
  { when: '29 okt–1 nov', title: 'Diving Lund', note: 'Tävling', type: 'comp' },
  { when: '7 nov', title: 'Triangel Tävling VÖSS', note: 'N1, N1F, N2, FG · 09–17', type: 'comp' },
  { when: '14–15 nov', title: 'Simtävling VÖSS', note: 'Ingen träning', type: 'cancelled' },
  { when: '4–6 dec', title: 'Julklappshoppet', note: 'Tävling · JKPG', type: 'comp' },
  { when: '19 dec', title: 'Lucia & avslutning HT', note: 'Alla', type: 'event' },
]

export const EVENT_STYLES: Record<EventType, { dot: string; bg: string; border: string }> = {
  camp: { dot: 'oklch(0.55 0.10 235)', bg: 'oklch(0.96 0.025 235)', border: 'oklch(0.90 0.03 235)' },
  edu: { dot: 'oklch(0.52 0.04 250)', bg: 'oklch(0.97 0.01 250)', border: 'oklch(0.92 0.012 250)' },
  tryout: { dot: 'oklch(0.56 0.10 158)', bg: 'oklch(0.96 0.04 158)', border: 'oklch(0.90 0.04 158)' },
  cancelled: { dot: 'oklch(0.56 0.13 14)', bg: 'oklch(0.96 0.035 14)', border: 'oklch(0.90 0.04 14)' },
  comp: { dot: 'oklch(0.58 0.12 58)', bg: 'oklch(0.96 0.055 65)', border: 'oklch(0.89 0.06 65)' },
  event: { dot: 'oklch(0.55 0.11 290)', bg: 'oklch(0.96 0.035 290)', border: 'oklch(0.90 0.04 290)' },
}

// 'c' = tävling/inställt, 'e' = evenemang
export const GROUP_DATES: Record<GroupKey, [string, 'c' | 'e'][]> = {
  N1N: [['5–6 sep VÖSS · inställt', 'c'], ['17–18 okt VÖSS · inställt', 'c'], ['7 nov Triangeln VÖSS · inställt', 'c'], ['14–15 nov VÖSS · inställt', 'c'], ['19 dec Lucia & avslutning', 'e']],
  N1F: [['17–18 okt VÖSS · inställt', 'c'], ['14–15 nov VÖSS · inställt', 'c'], ['19 dec Lucia & avslutning', 'e']],
  N2: [['5–6 sep VÖSS · inställt', 'c'], ['17–18 okt VÖSS · inställt', 'c'], ['7 nov Triangeln VÖSS · inställt', 'c'], ['14–15 nov VÖSS · inställt', 'c'], ['19 dec Lucia & avslutning', 'e']],
  FG: [['VÖSS-tävlingar', 'c'], ['29 okt–1 nov Diving Lund', 'c'], ['4–6 dec Julklappshoppet', 'c'], ['19 dec Lucia & avslutning', 'e']],
  TG: [['VÖSS-tävlingar', 'c'], ['29 okt–1 nov Diving Lund', 'c'], ['4–6 dec Julklappshoppet', 'c'], ['19 dec Lucia & avslutning', 'e']],
  VUX: [['19 dec Lucia & avslutning', 'e']],
}

const ALL_TRAINING_GROUPS = ['N1N', 'N1F', 'N2', 'FG', 'TG']
const ALL_GROUPS = [...ALL_TRAINING_GROUPS, 'VUX']

function parseSchedule(dsl: string): { sessions: Session[]; markers: Marker[] } {
  const sessions: Session[] = []
  const markers: Marker[] = []
  let cur: { date: string; day: string } | null = null
  let dayIndex = 0

  for (const raw of dsl.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (/^\d{4}-\d{2}-\d{2}\s/.test(line)) {
      const [date, day] = line.split(/\s+/)
      cur = { date, day }
      dayIndex = 0
      continue
    }
    if (!cur) continue

    const p = line.split('|')
    if (p[0] === 't') {
      const tok = p[1]
      const groups = tok === 'ALLA' ? ALL_TRAINING_GROUPS : tok.split('+')
      const label = tok === 'ALLA' ? 'Alla' : groups.join(' + ')
      sessions.push({
        id: `${cur.date}#${dayIndex++}`, date: cur.date, day: cur.day, groups, label,
        start: p[2] || '', end: p[3] || '', place: p[4] || '',
        coaches: (p[5] || '').split(',').map(s => s.trim()).filter(Boolean),
        isEvent: false,
      })
    } else if (p[0] === 'x') {
      markers.push({ date: cur.date, day: cur.day, title: p[1], note: p[2] || '' })
    } else if (p[0] === 'e' && p[3] === 'all') {
      sessions.push({
        id: `${cur.date}#${dayIndex++}`, date: cur.date, day: cur.day, groups: ALL_GROUPS,
        label: p[1], start: '', end: '', place: p[2] || '', coaches: [], isEvent: true,
      })
    }
  }
  return { sessions, markers }
}

export const BASE_SCHEDULE = parseSchedule(SCHEDULE_DSL)

export function applyOverrides(overrides: Record<string, Override>): Session[] {
  return BASE_SCHEDULE.sessions.map(s => {
    const o = overrides[s.id]
    return o ? { ...s, ...o, edited: true } : { ...s, edited: false }
  })
}

// ---- datumhjälpare ----

const MON = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
export const MONTHS_FULL = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']
export const DAY_SHORT: Record<string, string> = { mån: 'Mån', tis: 'Tis', ons: 'Ons', tor: 'Tor', fre: 'Fre', lör: 'Lör', sön: 'Sön' }

export function toDate(str: string) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isoWeek(d: Date) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7) + 3)
  const f = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4))
  f.setUTCDate(f.getUTCDate() - ((f.getUTCDay() + 6) % 7) + 3)
  return 1 + Math.round((dt.getTime() - f.getTime()) / 6048e5)
}

export function weekRange(d: Date) {
  const mon = new Date(d)
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  if (mon.getMonth() === sun.getMonth()) return `${mon.getDate()}–${sun.getDate()} ${MON[sun.getMonth()]}`
  return `${mon.getDate()} ${MON[mon.getMonth()]}–${sun.getDate()} ${MON[sun.getMonth()]}`
}

export function timeText(s: { start: string; end: string }) {
  if (s.start && s.end) return `${s.start}–${s.end}`
  return s.start || '—'
}

export function dateNum(date: string) {
  return date.split('-')[2].replace(/^0/, '')
}

// Ljus variant av en oklch-färg (för grupp-etiketter)
export function tint(color: string) {
  return color.replace(/oklch\(([0-9.]+) ([0-9.]+) ([0-9.]+)\)/, 'oklch(0.95 0.04 $3)')
}
