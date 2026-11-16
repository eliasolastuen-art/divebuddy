import type { SupabaseClient } from '@supabase/supabase-js'
import { UI } from './format'
import type { Attendance, ClubEvent, EventType, LiveRef, ScheduleData, SchedulePass, Staff, Term, TrainingSummary } from './types'

// Supabase reads and writes for the term schedule. Tables:
// schedule_sessions (+ _groups, _coaches), club_staff, club_events.

interface SessionRow {
  id: string
  session_date: string
  start_time: string | null
  end_time: string | null
  place: string
  status: 'planned' | 'cancelled'
  cancel_reason: string | null
  training_id: string | null
  is_extra: boolean
  schedule_session_groups: { group_id: string }[]
  schedule_session_coaches: { staff_id: string; attendance: Attendance | null }[]
}

interface EventRow {
  id: string
  start_date: string
  end_date: string
  title: string
  type: EventType
  note: string | null
  group_ids: string[]
  staff_ids: string[]
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '')
const orNull = (t: string) => (t ? t : null)

function toPass(r: SessionRow): SchedulePass {
  return {
    id: r.id,
    date: r.session_date,
    start: hhmm(r.start_time),
    end: hhmm(r.end_time),
    place: r.place,
    groupIds: r.schedule_session_groups.map(g => g.group_id),
    staffIds: r.schedule_session_coaches.map(c => c.staff_id),
    trainingId: r.training_id,
    training: null,
    attendance: Object.fromEntries(r.schedule_session_coaches.map(c => [c.staff_id, c.attendance])),
    live: null,
    contentStatus: r.training_id ? 'planned' : 'none',
    content: null,
    completed: false,
    cancelledReason: r.status === 'cancelled' ? (r.cancel_reason ?? 'Inställt') : null,
    isExtra: r.is_extra,
    removed: false,
  }
}

const toEvent = (r: EventRow): ClubEvent => ({
  id: r.id, startsOn: r.start_date, endsOn: r.end_date, title: r.title, type: r.type,
  note: r.note ?? '', groupIds: r.group_ids ?? [], staffIds: r.staff_ids ?? [],
})

// HT = juli–december, VT = januari–juni
function termFor(passes: SchedulePass[]): Term {
  const dates = passes.map(p => p.date).sort()
  const first = dates[0] ?? new Date().toISOString().slice(0, 10)
  const last = dates[dates.length - 1] ?? first
  const ht = Number(first.slice(5, 7)) >= 7
  return { id: `term-${first}`, name: `${ht ? 'HT' : 'VT'}${first.slice(0, 4)}`, startsOn: first, endsOn: last }
}

// Prefill "mina grupper": the groups a person is scheduled with
function groupsCoachedBy(staffId: string, passes: SchedulePass[], order: string[]) {
  const set = new Set<string>()
  passes.forEach(p => { if (p.staffIds.includes(staffId)) p.groupIds.forEach(g => set.add(g)) })
  return order.filter(id => set.has(id))
}

export async function loadSchedule(db: SupabaseClient, clubId: string): Promise<ScheduleData> {
  const [groups, staff, sessions, events, lives] = await Promise.all([
    db.from('groups').select('id, name').eq('club_id', clubId).order('sort_order'),
    db.from('club_staff').select('id, name, profile_id').eq('club_id', clubId).eq('active', true).order('sort_order'),
    db.from('schedule_sessions')
      .select('id, session_date, start_time, end_time, place, status, cancel_reason, training_id, is_extra, schedule_session_groups(group_id), schedule_session_coaches(staff_id, attendance)')
      .eq('club_id', clubId)
      .order('session_date').order('start_time')
      .range(0, 4999),
    db.from('club_events').select('id, start_date, end_date, title, type, note, group_ids, staff_ids').eq('club_id', clubId).order('start_date'),
    db.from('live_sessions').select('id, schedule_session_id, status, started_at')
      .eq('club_id', clubId).not('schedule_session_id', 'is', null).order('started_at'),
  ])
  const err = groups.error ?? staff.error ?? sessions.error ?? events.error ?? lives.error
  if (err) throw new Error(err.message)

  const passes = (sessions.data as unknown as SessionRow[]).map(toPass)

  // Latest live session per pass → Pågår / Klart
  const liveBy: Record<string, LiveRef> = {}
  for (const l of (lives.data ?? []) as { id: string; schedule_session_id: string; status: string; started_at: string }[]) {
    liveBy[l.schedule_session_id] = { id: l.id, status: l.status === 'active' ? 'active' : 'ended', startedAt: l.started_at }
  }
  const trainings = await loadTrainingSummaries(db, passes.map(p => p.trainingId).filter((x): x is string => !!x))
  for (const p of passes) {
    p.live = liveBy[p.id] ?? null
    p.completed = p.live?.status === 'ended'
    p.training = p.trainingId ? trainings[p.trainingId] ?? null : null
  }
  const groupOrder = (groups.data ?? []).map(g => g.id)
  const staffList: Staff[] = (staff.data ?? []).map(s => ({
    id: s.id, name: s.name, color: UI.primary, profileId: s.profile_id,
    groupIds: groupsCoachedBy(s.id, passes, groupOrder),
  }))

  return {
    term: termFor(passes),
    groups: (groups.data ?? []).map(g => ({ id: g.id, name: g.name, color: UI.primary })),
    staff: staffList,
    passes,
    events: (events.data as unknown as EventRow[]).map(toEvent),
    weekFocus: [],
    templates: [],
  }
}

