'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MOCK_SESSION } from '@/lib/context/session'
import { CalendarDays } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getMondayOfWeek, getISOWeekNumber, toDateString } from '@/lib/utils/week'
import WeekNavigator from './WeekNavigator'
import TrainingCard, { type TrainingRow } from './TrainingCard'

// ─── Component ────────────────────────────────────────────────────────────────

export default function LiveWeekView() {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0)
  const [trainings, setTrainings] = useState<TrainingRow[]>([])
  const [loading, setLoading] = useState(true)

  const monday = getMondayOfWeek(weekOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const weekNumber = getISOWeekNumber(monday)

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('trainings')
      .select('id, title, status, training_type, scheduled_date, group_id, groups(name, color)')
      .eq('club_id', MOCK_SESSION.clubId)
      .gte('scheduled_date', toDateString(monday))
      .lte('scheduled_date', toDateString(sunday))
      .order('scheduled_date')
      .order('created_at')
    const mapped = (data ?? []).map((t: any) => ({
      ...t,
      mode: (t.training_type ?? 'training') as TrainingRow['mode'],
    }))
    setTrainings(mapped as TrainingRow[])
    setLoading(false)
  }

  useEffect(() => { load() }, [weekOffset])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em', marginBottom: 16 }}>
          Live
        </h1>
        <WeekNavigator
          weekOffset={weekOffset}
          weekNumber={weekNumber}
          onPrev={() => setWeekOffset(o => o - 1)}
          onNext={() => setWeekOffset(o => o + 1)}
        />
      </div>

      {/* Training list */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8', fontSize: 15 }}>
            Laddar…
          </div>
        ) : trainings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'rgba(13,115,119,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <CalendarDays size={28} color="#0D7377" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Inga pass schemalagda denna vecka
            </p>
            <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>
              Gå till Planning och sätt ett datum på dina pass.
            </p>
            <button
              onClick={() => router.push('/planning')}
              className="btn-primary"
              style={{ padding: '10px 20px', fontSize: 14, cursor: 'pointer' }}
            >
              Öppna Planning
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trainings.map(t => (
              <TrainingCard
                key={t.id}
                training={t}
                onSessionStarted={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
