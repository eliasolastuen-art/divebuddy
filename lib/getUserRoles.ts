import { createClient } from '@/lib/supabase/server'

export async function getUserRoles(profileId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('profile_id', profileId)

  return data?.map(r => r.role) ?? []
}
