'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { MOCK_SESSION } from '@/lib/context/session'
import type { SessionState, TrainingMode } from '@/types'

const MODE_LABEL: Record<TrainingMode, string> = {
  training: 'Träning',
  test: 'Test',
  competition: 'Tävling',
}

const MODE_COLOR: Record<TrainingMode, string> = {
  training: '#3B82F6',
  test: '#F97316',
  competition: '#6366F1',
}

export interface CalendarTraining {
  id: string
  title: string
  status: 'draft' | 'published' | 'completed'
  mode: TrainingMode
  scheduled_date?: string
  group_id?: string
  start_time?: string
  end_time?: string
  is_active: boolean
  started_at?: string
  ended_at?: string
  sessionState: SessionState
  groups?: { name: string; color: string | null }
}

interface Props {
  training: CalendarTraining
  compact?: boolean
  onRefresh: () => void
}

export default function SessionCard({ training, compact = false, onRefresh }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: training.id,
    data: { training },
  })

  const groupColor = training.groups?.color ?? '#0D7377'
  const mode = training.mode ?? 'training'
  const state = training.sessionState

  // ── Start session ──────────────────────────────────────────────────────────

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('live_sessions')
      .insert({
        club_id: MOCK_SESSION.clubId,
        coach_id: MOCK_SESSION.coachId,
        group_id: training.group_id ?? null,
        training_id: training.id,
        status: 'active',
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Failed to start session:', error)
      setLoading(false)
      return
    }

    await supabase
      .from('trainings')
      .update({ is_active: true, started_at: new Date().toISOString() })
      .eq('id', training.id)

    setLoading(false)
    onRefresh()
    router.push(`/live/session/${data.id}`)
  }

  // ── Open active session ────────────────────────────────────────────────────

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('live_sessions')
      .select('id')
      .eq('training_id', training.id)
      .eq('status', 'active')
      .limit(1)
      .single()
    setLoading(false)
    if (data) router.push(`/live/session/${data.id}`)
  }

  // ── Drag style ─────────────────────────────────────────────────────────────

  const dragStyle = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 50 : 'auto',
  } as React.CSSProperties

  // ── LIVE pulse animation ───────────────────────────────────────────────────

  const liveGlow = state === 'live' ? {
    boxShadow: '0 0 0 2px #0D7377, 0 4px 20px rgba(13,115,119,0.25)',
  } : {}

  return (
    <div
      ref={setNodeRef}
      style={{
        ...dragStyle,
        borderRadius: 12,
        overflow: 'hidden',
        background: state === 'completed' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,0,0,0.07)',
        opacity: state === 'completed' ? 0.6 : (isDragging ? 0.45 : 1),
        marginBottom: 6,
        ...liveGlow,
        touchAction: 'none',
      }}
      {...listeners}
      {...attributes}
    >
      {/* Group color bar */}
      <div style={{ height: 3, background: groupColor }} />

      <div style={{ padding: compact ? '8px 10px' : '10px 12px' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
          <div style={{
            fontSize: compact ? 12 : 13,
            fontWeight: 700,
            color: state === 'completed' ? '#94A3B8' : '#0F172A',
            lineHeight: 1.3,
            flex: 1,
            textDecoration: state === 'completed' ? 'line-through' : 'none',
          }}>
            {training.title}
          </div>

          {/* State badge */}
          {state === 'live' && (
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
              background: '#DC2626', color: 'white',
              padding: '2px 7px', borderRadius: 9999, flexShrink: 0,
            }}>
              ● LIVE
            </span>
          )}
          {state === 'completed' && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: 'rgba(22,163,74,0.1)', color: '#16A34A',
              padding: '2px 7px', borderRadius: 9999, flexShrink: 0,
            }}>
              ✓ Klart
            </span>
          )}
        </div>

        {/* Meta row */}
        {!compact && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {/* Mode badge */}
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: `${MODE_COLOR[mode]}18`, color: MODE_COLOR[mode],
              padding: '2px 7px', borderRadius: 9999,
            }}>
              {MODE_LABEL[mode]}
            </span>
            {/* Time chip */}
            {(training.start_time || training.end_time) && (
              <span style={{ fontSize: 10, color: '#64748B', fontWeight: 500 }}>
                {training.start_time}{training.end_time ? `–${training.end_time}` : ''}
              </span>
            )}
            {/* Group name */}
            {training.groups?.name && (
              <span style={{ fontSize: 10, color: '#64748B', fontWeight: 500 }}>
                {training.groups.name}
              </span>
            )}
          </div>
        )}

        {/* Action button — stop drag propagation */}
        {state === 'planned' && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={handleStart}
            disabled={loading}
            style={{
              width: '100%', padding: '6px 0',
              background: 'linear-gradient(135deg, #0D7377, #0a5c60)',
              color: 'white', border: 'none', borderRadius: 8,
              fontSize: 12, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Startar…' : 'Starta'}
          </button>
        )}
        {state === 'live' && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={handleOpen}
            disabled={loading}
            style={{
              width: '100%', padding: '6px 0',
              background: 'rgba(13,115,119,0.1)',
              border: '1px solid rgba(13,115,119,0.3)',
              color: '#0D7377', borderRadius: 8,
              fontSize: 12, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? '…' : 'Öppna'}
          </button>
        )}
      </div>
    </div>
  )
}
