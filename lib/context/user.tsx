'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  club_id: string | null
}

interface UserContextValue {
  user: User | null
  profile: Profile | null
  roles: string[]
  activeRole: string
  setActiveRole: (role: string) => void
  loading: boolean
}

const UserContext = createContext<UserContextValue>({
  user: null,
  profile: null,
  roles: [],
  activeRole: '',
  setActiveRole: () => {},
  loading: true,
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [activeRole, setActiveRoleState] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profile)

      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('profile_id', user.id)

      const roleList = roleRows?.map(r => r.role) ?? []
      setRoles(roleList)

      // Restore or default active role
      const stored = localStorage.getItem('divebuddy_active_role')
      if (stored && roleList.includes(stored)) {
        setActiveRoleState(stored)
      } else if (roleList.length > 0) {
        setActiveRoleState(roleList[0])
      }

      setLoading(false)
    }

    load()
  }, [])

  const setActiveRole = (role: string) => {
    setActiveRoleState(role)
    localStorage.setItem('divebuddy_active_role', role)
  }

  return (
    <UserContext.Provider value={{ user, profile, roles, activeRole, setActiveRole, loading }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
