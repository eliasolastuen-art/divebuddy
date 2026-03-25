import { createClient } from '@/lib/supabase/server'
import { processInvite } from '@/lib/actions/processInvite'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    try {
      const supabase = await createClient()
      await supabase.auth.exchangeCodeForSession(code)
      const result = await processInvite()

      if (result.status === 'no_access') {
        return NextResponse.redirect(`${origin}/no-access`)
      }
    } catch (err) {
      console.error('[auth/callback] error:', err)
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
