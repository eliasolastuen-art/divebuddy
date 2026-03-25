'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('profile_id', user.id)

  if (!data?.some(r => r.role === 'admin')) return null
  return user
}

export async function removeMemberFromClub(profileId: string): Promise<{ error?: string }> {
  const user = await verifyAdmin()
  if (!user) return { error: 'Unauthorized' }

  const admin = createAdminClient()

  await admin.from('user_roles').delete().eq('profile_id', profileId)
  await admin.from('profiles').update({ club_id: null }).eq('id', profileId)

  return {}
}

export async function deleteInvite(inviteId: string): Promise<{ error?: string }> {
  const user = await verifyAdmin()
  if (!user) return { error: 'Unauthorized' }

  const admin = createAdminClient()
  await admin.from('invites').delete().eq('id', inviteId)

  return {}
}
