'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { useSchedule } from '@/lib/schedule/store'
import { C, ListCard } from './ui'

// Admin: link each coach in the schedule (club_staff) to a login, so "Mina
// pass", Närvaro and "Hej {namn}" know who is who. Moved here from /schema.
export default function StaffLinks() {
  const db = useMemo(() => createClient(), [])
  const { profile } = useUser()
  const { data, reload } = useSchedule()
  const [accounts, setAccounts] = useState<{ id: string; label: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.club_id) return
    db.from('profiles').select('id, email, full_name').eq('club_id', profile.club_id)
      .then(({ data: rows }) => setAccounts((rows ?? []).map(p => ({ id: p.id, label: p.full_name || p.email || 'Konto utan namn' }))))
  }, [db, profile?.club_id])

  const link = async (staffId: string, profileId: string | null) => {
    setError(null)
    if (profileId) await db.from('club_staff').update({ profile_id: null }).eq('profile_id', profileId) // one coach per login
    const { error: e } = await db.from('club_staff').update({ profile_id: profileId }).eq('id', staffId)
    if (e) setError(e.message)
    reload()
  }

  if (!data.staff.length) return null

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', color: C.text }}>Tränare i schemat</h2>
      <p style={{ margin: 0, fontSize: 13.5, color: C.muted }}>Koppla varje tränare till sitt konto.</p>
      <ListCard>
        {data.staff.map((s, i) => (
          <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', minHeight: 52, borderBottom: i < data.staff.length - 1 ? `1px solid ${C.line}` : 'none' }}>
            <span style={{ width: 72, fontSize: 15, fontWeight: 700, color: C.text }}>{s.name}</span>
            <select value={s.profileId ?? ''} onChange={e => link(s.id, e.target.value || null)} aria-label={`Konto för ${s.name}`} style={{
              flex: 1, minHeight: 44, borderRadius: 12, border: `1px solid ${C.line}`, background: '#fff', padding: '0 10px',
              fontSize: 15, color: C.text, fontFamily: 'inherit',
            }}>
              <option value="">Inget konto</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>
        ))}
      </ListCard>
      {error && <p role="alert" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{error}</p>}
    </section>
  )
}