async function loadTrainingSummaries(db: SupabaseClient, ids: string[]): Promise<Record<string, TrainingSummary>> {
  const unique = Array.from(new Set(ids))
  if (!unique.length) return {}
  const { data, error } = await db.from('trainings')
    .select('id, title, training_blocks(id, training_block_items(count))').in('id', unique)
  if (error) throw new Error(error.message)
  const rows = data as unknown as { id: string; title: string; training_blocks: { training_block_items: { count: number }[] }[] }[]
  return Object.fromEntries(rows.map(t => [t.id, {
    id: t.id, title: t.title, blocks: t.training_blocks.length,
    items: t.training_blocks.reduce((s, b) => s + (b.training_block_items[0]?.count ?? 0), 0),
  }]))
}

type PassFields = Pick<SchedulePass, 'date' | 'start' | 'end' | 'place' | 'groupIds' | 'staffIds'>

function check(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message)
}

export const writes = {
  async insertSession(db: SupabaseClient, clubId: string, id: string, p: PassFields) {
    const { data: auth } = await db.auth.getUser()
    check(await db.from('schedule_sessions').insert({
      id, club_id: clubId, session_date: p.date, start_time: orNull(p.start), end_time: orNull(p.end),
      place: p.place, is_extra: true, created_by: auth.user?.id ?? null,
    }))
    if (p.groupIds.length) check(await db.from('schedule_session_groups').insert(p.groupIds.map(group_id => ({ session_id: id, group_id }))))
    if (p.staffIds.length) check(await db.from('schedule_session_coaches').insert(p.staffIds.map(staff_id => ({ session_id: id, staff_id }))))
  },

  async updateSession(db: SupabaseClient, id: string, patch: Partial<PassFields>, before: SchedulePass) {
    const row: Record<string, unknown> = {}
    if (patch.date !== undefined) row.session_date = patch.date
    if (patch.start !== undefined) row.start_time = orNull(patch.start)
    if (patch.end !== undefined) row.end_time = orNull(patch.end)
    if (patch.place !== undefined) row.place = patch.place
    if (Object.keys(row).length) check(await db.from('schedule_sessions').update(row).eq('id', id))

    if (patch.groupIds) {
      const gone = before.groupIds.filter(g => !patch.groupIds!.includes(g))
      const added = patch.groupIds.filter(g => !before.groupIds.includes(g))
      if (gone.length) check(await db.from('schedule_session_groups').delete().eq('session_id', id).in('group_id', gone))
      if (added.length) check(await db.from('schedule_session_groups').insert(added.map(group_id => ({ session_id: id, group_id }))))
    }
    // Only touch changed coaches so attendance on the others is kept
    if (patch.staffIds) {
      const gone = before.staffIds.filter(s => !patch.staffIds!.includes(s))
      const added = patch.staffIds.filter(s => !before.staffIds.includes(s))
      if (gone.length) check(await db.from('schedule_session_coaches').delete().eq('session_id', id).in('staff_id', gone))
      if (added.length) check(await db.from('schedule_session_coaches').insert(added.map(staff_id => ({ session_id: id, staff_id }))))
    }
  },

  async setCancelled(db: SupabaseClient, ids: string[], reason: string | null) {
    check(await db.from('schedule_sessions')
      .update({ status: reason === null ? 'planned' : 'cancelled', cancel_reason: reason })
      .in('id', ids))
  },

  async deleteSession(db: SupabaseClient, id: string) {
    check(await db.from('schedule_sessions').delete().eq('id', id))
  },

  async upsertEvent(db: SupabaseClient, clubId: string, id: string, e: Omit<ClubEvent, 'id'>) {
    check(await db.from('club_events').upsert({
      id, club_id: clubId, start_date: e.startsOn, end_date: e.endsOn, title: e.title, type: e.type,
      note: e.note || null, group_ids: e.groupIds, staff_ids: e.staffIds,
    }))
  },

  async setAttendance(db: SupabaseClient, sessionIds: string[], staffId: string, attendance: Attendance | null) {
    if (!sessionIds.length) return
    check(await db.from('schedule_session_coaches').upsert(
      sessionIds.map(session_id => ({ session_id, staff_id: staffId, attendance })),
      { onConflict: 'session_id,staff_id' },
    ))
  },

  // Live from a scheduled pass: links training, first group and the pass, marks me present
  async startLive(db: SupabaseClient, input: {
    clubId: string; profileId: string; sessionIds: string[]; mySessionIds: string[]; groupId: string | null; trainingId: string | null; staffId: string | null
  }): Promise<string> {
    const { data, error } = await db.from('live_sessions').insert({
      club_id: input.clubId, coach_id: input.profileId, group_id: input.groupId,
      training_id: input.trainingId, schedule_session_id: input.sessionIds[0], status: 'active',
    }).select('id').single()
    if (error || !data) throw new Error(error?.message ?? 'Kunde inte starta passet')
    if (input.trainingId) {
      check(await db.from('trainings').update({ is_active: true, started_at: new Date().toISOString() }).eq('id', input.trainingId))
    }
    // Mark me present on the parts I coach
    if (input.staffId && input.mySessionIds.length) await writes.setAttendance(db, input.mySessionIds, input.staffId, 'narvarande')
    return data.id as string
  },

  async deleteEvent(db: SupabaseClient, id: string) {
    check(await db.from('club_events').delete().eq('id', id))
  },
}
