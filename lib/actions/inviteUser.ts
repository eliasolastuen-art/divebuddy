'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCaller, isAdmin, sanitizeRoles } from '@/lib/actions/caller'

// Invite someone to the caller's own club.
// Admins may grant any role; coaches may only invite athletes.
// The club always comes from the caller's profile, never from the request.
export async function inviteUser(
  email: string,
  roles: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await getCaller()
    if (!caller) return { success: false, error: 'Not authenticated' }
    if (!caller.clubId) return { success: false, error: 'Du tillhör ingen klubb.' }

    const cleanRoles = sanitizeRoles(roles)
    if (!cleanRoles.length) return { success: false, error: 'Välj minst en roll.' }

    const onlyAthlete = cleanRoles.every(r => r === 'athlete')
    const allowed = isAdmin(caller) || (onlyAthlete && caller.roles.includes('coach'))
    if (!allowed) return { success: false, error: 'Du har inte behörighet att bjuda in med den rollen.' }

    const normalizedEmail = email.toLowerCase().trim()
    const admin = createAdminClient()

    // The invites row is the source of truth for club and roles (see processInvite)
    const { error: insertError } = await admin.from('invites').insert({
      email: normalizedEmail,
      club_id: caller.clubId,
      roles: cleanRoles,
      created_by: caller.userId,
    })
    if (insertError) return { success: false, error: insertError.message }

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail)
    if (inviteError) return { success: false, error: inviteError.message }

    return { success: true }
  } catch (err) {
    console.error('[inviteUser]', err)
    return { success: false, error: 'Unexpected error. Please try again.' }
  }
}
