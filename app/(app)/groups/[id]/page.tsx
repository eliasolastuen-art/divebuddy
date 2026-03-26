'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight, CalendarDays } from 'lucide-react'
import Link from 'next/link'

interface Group {
  id: string
  name: string
  color: string | null
}

interface Athlete {
  id: string
  name: string
}

interface Training {
  id: string
  title: string
  scheduled_date: string
  status: 'draft' | 'published'
}

export default function GroupDashboardPage() {
  const params = useParams()
  const groupId = params.id as string
  const supabase = createClient()

  const [group, setGroup] = useState<Group | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]

      const [{ data: groupData }, { data: athleteData }, { data: trainingData }] = await Promise.all([
        supabase.from('groups').select('id, name, color').eq('id', groupId).single(),
        supabase.from('athletes').select('id, name').eq('group_id', groupId).order('name'),
        supabase
          .from('trainings')
          .select('id, title, scheduled_date, status')
          .eq('group_id', groupId)
          .gte('scheduled_date', today)
          .order('scheduled_date', { ascending: true })
          .limit(3),
      ])

      if (groupData) setGroup(groupData)
      if (athleteData) setAthletes(athleteData)
      if (trainingData) setTrainings(trainingData)
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

  if (!group) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
        Gruppen hittades inte
      </div>
    )
  }

  const groupColor = group.color || '#0D7377'
  const previewAthletes = athletes.slice(0, 4)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Hero */}
      <div className="glass-card" style={{
        padding: '24px 20px',
        background: `linear-gradient(135deg, ${groupColor}12, ${groupColor}06)`,
        borderTop: `3px solid ${groupColor}`,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: -20, right: -20,
          width: 120, height: 120, borderRadius: '50%',
          background: `${groupColor}08`,
        }} />
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 6 }}>
          {group.name}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: `${groupColor}15`, borderRadius: 20,
            padding: '4px 12px',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: groupColor, display: 'inline-block',
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: groupColor }}>
              {athletes.length} atleter
            </span>
          </div>
          {trainings.length > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,0,0,0.05)', borderRadius: 20,
              padding: '4px 12px',
            }}>
              <CalendarDays size={12} color="#64748B" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>
                {trainings.length} kommande pass
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Kommande pass */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Kommande pass
          </h3>
          <Link href={`/groups/${groupId}/planning`} style={{ fontSize: 13, fontWeight: 600, color: groupColor, textDecoration: 'none' }}>
            Se alla →
          </Link>
        </div>

        {trainings.length === 0 ? (
          <div className="glass-card" style={{ padding: '20px 18px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
            Inga schemalagda pass
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {trainings.map((t, i) => (
              <div
                key={t.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderBottom: i < trainings.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${groupColor}12`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CalendarDays size={16} color={groupColor} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{formatDate(t.scheduled_date)}</div>
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  padding: '3px 10px', borderRadius: 9999,
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

      {/* Atleter */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Atleter
          </h3>
          <Link href={`/groups/${groupId}/athletes`} style={{ fontSize: 13, fontWeight: 600, color: groupColor, textDecoration: 'none' }}>
            Se alla →
          </Link>
        </div>

        {athletes.length === 0 ? (
          <div className="glass-card" style={{ padding: '20px 18px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
            Inga atleter i denna grupp
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {previewAthletes.map((a) => (
                <Link
                  key={a.id}
                  href={`/groups/${groupId}/athletes/${a.id}`}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 16,
                    background: `${groupColor}18`,
                    border: `1.5px solid ${groupColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: groupColor }}>
                      {a.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', maxWidth: 56, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.name.split(' ')[0]}
                  </span>
                </Link>
              ))}
              {athletes.length > 4 && (
                <Link
                  href={`/groups/${groupId}/athletes`}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 16,
                    background: 'rgba(0,0,0,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8' }}>+{athletes.length - 4}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>Fler</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
