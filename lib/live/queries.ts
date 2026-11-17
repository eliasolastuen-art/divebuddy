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

// The latest finished run of a pass, for "Passet, klart": when it ran, which
// exercises were checked and the scores. Older runs stay untouched.
export interface RunScore { itemId: string; athleteId: string; score: number; notes: string | null }
export interface LatestRun {
  id: string
  startedAt: string
  endedAt: string | null
  checked: Set<string>
  scores: RunScore[]
}

export async function latestRun(db: SupabaseClient, trainingId: string): Promise<LatestRun | null> {
  const { data: s, error } = await db.from('live_sessions').select('id, started_at, ended_at')
    .eq('training_id', trainingId).eq('status', 'ended')
    .order('started_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(error.message)
  if (!s) return null
  const [checks, scores] = await Promise.all([
    db.from('live_session_checks').select('training_block_item_id').eq('session_id', s.id),
    db.from('exercise_scores').select('training_block_item_id, athlete_id, score, notes').eq('session_id', s.id),
  ])
  return {
    id: s.id, startedAt: s.started_at, endedAt: s.ended_at,
    checked: new Set((checks.data ?? []).map(r => r.training_block_item_id as string)),
    scores: ((scores.data ?? []) as { training_block_item_id: string; athlete_id: string; score: number; notes: string | null }[])
      .map(r => ({ itemId: r.training_block_item_id, athleteId: r.athlete_id, score: Number(r.score), notes: r.notes })),
  }
}
