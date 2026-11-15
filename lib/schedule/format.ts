import { getISOWeekNumber, toDateString } from '@/lib/utils/week'
import type { ClubEvent, EventType, PassStatus, SchedulePass } from './types'

// ── Dates (all local time, YYYY-MM-DD strings) ─────────────────────────────

export const todayISO = () => toDateString(new Date())

export function parseISO(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: string, days: number) {
  const d = parseISO(date)
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

export function mondayOf(date: string) {
  const d = parseISO(date)
  return addDays(date, -((d.getDay() + 6) % 7))
}

export const weekNumber = (date: string) => getISOWeekNumber(parseISO(date))

const MON = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
export const MONTHS_FULL = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']
export const DAY_SHORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
export const DAY_LONG = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']

// 0 = Monday … 6 = Sunday
export const weekdayIndex = (date: string) => (parseISO(date).getDay() + 6) % 7
export const dayShort = (date: string) => DAY_SHORT[weekdayIndex(date)]
export const dateNum = (date: string) => String(parseISO(date).getDate())

export function shortDate(date: string) {
  const d = parseISO(date)
  return `${d.getDate()} ${MON[d.getMonth()]}`
}

export function weekRangeLabel(monday: string) {
  const a = parseISO(monday)
  const b = parseISO(addDays(monday, 6))
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MON[b.getMonth()]}`
  return `${a.getDate()} ${MON[a.getMonth()]}–${b.getDate()} ${MON[b.getMonth()]}`
}

export function rangeLabel(startsOn: string, endsOn: string) {
  if (startsOn === endsOn) return shortDate(startsOn)
  const a = parseISO(startsOn)
  const b = parseISO(endsOn)
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MON[b.getMonth()]}`
  return `${shortDate(startsOn)}–${shortDate(endsOn)}`
}

export function daysBetween(from: string, to: string) {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86400000)
}

export function timeText(p: { start: string; end: string }) {
  if (p.start && p.end) return `${p.start}–${p.end}`
  return p.start || 'Tid ej satt'
}

export function minutes(p: { start: string; end: string }) {
  if (!p.start || !p.end) return 0
  const [sh, sm] = p.start.split(':').map(Number)
  const [eh, em] = p.end.split(':').map(Number)
  return Math.max(0, eh * 60 + em - (sh * 60 + sm))
}

// ── Status ─────────────────────────────────────────────────────────────────

export function passStatus(p: SchedulePass, today = todayISO()): PassStatus {
  if (p.cancelledReason !== null) return 'cancelled'
  if (p.completed) return 'completed'
  if (p.contentStatus === 'planned') return 'planned'
  if (p.contentStatus === 'draft') return 'draft'
  if (p.date < today) return 'past'
  return 'unplanned'
}

export const STATUS_STYLE: Record<PassStatus, { label: string; bg: string; fg: string; border: string; dashed?: boolean; strike?: boolean }> = {
  unplanned: { label: 'Oplanerat', bg: '#EEF3F8', fg: '#56637A', border: '#E1E8F0', dashed: true },
  draft: { label: 'Utkast', bg: '#FEF3C7', fg: '#92400E', border: '#FCD34D' },
  planned: { label: 'Planerat', bg: '#DCFCE7', fg: '#166534', border: '#86EFAC' },
  completed: { label: 'Genomfört', bg: 'rgba(43,92,158,0.1)', fg: '#2B5C9E', border: 'rgba(43,92,158,0.3)' },
  cancelled: { label: 'Inställt', bg: '#FEE2E2', fg: '#991B1B', border: '#FCA5A5', strike: true },
  past: { label: 'Passerat', bg: '#EEF3F8', fg: '#56637A', border: '#E1E8F0' },
}

// ── Places & event types ───────────────────────────────────────────────────

export const PLACES = ['Vatten', 'Land', 'Styrka Actic', 'Gymnastikens hus', 'Teori/lek']

const PLACE_COLORS: Record<string, { bg: string; fg: string }> = {
  'Vatten': { bg: '#DBEAFE', fg: '#1E40AF' },
  'Land': { bg: '#FEF3C7', fg: '#92400E' },
  'Styrka Actic': { bg: '#EDE9FE', fg: '#5B21B6' },
  'Gymnastikens hus': { bg: '#DCFCE7', fg: '#166534' },
  'Teori/lek': { bg: '#FFEDD5', fg: '#9A3412' },
}

export const placeColors = (place: string) => PLACE_COLORS[place] ?? { bg: '#EEF3F8', fg: '#56637A' }

export const EVENT_STYLE: Record<EventType, { label: string; dot: string; bg: string; fg: string }> = {
  camp: { label: 'Läger', dot: '#0284C7', bg: '#E0F2FE', fg: '#075985' },
  edu: { label: 'Utbildning', dot: '#56637A', bg: '#EEF3F8', fg: '#1E2B42' },
  tryout: { label: 'Prova på', dot: '#059669', bg: '#D1FAE5', fg: '#065F46' },
  cancelled: { label: 'Ingen träning', dot: '#DC2626', bg: '#FEE2E2', fg: '#991B1B' },
  comp: { label: 'Tävling', dot: '#D97706', bg: '#FEF3C7', fg: '#92400E' },
  event: { label: 'Evenemang', dot: '#7C3AED', bg: '#EDE9FE', fg: '#5B21B6' },
}

export function eventsOnDate(events: ClubEvent[], date: string) {
  return events.filter(e => e.startsOn <= date && date <= e.endsOn)
}

// ── Shared UI tokens (match app/globals.css) ───────────────────────────────

export const UI = {
  text: '#1E2B42',
  muted: '#56637A',
  faint: '#56637A',
  line: '#E1E8F0',
  primary: '#2B5C9E',
  primarySoft: '#E3ECF7',
}

export const cardStyle: React.CSSProperties = {
  background: 'var(--surface-card)',
  borderRadius: 'var(--radius-card)',
  border: '1px solid var(--line)',
}
