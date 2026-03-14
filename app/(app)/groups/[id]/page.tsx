'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ChevronRight } from 'lucide-react'

interface Group {
  id: string
  name: string
  color: string | null
}

interface Athlete {
  id: string
  name: string
  email: string | null
  active: boolean
  group_id: string
}

export default function GroupPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string
  const supabase = createClient()

  const [group, setGroup] = useState<Group | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: groupData } = await supabase.from('groups').select('*').eq('id', groupId).single()
      const { data: athleteData } = await supabase.from('athletes').select('*').eq('group_id', groupId).order('name')
      if (groupData) setGroup(groupData)
      if (athleteData) setAthletes(athleteData)
      setLoading(false)
    }
    load()
  }, [groupId])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#94A3B8' }}>
      Laddar grupp...
    </div>
  )

  if (!group) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Gruppen hittades inte</div>
  )

  const groupColor = group.color || '#0D7377'

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0,0,0,0.08)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} color="#0F172A" strokeWidth={2.5} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 15,
            background: `${groupColor}18`,
            border: `2px solid ${groupColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: groupColor }}>{group.name.charAt(0)}</span>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{group.name}</h1>
            <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>{athletes.length} atleter</p>
          </div>
        </div>
      </div>

      {/* Athletes */}
      <div style={{ padding: '0 16px' }}>
        {athletes.length === 0 ? (
          <div className="glass-card" style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>
            Inga atleter i denna grupp
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {athletes.map((athlete, ii) => (
              <Link key={athlete.id} href={`/athletes/${athlete.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', padding: '14px 18px',
                  borderBottom: ii < athletes.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 14,
                    background: `${groupColor}18`,
                    border: `1.5px solid ${groupColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 14,
                  }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: groupColor }}>{athlete.name.charAt(0).toUpperCase()}</span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: athlete.active ? '#0F172A' : '#94A3B8' }}>{athlete.name}</div>
                    {athlete.email && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{athlete.email}</div>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 9999,
                      background: athlete.active ? 'rgba(13,115,119,0.1)' : 'rgba(0,0,0,0.05)',
                      color: athlete.active ? '#0D7377' : '#94A3B8',
                    }}>
                      {athlete.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                    <ChevronRight size={14} color="#CBD5E1" strokeWidth={2.5} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
