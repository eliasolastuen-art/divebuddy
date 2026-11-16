import type { SupabaseClient } from '@supabase/supabase-js'

// Live sessions that are still running (status 'active') with the numbers
// the Live tab needs: "Inte avslutat · 4 av 6 övningar klara" and "pågår 52 min".

export interface ActiveSession {
  id: string
  startedAt: string
  coachId: string | null
  trainingId: string | null
  groupId: string | null
  scheduleSessionId: string | null
  title: string | null
  groupName: string | null
  checked: number
  total: number
}

interface Row {
  id: string; started_at: string; coach_id: string | null; training_id: string | null; group_id: string | null
  schedule_session_id: string | null
  trainings: { title: string | null; training_blocks: { training_block_items: { count: number }[] }[] } | null
  groups: { name: string } | null
  live_session_checks: { count: number }[]
}

export async function activeSessions(db: SupabaseClient, clubId: string): Promise<ActiveSession[]> {
  const { data, error } = await db.from('live_sessions')
    .select('id, started_at, coach_id, training_id, group_id, schedule_session_id, trainings(title, training_blocks(training_block_items(count))), groups(name), live_session_checks(count)')
    .eq('club_id', clubId).eq('status', 'active')
    .order('started_at')
  if (error) throw new Error(error.message)
  return (data as unknown as Row[]).map(r => ({
    id: r.id,
    startedAt: r.started_at,
    coachId: r.coach_id,
    trainingId: r.training_id,
    groupId: r.group_id,
    scheduleSessionId: r.schedule_session_id,
    title: r.trainings?.title ?? null,
    groupName: r.groups?.name ?? null,
    checked: r.live_session_checks[0]?.count ?? 0,
    total: (r.trainings?.training_blocks ?? []).reduce((s, b) => s + (b.training_block_items[0]?.count ?? 0), 0),
  }))
}

export const minutesSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
