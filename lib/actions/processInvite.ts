'use server'

import { createClient } from '@/lib/supabase/server'

export type ProcessInviteResult =
  | { status: 'ok' }
  | { status: 'no_access' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function linkAthleteProfile(
  supabase: any,
  profileId: string,
  email: string,
  clubId: string
) {
  // Hitta befintlig athlete-rad med samma email i klubben
  const { data: existing } = await supabase
    .from('athletes')
    .select('id')
    .eq('email', email)
    .eq('club_id', clubId)
    .is('profile_id', null)
    .limit(1)
    .single()

  if (existing) {
    await supabase
      .from('athletes')
      .update({ profile_id: profileId })
      .eq('id', existing.id)
  } else {
    // Skapa ny athlete-rad om ingen finns
    await supabase
      .from('athletes')
      .insert({ email, club_id: clubId, profile_id: profileId, name: email.split('@')[0] })
  }
}

export async function processInvite(): Promise<ProcessInviteResult> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { status: 'no_access' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, club_id')
      .eq('id', user.id)
      .single()

    if (!profile) return { status: 'no_access' }

    // Already has a club → nothing to do
    if (profile.club_id) return { status: 'ok' }

    // Check user_metadata from invite email
    const meta = user.user_metadata as { roles?: string[]; club_id?: string } | undefined

    if (meta?.club_id && meta?.roles?.length) {
      await supabase
        .from('profiles')
        .update({ club_id: meta.club_id })
        .eq('id', profile.id)

      for (const role of meta.roles) {
        await supabase
          .from('user_roles')
          .upsert({ profile_id: profile.id, role }, { onConflict: 'profile_id,role' })
      }

      // Länka athlete-rad om rollen är athlete
      if (meta.roles.includes('athlete') && profile.email) {
        await linkAthleteProfile(supabase, profile.id, profile.email, meta.club_id)
      }

      // Mark invite as accepted if it exists
      await supabase
        .from('invites')
        .update({ accepted: true })
        .eq('email', profile.email)
        .eq('accepted', false)

      return { status: 'ok' }
    }

    // Check invites table as fallback
    const { data: invite } = await supabase
      .from('invites')
      .select('*')
      .eq('email', profile.email)
      .eq('accepted', false)
      .limit(1)
      .single()

    if (invite) {
      await supabase
        .from('profiles')
        .update({ club_id: invite.club_id })
        .eq('id', profile.id)

      for (const role of invite.roles as string[]) {
        await supabase
          .from('user_roles')
          .upsert({ profile_id: profile.id, role }, { onConflict: 'profile_id,role' })
      }

      // Länka athlete-rad om rollen är athlete
      if ((invite.roles as string[]).includes('athlete') && profile.email) {
        await linkAthleteProfile(supabase, profile.id, profile.email, invite.club_id)
      }

      await supabase
        .from('invites')
        .update({ accepted: true })
        .eq('id', invite.id)

      return { status: 'ok' }
    }

    // No invite found → no access
    return { status: 'no_access' }
  } catch (err) {
    console.error('[processInvite] error:', err)
    return { status: 'no_access' }
  }
}
