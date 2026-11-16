import type { SupabaseClient } from '@supabase/supabase-js'

// Checked exercises per live session (live_session_checks), so "Fortsätt
// passet" and "4 av 6 övningar klara" survive leaving the page.

export async function loadChecks(db: SupabaseClient, sessionId: string): Promise<Set<string>> {
  const { data, error } = await db.from('live_session_checks').select('training_block_item_id').eq('session_id', sessionId)
  if (error) throw new Error(error.message)
  return new Set((data ?? []).map(r => r.training_block_item_id as string))
}

export async function setCheck(db: SupabaseClient, sessionId: string, itemId: string, on: boolean) {
  const { error } = on
    ? await db.from('live_session_checks').upsert({ session_id: sessionId, training_block_item_id: itemId }, { onConflict: 'session_id,training_block_item_id' })
    : await db.from('live_session_checks').delete().eq('session_id', sessionId).eq('training_block_item_id', itemId)
  if (error) throw new Error(error.message)
}
