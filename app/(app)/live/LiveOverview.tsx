'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import ActiveSessionCard, { type LiveSession } from './ActiveSessionCard'
import TodayTrainings, { type TrainingWithGroup } from './TodayTrainings'
import UpcomingTrainings from './UpcomingTrainings'

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#94A3B8',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 12,
    }}>
      {label}
    </div>
  )
}

export default function LiveOverview() {
  const router = useRouter()
  const { profile } = useUser()
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null)
  const [todayTrainings, setTodayTrainings] = useState<TrainingWithGroup[]>([])
  const [upcomingTrainings, setUpcomingTrainings] = useState<TrainingWithGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [ending, setEnding] = useState(false)

  const load = async () => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    if (!profile?.club_id) return

    const [sessionRes, todayRes, upcomingRes] = await Promise.all([
      supabase
        .from('live_sessions')
        .select('*, groups(name, color)')
        .eq('status', 'active')
        .eq('club_id', profile.club_id)
        .eq('coach_id', profile.id)
        .maybeSingle(),
      supabase
        .from('trainings')
        .select('*, groups(name, color)')
        .eq('club_id', profile.club_id)
        .eq('scheduled_date', today)
        .order('created_at'),
      supabase
        .from('trainings')
        .select('*, groups(name, color)')
        .eq('club_id', profile.club_id)
        .gt('scheduled_date', today)
        .order('scheduled_date')
        .limit(10),
    ])

    setActiveSession((sessionRes.data as LiveSession | null) ?? null)
    setTodayTrainings((todayRes.data as TrainingWithGroup[]) ?? [])
    setUpcomingTrainings((upcomingRes.data as TrainingWithGroup[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [profile?.id])

  const handleEndSession = async (session: LiveSession) => {
    setEnding(true)
    const supabase = createClient()
    await supabase
      .from('live_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', session.id)
    setEnding(false)
    setActiveSession(null)
  }

  const handleOpenSession = (session: LiveSession) => {
    router.push(`/live/session/${session.id}`)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#94A3B8', fontSize: 15 }}>
        Laddar…
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 100 }}>

      {/* Page header */}
      <div style={{ padding: '20px 16px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>
          Live
        </h1>
      </div>

      {/* Active Session */}
      <div style={{ padding: '0 16px 28px' }}>
        <SectionHeader label="Aktivt pass" />
        <ActiveSessionCard
          session={activeSession}
          onOpen={handleOpenSession}
          onEnd={handleEndSession}
          ending={ending}
        />
      </div>

      {/* Today */}
      <div style={{ padding: '0 16px 28px' }}>
        <SectionHeader label="Idag" />
        <TodayTrainings
          trainings={todayTrainings}
          onSessionStarted={load}
        />
      </div>

      {/* Upcoming */}
      <div style={{ padding: '0 16px' }}>
        <SectionHeader label="Kommande" />
        <UpcomingTrainings trainings={upcomingTrainings} />
      </div>

    </div>
  )
}
