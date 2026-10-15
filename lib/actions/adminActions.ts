'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCaller, isAdmin, isInClub } from '@/lib/actions/caller'

export async function removeMemberFromClub(profileId: string): Promise<{ error?: string }> {
  const caller = await getCaller()
  if (!isAdmin(caller)) return { error: 'Unauthorized' }
  if (!(await isInClub(profileId, caller.clubId))) return { error: 'Unauthorized' }

  const admin = createAdminClient()

  await admin.from('user_roles').delete().eq('profile_id', profileId)
  await admin.from('profiles').update({ club_id: null }).eq('id', profileId)

  return {}
}

export async function deleteInvite(inviteId: string): Promise<{ error?: string }> {
  const caller = await getCaller()
  if (!isAdmin(caller)) return { error: 'Unauthorized' }

  const admin = createAdminClient()
  await admin.from('invites').delete().eq('id', inviteId).eq('club_id', caller.clubId)

  return {}
}
