'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, Plus } from 'lucide-react'

interface Training {
  id: string
  title: string
  scheduled_date: string | null
  status: 'draft' | 'published'
}

export default function GroupPlanningPage() {
  const params = useParams()
  const groupId = params.id as string
  const supabase = createClient()

  const [trainings, setTrainings] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)
  const [groupColor, setGroupColor] = useState('#0D7377')

  useEffect(() => {
    async function load() {
      const [{ data: groupData }, { data: trainingData }] = await Promise.all([
        supabase.from('groups').select('color').eq('id', groupId).single(),
        supabase
          .from('trainings')
          .select('id, title, scheduled_date, status')
          .eq('group_id', groupId)
          .order('scheduled_date', { ascending: false }),
      ])

      if (groupData?.color) setGroupColor(groupData.color)
      if (trainingData) setTrainings(trainingData)
      setLoading(false)
    }
    load()
  }, [groupId])

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })
  }

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
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
          Pass
        </h2>
        <button
          onClick={() => alert('Nytt pass — kommer snart')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 12,
            background: `linear-gradient(135deg, ${groupColor}, ${groupColor}cc)`,
            border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, color: 'white',
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Nytt pass
        </button>
      </div>

      {trainings.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: 'rgba(13,115,119,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CalendarDays size={24} color="rgba(13,115,119,0.4)" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Inga pass ännu</p>
          <p style={{ fontSize: 13, color: '#94A3B8' }}>Skapa ett pass för att komma igång</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {trainings.map((t) => (
            <div
              key={t.id}
              className="glass-card"
              style={{
                padding: '16px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: `${groupColor}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CalendarDays size={18} color={groupColor} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 700, color: '#0F172A',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    {formatDate(t.scheduled_date)}
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700,
                padding: '4px 10px', borderRadius: 9999, flexShrink: 0,
                background: t.status === 'published' ? `${groupColor}15` : 'rgba(0,0,0,0.05)',
                color: t.status === 'published' ? groupColor : '#94A3B8',
              }}>
                {t.status === 'published' ? 'Publicerat' : 'Utkast'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
