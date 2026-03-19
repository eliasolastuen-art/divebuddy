'use client'
import { useEffect, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { MOCK_SESSION } from '@/lib/context/session'
import {
  getMondayOfWeek, getISOWeekNumber, getDaysOfWeek,
  toDateString, getSessionState,
} from '@/lib/utils/week'
import { Plus, CalendarDays } from 'lucide-react'
import type { PlanningFolder } from '@/types'
import WeekNavigator from '../live/WeekNavigator'
import TrainingBuilder from './TrainingBuilder'
import DayColumn from './DayColumn'
import SessionCard, { type CalendarTraining } from './SessionCard'

// ─── Types ────────────────────────────────────────────────────────────────────

type RawTraining = {
  id: string
  title: string
  status: 'draft' | 'published' | 'completed'
  mode: 'training' | 'test' | 'competition'
  training_type: string
  scheduled_date?: string
  group_id?: string
  start_time?: string
  end_time?: string
  is_active: boolean
  started_at?: string
  ended_at?: string
  groups?: { name: string; color: string | null }
}

function toCalendarTraining(t: RawTraining): CalendarTraining {
  return {
    ...t,
    sessionState: getSessionState(t),
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarWeekView() {
  const [weekOffset, setWeekOffset]       = useState(0)
  const [trainings, setTrainings]         = useState<CalendarTraining[]>([])
  const [unscheduled, setUnscheduled]     = useState<CalendarTraining[]>([])
  const [loading, setLoading]             = useState(true)
  const [folders, setFolders]             = useState<PlanningFolder[]>([])
  const [showBuilder, setShowBuilder]     = useState(false)

  const monday     = getMondayOfWeek(weekOffset)
  const sunday     = getDaysOfWeek(monday)[6]
  const weekNumber = getISOWeekNumber(monday)
  const days       = getDaysOfWeek(monday)
  const todayStr   = toDateString(new Date())

  // ── Data ─────────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true)
    const supabase = createClient()

    const [{ data: f }, { data: week }, { data: unsched }] = await Promise.all([
      supabase.from('planning_folders').select('*').order('sort_order'),
      supabase
        .from('trainings')
        .select('id, title, status, mode, training_type, scheduled_date, group_id, start_time, end_time, is_active, started_at, ended_at, groups(name, color)')
        .eq('club_id', MOCK_SESSION.clubId)
        .gte('scheduled_date', toDateString(monday))
        .lte('scheduled_date', toDateString(sunday))
        .order('scheduled_date')
        .order('created_at'),
      supabase
        .from('trainings')
        .select('id, title, status, mode, training_type, scheduled_date, group_id, start_time, end_time, is_active, started_at, ended_at, groups(name, color)')
        .eq('club_id', MOCK_SESSION.clubId)
        .eq('status', 'draft')
        .is('scheduled_date', null)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    if (f) setFolders(f)
    setTrainings(((week ?? []) as unknown as RawTraining[]).map(toCalendarTraining))
    setUnscheduled(((unsched ?? []) as unknown as RawTraining[]).map(toCalendarTraining))
    setLoading(false)
  }

  useEffect(() => { load() }, [weekOffset])

  // ── DnD ──────────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const training = active.data.current?.training as CalendarTraining
    const newDate  = over.id as string

    if (training.scheduled_date === newDate) return

    // Optimistic update
    setTrainings(prev => prev.map(t => t.id === training.id ? { ...t, scheduled_date: newDate } : t))
    setUnscheduled(prev => prev.filter(t => t.id !== training.id))

    createClient()
      .from('trainings')
      .update({ scheduled_date: newDate })
      .eq('id', training.id)
      .then(({ error }) => { if (error) load() })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 100 }}>

        {/* Header */}
        <div style={{ padding: '20px 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>
              Planning
            </h1>
            <button
              onClick={() => setShowBuilder(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #0D7377, #0a5c60)',
                color: 'white', border: 'none', borderRadius: 12,
                padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <Plus size={15} strokeWidth={2.5} />
              Nytt pass
            </button>
          </div>

          <WeekNavigator
            weekOffset={weekOffset}
            weekNumber={weekNumber}
            onPrev={() => setWeekOffset(o => o - 1)}
            onNext={() => setWeekOffset(o => o + 1)}
          />
        </div>

        {/* Unscheduled drafts strip */}
        {unscheduled.length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              Ej schemalagda utkast
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {unscheduled.map(t => (
                <div key={t.id} style={{ minWidth: 140, flexShrink: 0 }}>
                  <SessionCard training={t} compact onRefresh={load} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8', fontSize: 14 }}>
            Laddar…
          </div>
        ) : (
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            gap: 10,
            padding: '0 16px 16px',
            scrollSnapType: 'x mandatory',
          }}>
            {days.map((day, i) => {
              const ds = toDateString(day)
              const dayTrainings = trainings.filter(t => t.scheduled_date === ds)
              return (
                <DayColumn
                  key={ds}
                  date={day}
                  dayIndex={i}
                  trainings={dayTrainings}
                  isToday={ds === todayStr}
                  onRefresh={load}
                />
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && trainings.length === 0 && unscheduled.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 20px 40px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 18,
              background: 'rgba(13,115,119,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <CalendarDays size={24} color="#0D7377" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Inga pass denna veckan
            </p>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>
              Skapa ett nytt pass med knappen ovan.
            </p>
          </div>
        )}

        {/* TrainingBuilder modal */}
        {showBuilder && (
          <TrainingBuilder
            folders={folders}
            onClose={() => setShowBuilder(false)}
            onSaved={() => { setShowBuilder(false); load() }}
          />
        )}
      </div>
    </DndContext>
  )
}
