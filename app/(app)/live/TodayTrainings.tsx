'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MOCK_SESSION } from '@/lib/context/session'
import { CalendarDays } from 'lucide-react'

export interface TrainingWithGroup {
  id: string
  title: string
  status: 'draft' | 'published' | 'completed'
  scheduled_date?: string
  group_id?: string
  groups?: { name: string; color: string | null }
}

const STATUS_STYLE = {
  draft:     { bg: 'rgba(100,116,139,0.1)', text: '#64748B', label: 'Utkast' },
  published: { bg: 'rgba(13,115,119,0.1)',  text: '#0D7377', label: 'Publicerad' },
  completed: { bg: 'rgba(22,163,74,0.1)',   text: '#16A34A', label: 'Genomförd' },
} as const

interface Props {
  trainings: TrainingWithGroup[]
  onSessionStarted: () => void
}

export default function TodayTrainings({ trainings, onSessionStarted }: Props) {
  const router = useRouter()
  const [starting, setStarting] = useState<string | null>(null)

  const handleStart = async (training: TrainingWithGroup) => {
    setStarting(training.id)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('live_sessions')
      .insert({
        club_id: MOCK_SESSION.clubId,
        coach_id: MOCK_SESSION.coachId,
        group_id: training.group_id ?? null,
        status: 'active',
      })
      .select()
      .single()
    setStarting(null)
    if (error || !data) {
      console.error('Failed to start session:', error)
      return
    }
    onSessionStarted()
    router.push(`/live/session/${data.id}`)
  }

  if (trainings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '28px 20px' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: 'rgba(13,115,119,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <CalendarDays size={22} color="#0D7377" strokeWidth={1.5} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 3 }}>
          Inga pass idag
        </p>
        <p style={{ fontSize: 13, color: '#94A3B8' }}>
          Planera ett träningspass i Planning.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {trainings.map(t => {
        const s = STATUS_STYLE[t.status] ?? STATUS_STYLE.draft
        const groupName = t.groups?.name
        const isStarting = starting === t.id

        return (
          <div
            key={t.id}
            className="glass-card"
            style={{
              padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
              borderRadius: 18,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 6, letterSpacing: '-0.01em' }}>
                {t.title}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  background: s.bg, color: s.text,
                  padding: '3px 9px', borderRadius: 9999,
                }}>
                  {s.label}
                </span>
                {groupName && (
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                    {groupName}
                  </span>
                )}
              </div>
            </div>

            {t.status === 'published' ? (
              <button
                onClick={() => handleStart(t)}
                disabled={isStarting || starting !== null}
                className="btn-primary"
                style={{
                  flexShrink: 0,
                  padding: '8px 14px', borderRadius: 12,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  opacity: starting !== null && !isStarting ? 0.5 : 1,
                }}
              >
                {isStarting ? 'Startar…' : 'Starta'}
              </button>
            ) : (
              <button
                onClick={() => router.push(`/planning/${t.id}`)}
                style={{
                  flexShrink: 0,
                  padding: '8px 12px', borderRadius: 12,
                  background: 'rgba(0,0,0,0.05)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  fontSize: 13, fontWeight: 600, color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Öppna
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
