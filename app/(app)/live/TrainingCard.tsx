'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MOCK_SESSION } from '@/lib/context/session'
import type { TrainingMode } from '@/types'

export interface TrainingRow {
  id: string
  title: string
  status: 'draft' | 'published' | 'completed'
  mode: TrainingMode
  scheduled_date?: string
  group_id?: string
  groups?: { name: string; color: string | null }
}

const MODE_STYLE: Record<TrainingMode, { bg: string; text: string; label: string }> = {
  training:    { bg: 'rgba(59,130,246,0.1)',  text: '#3B82F6', label: 'Training' },
  test:        { bg: 'rgba(249,115,22,0.1)',  text: '#F97316', label: 'Test' },
  competition: { bg: 'rgba(99,102,241,0.1)', text: '#6366F1', label: 'Competition' },
}

const DAY_NAMES = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']

interface Props {
  training: TrainingRow
  onSessionStarted: () => void
}

export default function TrainingCard({ training, onSessionStarted }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const mode = training.mode ?? 'training'
  const ms = MODE_STYLE[mode]
  const groupName = training.groups?.name
  const groupColor = training.groups?.color ?? '#0D7377'

  const scheduledDate = training.scheduled_date
    ? new Date(training.scheduled_date + 'T12:00:00')
    : null
  const dayLabel = scheduledDate ? DAY_NAMES[scheduledDate.getDay()] : null
  const dateLabel = scheduledDate
    ? scheduledDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'numeric' })
    : null

  const handleCardClick = () => {
    router.push(`/planning/${training.id}`)
  }

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
    setLoading(false)
    if (error || !data) {
      console.error('Failed to start session:', error)
      return
    }
    onSessionStarted()
    router.push(`/live/session/${data.id}`)
  }

  const handleLogDives = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/live/session/${training.id}`)
  }

  const handleOpenCompetition = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push('/competition')
  }

  const handleOpenPlanning = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/planning/${training.id}`)
  }

  return (
    <div
      className="glass-card"
      onClick={handleCardClick}
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        borderLeft: `3px solid ${groupColor}`,
        cursor: 'pointer',
        transition: 'opacity 0.15s ease',
      }}
    >
      <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Day + date */}
        <div style={{ flexShrink: 0, width: 52 }}>
          {dayLabel && (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>
              {dayLabel}
            </div>
          )}
          {dateLabel && (
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>
              {dateLabel}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 6, letterSpacing: '-0.01em' }}>
            {training.title}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Mode badge */}
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: ms.bg, color: ms.text,
              padding: '3px 9px', borderRadius: 9999,
            }}>
              {ms.label}
            </span>
            {/* Group */}
            {groupName && (
              <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                {groupName}
              </span>
            )}
            {/* Status (only if not published) */}
            {training.status === 'draft' && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: 'rgba(100,116,139,0.1)', color: '#64748B',
                padding: '3px 9px', borderRadius: 9999,
              }}>
                Utkast
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        <div style={{ flexShrink: 0 }}>
          {training.status !== 'published' ? (
            <button
              onClick={handleOpenPlanning}
              style={{
                padding: '8px 12px', borderRadius: 12,
                background: 'rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.08)',
                fontSize: 13, fontWeight: 600, color: '#475569',
                cursor: 'pointer',
              }}
            >
              Öppna
            </button>
          ) : mode === 'training' ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="btn-primary"
              style={{
                padding: '8px 14px', borderRadius: 12,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Startar…' : 'Starta'}
            </button>
          ) : mode === 'test' ? (
            <button
              onClick={handleLogDives}
              style={{
                padding: '8px 14px', borderRadius: 12,
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.2)',
                fontSize: 13, fontWeight: 700, color: '#F97316',
                cursor: 'pointer',
              }}
            >
              Logga hopp
            </button>
          ) : (
            <button
              onClick={handleOpenCompetition}
              style={{
                padding: '8px 14px', borderRadius: 12,
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                fontSize: 13, fontWeight: 700, color: '#6366F1',
                cursor: 'pointer',
              }}
            >
              Öppna tävling
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
