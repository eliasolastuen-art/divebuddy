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

  // Om användaren är coach/admin → tillbaka till dashboard
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

      // Hämta athlete-rad länkad till profilen
      const { data: athleteData } = await supabase
        .from('athletes')
        .select('id, name, group_id, groups(name, color)')
        .eq('profile_id', profile!.id)
        .single()

      if (!athleteData) {
        setDataLoading(false)
        return
      }

      const groupData = athleteData.groups as { name: string; color: string } | null
      setAthlete({
        id: athleteData.id,
        name: athleteData.name,
        group_id: athleteData.group_id,
        group_name: groupData?.name ?? null,
        group_color: groupData?.color ?? null,
      })

      // Hopp idag – aktiva sessioner i gruppen
      if (athleteData.group_id) {
        const today = new Date().toISOString().split('T')[0]
        const { data: activeSessions } = await supabase
          .from('live_sessions')
          .select('id')
          .eq('group_id', athleteData.group_id)
          .eq('status', 'active')
          .gte('started_at', today)

        if (activeSessions?.length) {
          const sessionIds = activeSessions.map(s => s.id)
          const { data: dives } = await supabase
            .from('live_dive_log')
            .select('id, dive_name, dive_code, dd, status')
            .eq('athlete_id', athleteData.id)
            .in('session_id', sessionIds)
            .order('created_at', { ascending: true })

          setTodayDives((dives ?? []) as TodayDive[])
        }
      }

      // Senaste 5 sessioner
      const { data: sessions } = await supabase
        .from('live_sessions')
        .select('id, started_at, group_id, groups(name)')
        .eq('status', 'ended')
        .eq('club_id', profile!.club_id!)
        .order('started_at', { ascending: false })
        .limit(5)

      if (sessions) {
        const sessionIds = sessions.map(s => s.id)
        const { data: diveCounts } = await supabase
          .from('live_dive_log')
          .select('session_id')
          .eq('athlete_id', athleteData.id)
          .in('session_id', sessionIds)

        const countMap: Record<string, number> = {}
        diveCounts?.forEach(d => {
          countMap[d.session_id] = (countMap[d.session_id] ?? 0) + 1
        })

        setRecentSessions(sessions.map(s => ({
          id: s.id,
          started_at: s.started_at,
          group_name: (s.groups as { name: string } | null)?.name ?? null,
          dive_count: countMap[s.id] ?? 0,
        })))
      }

      // Totalt antal hopp
      const { count } = await supabase
        .from('live_dive_log')
        .select('id', { count: 'exact', head: true })
        .eq('athlete_id', athleteData.id)

      setTotalDives(count ?? 0)
      setDataLoading(false)
    }

    load()
  }, [profile, loading])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'God morgon'
    if (h < 18) return 'God dag'
    return 'God kväll'
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  if (loading || dataLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(13,115,119,0.2)', borderTopColor: '#0D7377', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!athlete) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass-card" style={{ maxWidth: 360, width: '100%', padding: 32, textAlign: 'center' }}>
          <p style={{ color: '#64748B', fontSize: 15 }}>Din atletprofil är inte länkad ännu. Kontakta din coach.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-bg)', paddingBottom: 40 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0D7377 0%, #14A085 100%)',
        padding: '48px 20px 32px',
        color: '#fff',
      }}>
        <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>{greeting()},</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
          {athlete.name}
        </h1>
        {athlete.group_name && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.15)', borderRadius: 20,
            padding: '4px 12px', fontSize: 13, fontWeight: 600,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: athlete.group_color ?? '#fff',
              display: 'inline-block',
            }} />
            {athlete.group_name}
          </div>
        )}
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480, margin: '0 auto' }}>

        {/* Statistik-kort */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="glass-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Waves size={16} color="#0D7377" />
              <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Totalt</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>{totalDives}</p>
            <p style={{ fontSize: 12, color: '#64748B' }}>hopp loggade</p>
          </div>
          <div className="glass-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Award size={16} color="#0D7377" />
              <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pass</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>{recentSessions.length}</p>
            <p style={{ fontSize: 12, color: '#64748B' }}>senaste pass</p>
          </div>
        </div>

        {/* Hopp idag */}
        {todayDives.length > 0 && (
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <TrendingUp size={16} color="#0D7377" />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Mina hopp idag</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayDives.map(dive => (
                <div key={dive.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: dive.status === 'done' ? 'rgba(13,115,119,0.06)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 10,
                  border: '1px solid',
                  borderColor: dive.status === 'done' ? 'rgba(13,115,119,0.15)' : 'rgba(0,0,0,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: dive.status === 'done' ? '#0D7377' : 'rgba(0,0,0,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {dive.status === 'done' && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                        {dive.dive_code ?? '—'} {dive.dive_name ? `· ${dive.dive_name}` : ''}
                      </p>
                      {dive.dd && <p style={{ fontSize: 12, color: '#64748B' }}>DD {dive.dd}</p>}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: dive.status === 'done' ? '#0D7377' : '#94A3B8',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {dive.status === 'done' ? 'Klar' : 'Väntar'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Senaste pass */}
        {recentSessions.length > 0 && (
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Waves size={16} color="#0D7377" />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Senaste pass</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentSessions.map(session => (
                <div key={session.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                      {formatDate(session.started_at)}
                    </p>
                    {session.group_name && (
                      <p style={{ fontSize: 12, color: '#64748B' }}>{session.group_name}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: '#0D7377',
                      background: 'rgba(13,115,119,0.08)', borderRadius: 8, padding: '2px 8px',
                    }}>
                      {session.dive_count} hopp
                    </span>
                    <ChevronRight size={14} color="#CBD5E1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!todayDives.length && !recentSessions.length && (
          <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
            <Waves size={32} color="rgba(13,115,119,0.3)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Inga pass än</p>
            <p style={{ fontSize: 13, color: '#64748B' }}>Dina hopp och pass visas här när coach startar ett träningspass.</p>
          </div>
        )}
      </div>
    </div>
  )
}
