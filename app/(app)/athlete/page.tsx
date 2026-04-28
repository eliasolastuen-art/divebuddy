
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Waves } from 'lucide-react'
import { useUser } from '@/lib/context/user'
import { createClient } from '@/lib/supabase/client'

// ── Interfaces ────────────────────────────────────────────────
interface AthleteRecord {
  id: string
  name: string
  group_id: string | null
  group_name: string | null
  group_color: string | null
}

interface UpcomingTraining {
  id: string
  title: string
  scheduled_date: string
  group_name: string | null
}

interface RecentSessionLog {
  id: string
  started_at: string
  training_title: string | null
}

interface AssignedDive {
  id: string
  custom_name: string | null
  library_item_name: string | null
  library_item_code: string | null
  library_item_dd: number | null
}

// ── Helpers ───────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'God morgon'
  if (h < 18) return 'God dag'
  return 'God kväll'
}

function formatTodaySwedish(): string {
  return new Date()
    .toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^./, c => c.toUpperCase())
}

function formatSwedishDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0]
}

// ── Component ─────────────────────────────────────────────────
export default function AthletePage() {
  const { profile, activeRole, loading } = useUser()
  const router = useRouter()
  const schemaSectionRef = useRef<HTMLDivElement>(null)

  const [athlete, setAthlete]                     = useState<AthleteRecord | null>(null)
  const [clubName, setClubName]                   = useState<string | null>(null)
  const [upcomingTrainings, setUpcomingTrainings] = useState<UpcomingTraining[]>([])
  const [recentSessions, setRecentSessions]       = useState<RecentSessionLog[]>([])
  const [assignedDives, setAssignedDives]         = useState<AssignedDive[]>([])
  const [dataLoading, setDataLoading]             = useState(true)

  // Role check — unchanged
  useEffect(() => {
    if (loading) return
    if (activeRole !== 'athlete') {
      router.replace('/dashboard')
    }
  }, [activeRole, loading, router])

  useEffect(() => {
    if (!profile?.id || loading) return

    async function load() {
      const supabase = createClient()

      // 1. Athlete + group (existing pattern)
      const { data: athleteData } = await supabase
        .from('athletes')
        .select('id, name, group_id, groups(name, color)')
        .eq('profile_id', profile!.id)
        .single()

      if (!athleteData) {
        setDataLoading(false)
        return
      }

      // Normalize group fields (existing pattern)
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

      const athleteRecord: AthleteRecord = {
        id: athleteData.id,
        name: athleteData.name,
        group_id: athleteData.group_id,
        group_name: groupName,
        group_color: groupColor,
      }
      setAthlete(athleteRecord)

      const today = new Date().toISOString().split('T')[0]

      // 2. Parallel fetch
      const [clubRes, trainingsRes, sessionsRes, assignedDivesRes] = await Promise.all([

        profile!.club_id
          ? supabase.from('clubs').select('name').eq('id', profile!.club_id).single()
          : Promise.resolve({ data: null }),

        athleteData.group_id
          ? supabase
              .from('trainings')
              .select('id, title, scheduled_date, groups(name)')
              .eq('group_id', athleteData.group_id)
              .eq('status', 'published')
              .gte('scheduled_date', today)
              .order('scheduled_date')
              .limit(3)
          : Promise.resolve({ data: [] }),

        supabase
          .from('live_sessions')
          .select('id, started_at, training_id, trainings(title)')
          .eq('status', 'completed')
          .order('started_at', { ascending: false })
          .limit(5),

        (async () => {
          try {
            const { data } = await supabase
              .from('training_block_items')
              .select('id, custom_name, library_items(name, code, dd)')
              .eq('assigned_athlete_id', athleteRecord.id)
              .limit(20)
            return { data: data ?? [] }
          } catch {
            return { data: [] }
          }
        })(),
      ])

      if (clubRes.data) setClubName((clubRes.data as { name: string }).name)

      if (trainingsRes.data) {
        setUpcomingTrainings(
          (trainingsRes.data as any[]).map(t => ({
            id: t.id,
            title: t.title,
            scheduled_date: t.scheduled_date,
            group_name: Array.isArray(t.groups) ? (t.groups[0]?.name ?? null) : (t.groups?.name ?? null),
          }))
        )
      }

      if (sessionsRes.data?.length) {
        setRecentSessions(
          (sessionsRes.data as any[]).slice(0, 3).map(s => ({
            id: s.id,
            started_at: s.started_at,
            training_title: Array.isArray(s.trainings) ? (s.trainings[0]?.title ?? null) : (s.trainings?.title ?? null),
          }))
        )
      }

      const rawDives = (assignedDivesRes.data ?? []) as any[]
      setAssignedDives(
        rawDives.map(d => {
          const lib = Array.isArray(d.library_items) ? d.library_items[0] : d.library_items
          return {
            id: d.id,
            custom_name: d.custom_name ?? null,
            library_item_name: lib?.name ?? null,
            library_item_code: lib?.code ?? null,
            library_item_dd: lib?.dd ?? null,
          }
        })
      )

      setDataLoading(false)
    }

    load()
  }, [profile?.id, loading])

  // ── Loading ───────────────────────────────────────────────
  if (loading || dataLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: 28, height: 28, border: '3px solid rgba(13,115,119,0.2)', borderTopColor: '#0D7377', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  // ── No athlete ────────────────────────────────────────────
  if (!athlete) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Waves size={40} color="rgba(13,115,119,0.3)" style={{ margin: '0 auto 16px' }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>Ingen atletprofil hittad</p>
        <p style={{ fontSize: 14, color: '#94A3B8' }}>Kontakta din coach för att bli tillagd.</p>
      </div>
    )
  }

  const firstName = athlete.name.split(' ')[0]
  const phases = ['Pre', 'Tech', 'Prep', 'Comp', 'Rec']
  const activeIndex = 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

      {/* ── Hero Header ──────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, #0F172A, #1e293b)',
        padding: '20px 20px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Blobs */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 30, right: 80, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          {clubName && (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12 }}>
              {clubName}
            </div>
          )}
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500, margin: 0 }}>
            {getGreeting()},
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: '-0.04em', margin: '0 0 4px', lineHeight: 1.1 }}>
            {firstName}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            {formatTodaySwedish()}
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              onClick={() => router.push('/athlete/session')}
              style={{ background: 'white', color: '#0F172A', borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', flexGrow: 1 }}
            >
              ▶ Starta pass
            </button>
            <button
              onClick={() => schemaSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', flexGrow: 1 }}
            >
              📅 Schema
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div style={{ padding: '0 16px', maxWidth: 520, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 20 }}>

        {/* ── Season Progress ──────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: 20, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Säsongsresa</span>
            <span style={{ background: '#0D7377', color: 'white', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
              Comp prep
            </span>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ position: 'relative', height: 4, background: '#E2E8F0', borderRadius: 2, overflow: 'visible' }}>
              {/* Filled bar */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${(activeIndex / (phases.length - 1)) * 100}%`,
                background: '#0D7377', borderRadius: 2,
              }} />
              {/* Dots */}
              {phases.map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  top: -6,
                  left: `${(i / (phases.length - 1)) * 100}%`,
                  transform: 'translateX(-50%)',
                  width: 16, height: 16, borderRadius: '50%',
                  background: i <= activeIndex ? '#0D7377' : '#E2E8F0',
                  boxShadow: i === activeIndex ? '0 0 0 3px rgba(13,115,119,0.2)' : 'none',
                }} />
              ))}
            </div>
            {/* Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              {phases.map((phase, i) => (
                <span key={i} style={{
                  fontSize: 11,
                  fontWeight: i === activeIndex ? 700 : 600,
                  color: i === activeIndex ? '#0D7377' : '#94A3B8',
                }}>
                  {phase}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Upcoming Sessions ────────────────────────────────── */}
        <div ref={schemaSectionRef}>
          <div className="text-label" style={{ marginBottom: 10 }}>Kommande pass</div>

          {upcomingTrainings.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 16, paddingBottom: 8 }}>
              <div style={{ fontSize: 28 }}>🌊</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: '8px 0 4px' }}>
                Inga kommande pass
              </p>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                Din tränare schemalägger nästa pass snart
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingTrainings.map(t => {
                const d = new Date(t.scheduled_date + 'T12:00:00')
                const dayNum = d.getDate()
                const monthAbbr = d.toLocaleDateString('sv-SE', { month: 'short' })
                const todaySession = isToday(t.scheduled_date)
                return (
                  <div
                    key={t.id}
                    onClick={() => router.push('/athlete/session')}
                    style={{
                      background: 'white', borderRadius: 16, padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'pointer',
                    }}
                  >
                    <div style={{ minWidth: 32, textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#0D7377', lineHeight: 1 }}>{dayNum}</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>{monthAbbr}</div>
                    </div>
                    <div style={{ width: 1, height: 32, background: 'rgba(0,0,0,0.08)', marginLeft: 4, marginRight: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </div>
                      {t.group_name && (
                        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{t.group_name}</div>
                      )}
                    </div>
                    {todaySession ? (
                      <div style={{ background: 'rgba(34,197,94,0.15)', borderRadius: 999, padding: '4px 10px', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A' }}>Idag</span>
                      </div>
                    ) : (
                      <ChevronRight size={16} color="#CBD5E1" strokeWidth={2.5} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── My Dives ─────────────────────────────────────────── */}
        <div>
          <div className="text-label" style={{ marginBottom: 10 }}>Mina hopp</div>

          {assignedDives.length > 0 ? (
            <div style={{
              display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4,
              marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16,
            }}>
              {assignedDives.map(dive => {
                const code = dive.library_item_code
                const name = dive.library_item_name ?? dive.custom_name ?? '—'
                const dd   = dive.library_item_dd
                return (
                  <div key={dive.id} style={{
                    minWidth: 100, height: 90, background: 'white', borderRadius: 14,
                    border: '0.5px solid rgba(13,115,119,0.4)', padding: 10,
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    flexShrink: 0,
                  }}>
                    {code && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0D7377' }}>{code}</div>
                    )}
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: '#0F172A',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as const,
                      lineHeight: 1.35,
                    }}>
                      {name}
                    </div>
                    {dd != null && (
                      <div style={{
                        background: 'rgba(245,158,11,0.15)', color: '#D97706',
                        borderRadius: 999, padding: '2px 7px', fontSize: 10, fontWeight: 700,
                        alignSelf: 'flex-start',
                      }}>
                        {dd}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ paddingTop: 8, paddingBottom: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: '0 0 4px' }}>
                Inga hopp tilldelade än
              </p>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                Din tränare lägger till dina hopp
              </p>
            </div>
          )}
        </div>

        {/* ── Recent Activity ───────────────────────────────────── */}
        {recentSessions.length > 0 && (
          <div>
            <div className="text-label" style={{ marginBottom: 10 }}>Senaste aktivitet</div>
            <div className="glass-card" style={{ padding: '14px 16px' }}>
              {recentSessions.map((session, i) => (
                <div
                  key={session.id}
                  onClick={() => router.push('/athlete/dagbok')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0',
                    borderBottom: i < recentSessions.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', flex: 1 }}>
                    {session.training_title ??
                      new Date(session.started_at).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                  <span style={{ fontSize: 12, color: '#94A3B8', flexShrink: 0 }}>
                    {formatSwedishDate(session.started_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Coach Message ─────────────────────────────────────── */}
        <div style={{
          background: 'rgba(13,115,119,0.06)',
          border: '1px solid rgba(13,115,119,0.15)',
          borderRadius: 16, padding: 14,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#0D7377', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>T</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
              Meddelande från tränaren
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>
              Bra jobbat senaste veckan! Fokus nu på inlopp.
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10 }}>🔒</span>
              <span style={{
                background: 'rgba(13,115,119,0.1)', color: '#0D7377',
                borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600,
              }}>
                Privat
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
