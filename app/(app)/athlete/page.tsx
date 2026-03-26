
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Waves, ChevronRight, TrendingUp, Award } from 'lucide-react'
import { useUser } from '@/lib/context/user'
import { createClient } from '@/lib/supabase/client'

interface AthleteRecord {
  id: string
  name: string
  group_id: string | null
  group_name: string | null
  group_color: string | null
}

interface RecentSession {
  id: string
  started_at: string
  group_name: string | null
  dive_count: number
}

interface TodayDive {
  id: string
  dive_name: string | null
  dive_code: string | null
  dd: number | null
  status: 'pending' | 'done'
}

export default function AthletePage() {
  const { profile, roles, loading } = useUser()
  const router = useRouter()
  const [athlete, setAthlete] = useState<AthleteRecord | null>(null)
  const [todayDives, setTodayDives] = useState<TodayDive[]>([])
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [totalDives, setTotalDives] = useState(0)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (loading) return
    if (roles.includes('coach') || roles.includes('admin')) {
      router.replace('/dashboard')
    }
  }, [roles, loading, router])

  useEffect(() => {
    if (!profile?.id || loading) return

    async function load() {
      const supabase = createClient()

      const { data: athleteData } = await supabase
        .from('athletes')
        .select('id, name, group_id, groups(name, color)')
        .eq('profile_id', profile!.id)
        .single()

      if (!athleteData) {
        setDataLoading(false)
        return
      }

      const rawGroup = athleteData.groups
      let groupName: string | null = null
      let groupColor: string | null = null

      if (rawGroup && !Array.isArray(rawGroup)) {
        const g = rawGroup as { name: string; color: string }
        groupName = g.name ?? null
        groupColor = g.color ?? null
      } else if (Array.isArray(rawGroup) && rawGroup.length > 0) {
        groupName = (rawGroup[0] as { name: string; color: string }).name ?? null
        groupColor = (rawGroup[0] as { name: string; color: string }).color ?? null
      }

      setAthlete({
        id: athleteData.id,
        name: athleteData.name,
        group_id: athleteData.group_id,
        group_name: groupName,
        group_color: groupColor,
      })

      if (athleteData.group_id) {
        const today = new Date().toISOString().split('T')[0]
        const { data: activeSessions } = await supabase
          .from('live_sessions')
          .select('id')
          .eq('group_id', athleteData.group_id)
          .eq('status', 'active')
          .gte('started_at', today)

        if (activeSessions?.length) {
          const sessionIds = activeSessions.map((s: { id: string }) => s.id)
          const { data: dives } = await supabase
            .from('live_dive_log')
            .select('id, dive_name, dive_code, dd, status')
            .eq('athlete_id', athleteData.id)
            .in('session_id', sessionIds)
            .order('created_at', { ascending: true })

          setTodayDives((dives ?? []) as TodayDive[])
        }
      }

      const { data: sessions } = await supabase
        .from('live_sessions')
        .select('id, started_at, group_id')
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .limit(5)

      if (sessions?.length) {
        const sessionIds = sessions.map((s: { id: string }) => s.id)
        const { count } = await supabase
          .from('live_dive_log')
          .select('id', { count: 'exact', head: true })
          .eq('athlete_id', athleteData.id)
          .in('session_id', sessionIds)

        setTotalDives(count ?? 0)

        const { data: diveCounts } = await supabase
          .from('live_dive_log')
          .select('session_id')
          .eq('athlete_id', athleteData.id)
          .in('session_id', sessionIds)

        const countMap: Record<string, number> = {}
        diveCounts?.forEach((d: { session_id: string }) => {
          countMap[d.session_id] = (countMap[d.session_id] ?? 0) + 1
        })

        setRecentSessions(
          sessions.map((s: { id: string; started_at: string; group_id: string | null }) => ({
            id: s.id,
            started_at: s.started_at,
            group_name: null,
            dive_count: countMap[s.id] ?? 0,
          }))
        )
      }

      setDataLoading(false)
    }

    load()
  }, [profile?.id, loading])

  if (loading || dataLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: 28, height: 28, border: '3px solid rgba(13,115,119,0.2)', borderTopColor: '#0D7377', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!athlete) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Waves size={40} color="rgba(13,115,119,0.3)" style={{ margin: '0 auto 16px' }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>Ingen atletprofil hittad</p>
        <p style={{ fontSize: 14, color: '#94A3B8' }}>Kontakta din coach för att bli tillagd.</p>
      </div>
    )
  }

  const groupColor = athlete.group_color || '#0D7377'

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${groupColor} 0%, ${groupColor}cc 100%)`,
        borderRadius: 20, padding: '24px 20px', marginBottom: 20, color: 'white',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.7, marginBottom: 4 }}>
          ATLET
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>
          {athlete.name}
        </div>
        {athlete.group_name && (
          <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 500 }}>
            {athlete.group_name}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div className="glass-card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={18} color={groupColor} strokeWidth={2} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>{totalDives}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Totala hopp</div>
            </div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Award size={18} color={groupColor} strokeWidth={2} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>{recentSessions.length}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Pass</div>
            </div>
          </div>
        </div>
      </div>

      {/* Today */}
      {todayDives.length > 0 && (
        <div className="glass-card" style={{ padding: '16px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Idag
          </div>
          {todayDives.map(dive => (
            <div key={dive.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dive.status === 'done' ? '#16A34A' : '#94A3B8', flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', flex: 1 }}>{dive.dive_name ?? dive.dive_code ?? '—'}</span>
              {dive.dd && <span style={{ fontSize: 12, color: '#94A3B8' }}>DD {dive.dd}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="glass-card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Senaste pass
          </div>
          {recentSessions.map((session, i) => (
            <div key={session.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < recentSessions.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                  {new Date(session.started_at).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{session.dive_count} hopp</div>
              </div>
              <ChevronRight size={16} color="#CBD5E1" strokeWidth={2.5} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}