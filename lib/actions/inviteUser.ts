'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function inviteUser(
  email: string,
  roles: string[],
  clubId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify the caller is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const normalizedEmail = email.toLowerCase().trim()
    const admin = createAdminClient()

    // Send invite email via Supabase Auth
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      { data: { roles, club_id: clubId } }
    )

    if (inviteError) return { success: false, error: inviteError.message }

    // Also record in invites table (for UI list + processInvite to read)
    await supabase.from('invites').insert({
      email: normalizedEmail,
      club_id: clubId,
      roles,
      created_by: user.id,
    })

    return { success: true }
  } catch (err) {
    console.error('[inviteUser]', err)
    return { success: false, error: 'Unexpected error. Please try again.' }
  }
}
