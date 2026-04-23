'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useUser } from '@/lib/context/user'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────
interface Group {
  id: string
  name: string
  color: string
}

interface Session {
  id: string
  title: string
  status: string
  start_time: string | null
  group_id: string | null
  groups: Array<{ name: string; color: string }> | null
}

// ── Helpers ───────────────────────────────────────────────────
function getISOWeek(d: Date): number {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'God morgon'
  if (h < 18) return 'God dag'
  return 'God kväll'
}

function initials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function darkenHex(hex: string, amt = 0.25): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r * (1 - amt))},${Math.round(g * (1 - amt))},${Math.round(b * (1 - amt))})`
}

// ── Status config ─────────────────────────────────────────────
const statusConfig: Record<string, { label: string; dot: string; pill: string; text: string }> = {
  draft:     { label: 'Utkast',     dot: '#94A3B8', pill: 'rgba(148,163,184,0.15)', text: '#64748B' },
  published: { label: 'Publicerat', dot: '#22C55E', pill: 'rgba(34,197,94,0.12)',   text: '#16A34A' },
  completed: { label: 'Genomfört', dot: '#0D7377', pill: 'rgba(13,115,119,0.12)',  text: '#0D7377' },
  active:    { label: 'Live',       dot: '#F97316', pill: 'rgba(249,115,22,0.12)',  text: '#EA580C' },
}

// ── Component ─────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile, activeRole, loading } = useUser()
  const [clubName, setClubName] = useState<string | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [athleteCounts, setAthleteCounts] = useState<Record<string, number>>({})
  const [totalAthletes, setTotalAthletes] = useState(0)
  const [todaySessions, setTodaySessions] = useState<Session[]>([])
  const [totalSessions, setTotalSessions] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (activeRole === 'athlete') router.replace('/athlete')
  }, [activeRole, loading, router])

  // Existing: club name
  useEffect(() => {
    if (!profile?.club_id) return
    createClient()
      .from('clubs')
      .select('name')
      .eq('id', profile.club_id)
      .single()
      .then(({ data }) => { if (data) setClubName(data.name) })
  }, [profile?.club_id])

  // New: groups, athletes, sessions
  useEffect(() => {
    if (!profile?.club_id) return
    const supabase = createClient()
    const todayStr = new Date().toISOString().split('T')[0]

    Promise.all([
      supabase.from('groups').select('id, name, color').eq('club_id', profile.club_id).order('sort_order'),
      supabase.from('athletes').select('group_id').eq('club_id', profile.club_id).eq('active', true),
      supabase.from('trainings')
        .select('id, title, status, start_time, group_id, groups(name, color)')
        .eq('club_id', profile.club_id)
        .eq('scheduled_date', todayStr),
      supabase.from('trainings').select('id', { count: 'exact', head: true }).eq('club_id', profile.club_id),
    ]).then(([g, a, t, c]) => {
      if (g.data) setGroups(g.data)
      if (a.data) {
        const counts: Record<string, number> = {}
        a.data.forEach(({ group_id }) => {
          if (group_id) counts[group_id] = (counts[group_id] || 0) + 1
        })
        setAthleteCounts(counts)
        setTotalAthletes(a.data.length)
      }
      if (t.data) setTodaySessions(t.data as Session[])
      if (c.count != null) setTotalSessions(c.count)
    })
  }, [profile?.club_id])

  const weekNum = getISOWeek(new Date())
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Coach'

  const statPills = [
    { value: totalAthletes, label: 'Atleter' },
    { value: groups.length,  label: 'Grupper' },
    { value: todaySessions.length, label: 'Idag' },
    { value: `V.${weekNum}`, label: 'Vecka' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* ── Hero Header ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, #0D7377 0%, #064d50 100%)',
        padding: '20px 20px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 30, right: 80, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
              DiveBuddy
            </span>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>
                {initials(profile?.full_name ?? null)}
              </span>
            </div>
          </div>

          {/* Greeting */}
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500, margin: '0 0 4px' }}>
            {getGreeting()},
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: 'white', letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 24px' }}>
            {firstName}
          </h1>

          {/* Stats pills */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {statPills.map(({ value, label }) => (
              <div key={label} style={{
                flexShrink: 0,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 999,
                padding: '6px 14px',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>{value}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 520, width: '100%', margin: '0 auto' }}>

        {/* ── AI Nudge Card ──────────────────────────────────────── */}
        <div
          onClick={() => router.push('/ai')}
          style={{
            background: 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)',
            borderRadius: 18,
            padding: '16px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(13,115,119,0.25)',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 20 }}>✦</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', margin: '0 0 2px' }}>
              AI Assistent
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500, margin: 0 }}>
              Analyserar din säsong...
            </p>
          </div>
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.55)', fontWeight: 300, lineHeight: 1 }}>›</span>
        </div>

        {/* ── Groups ─────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>Grupper</span>
            <Link href="/groups" style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textDecoration: 'none' }}>
              Alla →
            </Link>
          </div>
          <div style={{
            display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4,
            marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16,
          }}>
            {groups.map(group => (
              <Link key={group.id} href={`/groups/${group.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                <div style={{
                  minWidth: 120, borderRadius: 18,
                  background: `linear-gradient(160deg, ${group.color} 0%, ${darkenHex(group.color)} 100%)`,
                  padding: '18px 14px 14px',
                  display: 'flex', flexDirection: 'column', gap: 2,
                  boxShadow: `0 4px 16px ${group.color}40`,
                }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.04em', lineHeight: 1 }}>
                    {athleteCounts[group.id] ?? 0}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Atleter</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '-0.01em', marginTop: 8 }}>
                    {group.name}
                  </span>
                </div>
              </Link>
            ))}
            <Link href="/groups?new=1" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                minWidth: 100, height: '100%', minHeight: 110, borderRadius: 18,
                background: 'rgba(0,0,0,0.03)',
                border: '1.5px dashed rgba(0,0,0,0.12)',
                padding: '14px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Plus size={20} color="#94A3B8" strokeWidth={2} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>Ny grupp</span>
              </div>
            </Link>
          </div>
        </div>

        {/* ── Today's Sessions ────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>Idag</span>
            <Link href="/planning" style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', textDecoration: 'none' }}>
              Alla →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todaySessions.length === 0 ? (
              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500, margin: 0 }}>
                  Inga pass schemalagda idag
                </p>
              </div>
            ) : (
              todaySessions.map(session => {
                const sc = statusConfig[session.status] ?? statusConfig.draft
                return (
                  <div key={session.id} className="glass-card" style={{
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 14, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em',
                        margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {session.title}
                      </p>
                      <p style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, margin: 0 }}>
                        {session.groups?.[0]?.name ?? '—'}{session.start_time ? ` · ${session.start_time.slice(0, 5)}` : ''}
                      </p>
                    </div>
                    <div style={{ background: sc.pill, borderRadius: 999, padding: '4px 10px', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sc.text }}>{sc.label}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Quick Stats ─────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>Statistik</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="glass-card" style={{ padding: '18px 16px' }}>
              <p style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em', margin: '0 0 2px', lineHeight: 1 }}>
                {totalSessions}
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', margin: '0 0 8px' }}>Pass denna säsong</p>
              <p style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>↑ Bra jobbat</p>
            </div>
            <div className="glass-card" style={{ padding: '18px 16px' }}>
              <p style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em', margin: '0 0 2px', lineHeight: 1 }}>
                2.6
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', margin: '0 0 8px' }}>Snitt DD</p>
              <p style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>↑ +0.3 sedan förra månaden</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
