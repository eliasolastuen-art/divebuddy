import { NextResponse } from 'next/server'
import { inviteUser } from '@/lib/actions/inviteUser'

export async function POST(req: Request) {
  const body = await req.json()
  const email: string | undefined = body.email
  // Accept both { roles: [...] } and the older { role: '...' }
  const roles: string[] = body.roles ?? (body.role ? [body.role] : [])

  if (!email || !roles.length) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  // Same rules as the server action: caller's own club, coaches may only invite athletes
  const result = await inviteUser(email, roles)
  if (!result.success) {
    const status = result.error === 'Not authenticated' ? 401 : 403
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ success: true })
}
