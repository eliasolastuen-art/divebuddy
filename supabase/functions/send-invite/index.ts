import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  try {
    const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!
    const APP_URL          = Deno.env.get('APP_URL')!

    // 1. Verify calling user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    // 2. Get caller's profile and club_id
    const { data: profile } = await userClient
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .single()

    if (!profile?.club_id) return json({ error: 'Profile or club not found' }, 400)

    const { athlete_id, email } = await req.json()
    if (!athlete_id || !email) return json({ error: 'Missing athlete_id or email' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const normalizedEmail = (email as string).toLowerCase().trim()
    const token = crypto.randomUUID()

    // 3. Save invite to invites table
    const { error: insertError } = await admin.from('invites').insert({
      email:      normalizedEmail,
      club_id:    profile.club_id,
      athlete_id,
      token,
      roles:      ['athlete'],
      created_by: user.id,
    })
    if (insertError) return json({ error: insertError.message }, 400)

    // 4. Send invite via Supabase Auth admin
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: `${APP_URL}/invite?athlete_id=${athlete_id}`,
        data: { roles: ['athlete'], club_id: profile.club_id, athlete_id },
      }
    )
    if (inviteError) return json({ error: inviteError.message }, 400)

    // 5. Return success
    return json({ success: true })
  } catch {
    return json({ error: 'Unexpected error' }, 500)
  }
})
