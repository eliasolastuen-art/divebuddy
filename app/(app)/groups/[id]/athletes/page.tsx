'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Athlete {
  id: string
  name: string
  email: string | null
  active: boolean
}

export default function GroupAthletesPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string
  const supabase = createClient()

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [groupColor, setGroupColor] = useState('#0D7377')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: groupData }, { data: athleteData }] = await Promise.all([
        supabase.from('groups').select('color').eq('id', groupId).single(),
        supabase.from('athletes').select('id, name, email, active').eq('group_id', groupId).order('name'),
      ])

      if (groupData?.color) setGroupColor(groupData.color)
      if (athleteData) setAthletes(athleteData)
      setLoading(false)
    }
    load()
  }, [groupId])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid rgba(13,115,119,0.2)',
          borderTopColor: '#0D7377',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 16 }}>
        Atleter
      </h2>

      {athletes.length === 0 ? (
        <div className="glass-card" style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>
          Inga atleter i denna grupp
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {athletes.map((athlete, i) => (
            <button
              key={athlete.id}
              onClick={() => router.push(`/groups/${groupId}/athletes/${athlete.id}`)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center',
                padding: '14px 18px',
                borderBottom: i < athletes.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 14,
                background: `${groupColor}18`,
                border: `1.5px solid ${groupColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginRight: 14,
              }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: groupColor }}>
                  {athlete.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: athlete.active ? '#0F172A' : '#94A3B8' }}>
                  {athlete.name}
                </div>
                {athlete.email && (
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{athlete.email}</div>
                )}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700,
                padding: '4px 10px', borderRadius: 9999,
                background: athlete.active ? 'rgba(13,115,119,0.1)' : 'rgba(0,0,0,0.05)',
                color: athlete.active ? '#0D7377' : '#94A3B8',
                flexShrink: 0,
              }}>
                {athlete.active ? 'Aktiv' : 'Inaktiv'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
