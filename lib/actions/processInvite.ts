'use server'

import { createClient } from '@/lib/supabase/server'

export async function processInvite() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, club_id')
    .eq('id', user.id)
    .single()

  if (!profile) return

  // First-user auto-admin: if this user has no club and no roles,
  // assign them to the first club as admin.
  if (!profile.club_id) {
    const { data: existingRoles } = await supabase
      .from('user_roles')
      .select('id')
      .eq('profile_id', profile.id)

    if (!existingRoles || existingRoles.length === 0) {
      const { data: firstClub } = await supabase
        .from('clubs')
        .select('id')
        .limit(1)
        .single()

      if (firstClub) {
        await supabase
          .from('profiles')
          .update({ club_id: firstClub.id })
          .eq('id', profile.id)

        await supabase
          .from('user_roles')
          .insert({ profile_id: profile.id, role: 'admin' })

        return
      }
    }
  }

  // Invite check: apply any pending invites for this email
  const { data: invite } = await supabase
    .from('invites')
    .select('*')
    .eq('email', profile.email)
    .eq('accepted', false)
    .limit(1)
    .single()

  if (!invite) return

  // Apply club
  await supabase
    .from('profiles')
    .update({ club_id: invite.club_id })
    .eq('id', profile.id)

  // Apply roles
  for (const role of invite.roles as string[]) {
    await supabase
      .from('user_roles')
      .insert({ profile_id: profile.id, role })
      .throwOnError()
  }

  // Mark invite accepted
  await supabase
    .from('invites')
    .update({ accepted: true })
    .eq('id', invite.id)
}
