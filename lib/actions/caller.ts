import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const ALLOWED_ROLES = ['admin', 'coach', 'athlete'] as const
export type Role = (typeof ALLOWED_ROLES)[number]

export interface Caller {
  userId: string
  clubId: string | null
  roles: string[]
}

// Server-only: who is calling, which club they belong to, and their roles.
// Club and roles are read with the admin client so they cannot be spoofed.
export async function getCaller(): Promise<Caller | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    admin.from('profiles').select('club_id').eq('id', user.id).single(),
    admin.from('user_roles').select('role').eq('profile_id', user.id),
  ])

  return {
    userId: user.id,
    clubId: profile?.club_id ?? null,
    roles: (roleRows ?? []).map(r => r.role as string),
  }
}

export function isAdmin(caller: Caller | null): caller is Caller & { clubId: string } {
  return !!caller?.clubId && caller.roles.includes('admin')
}

export function sanitizeRoles(roles: unknown): Role[] {
  if (!Array.isArray(roles)) return []
  return roles.filter((r): r is Role => (ALLOWED_ROLES as readonly string[]).includes(r))
}

// Is the given profile a member of the caller's club?
export async function isInClub(profileId: string, clubId: string) {
  const { data } = await createAdminClient()
    .from('profiles').select('club_id').eq('id', profileId).single()
  return data?.club_id === clubId
}
