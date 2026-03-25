import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  // Verify the caller is authenticated
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, roles, clubId } = await req.json()

  if (!email || !roles?.length || !clubId) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  // Admin client — service role key, server only
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email.toLowerCase().trim(),
    { data: { roles, club_id: clubId } }
  )

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  // Record in invites table for UI display + processInvite pickup
  await supabase.from('invites').insert({
    email: email.toLowerCase().trim(),
    club_id: clubId,
    roles,
    created_by: user.id,
  })

  return NextResponse.json({ success: true })
}
