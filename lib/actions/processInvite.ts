'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeRoles } from '@/lib/actions/caller'

export type ProcessInviteResult =
  | { status: 'ok' }
  | { status: 'no_access' }

type AdminClient = ReturnType<typeof createAdminClient>

async function linkAthleteProfile(
  admin: AdminClient,
  profileId: string,
  email: string,
  clubId: string,
  athleteId: string | null
) {
  // Already linked? Nothing to do.
  const { data: linked } = await admin
    .from('athletes').select('id').eq('profile_id', profileId).limit(1).maybeSingle()
  if (linked) return

  // 1. The athlete row the invite was sent for (must belong to the same club)
  if (athleteId) {
    const { data: target } = await admin
      .from('athletes').select('id, club_id, profile_id').eq('id', athleteId).maybeSingle()
    if (target && target.club_id === clubId && !target.profile_id) {
      await admin.from('athletes').update({ profile_id: profileId }).eq('id', target.id)
      return
    }
  }

  // 2. Hitta befintlig athlete-rad med samma email i klubben
  const { data: existing } = await admin
    .from('athletes')
    .select('id')
    .eq('email', email)
    .eq('club_id', clubId)
    .is('profile_id', null)
    .limit(1)
    .maybeSingle()

  if (existing) {
    await admin.from('athletes').update({ profile_id: profileId }).eq('id', existing.id)
  } else {
    // Skapa ny athlete-rad om ingen finns
    await admin
      .from('athletes')
      .insert({ email, club_id: clubId, profile_id: profileId, name: email.split('@')[0] })
  }
}

// Gives a newly signed-in user their club and roles.
// The only source of truth is a pending row in `invites` for the user's
// verified email — never user_metadata, which the user can write themselves.
export async function processInvite(): Promise<ProcessInviteResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email || !user.email_confirmed_at) return { status: 'no_access' }

    const admin = createAdminClient()
    const email = user.email.toLowerCase()

    const { data: profile } = await admin
      .from('profiles').select('id, club_id').eq('id', user.id).single()
    if (!profile) return { status: 'no_access' }

    // Already has a club → nothing to do
    if (profile.club_id) return { status: 'ok' }

    const { data: invite } = await admin
      .from('invites')
      .select('id, club_id, roles, athlete_id')
      .eq('email', email)
      .eq('accepted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!invite?.club_id) return { status: 'no_access' }

    const roles = sanitizeRoles(invite.roles)
    if (!roles.length) return { status: 'no_access' }

    await admin.from('profiles').update({ club_id: invite.club_id }).eq('id', profile.id)

    for (const role of roles) {
      await admin
        .from('user_roles')
        .upsert({ profile_id: profile.id, role }, { onConflict: 'profile_id,role' })
    }

    // Länka athlete-rad om rollen är athlete
    if (roles.includes('athlete')) {
      await linkAthleteProfile(admin, profile.id, email, invite.club_id, invite.athlete_id ?? null)
    }

    await admin.from('invites').update({ accepted: true }).eq('id', invite.id)

    return { status: 'ok' }
  } catch (err) {
    console.error('[processInvite] error:', err)
    return { status: 'no_access' }
  }
}
