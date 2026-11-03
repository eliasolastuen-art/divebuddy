'use client'

import { useSyncExternalStore } from 'react'
import { useUser } from '@/lib/context/user'
import { useSchedule } from './store'
import type { Staff } from './types'

// Who is looking at the schedule, which groups are "mine", and whether
// they may edit the schedule. In demo mode an admin can preview the app
// as one of the coaches ("Visa som"), stored only in this browser.

const PREVIEW_KEY = 'divebuddy-schedule-view-as'
const SCOPE_KEY = 'divebuddy-planning-scope'
const listeners = new Set<() => void>()

function read(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {}
  listeners.forEach(l => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l) }

export function setViewAs(staffId: string | null) { write(PREVIEW_KEY, staffId) }
export function setScope(scope: 'mine' | 'all') { write(SCOPE_KEY, scope) }

export interface Viewer {
  isAdmin: boolean          // real role (ignores preview)
  canEditSchedule: boolean  // admin and not previewing as a coach
  me: Staff | null          // the staff member being shown
  previewing: boolean
  scope: 'mine' | 'all'
  groupIds: string[]        // groups to show in Planning / Dashboard
  hasOwnGroups: boolean
  loading: boolean          // roles/profile still loading
}

export function useViewer(): Viewer {
  const { data } = useSchedule()
  const { roles, profile, loading } = useUser()
  const previewId = useSyncExternalStore(subscribe, () => read(PREVIEW_KEY), () => null)
  const rawScope = useSyncExternalStore(subscribe, () => read(SCOPE_KEY), () => null)

  const isAdmin = roles.includes('admin')
  const preview = previewId ? data.staff.find(s => s.id === previewId) ?? null : null
  const linked = profile ? data.staff.find(s => s.profileId === profile.id) ?? null : null
  const me = preview ?? linked
  const previewing = !!preview

  const allIds = data.groups.map(g => g.id)
  const ownIds = me?.groupIds ?? []
  // Admins (not previewing) choose; coaches always see their own groups
  const scope: 'mine' | 'all' = isAdmin && !previewing
    ? (rawScope === 'mine' && ownIds.length ? 'mine' : 'all')
    : 'mine'
  const groupIds = scope === 'all' ? allIds : (ownIds.length ? ownIds : allIds)

  return {
    isAdmin,
    canEditSchedule: isAdmin && !previewing,
    me,
    previewing,
    scope,
    groupIds,
    hasOwnGroups: ownIds.length > 0,
    loading,
  }
}
