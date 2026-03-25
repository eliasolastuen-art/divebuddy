'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, CalendarDays, ChevronRight, Target, Zap } from 'lucide-react'
import { useUser } from '@/lib/context/user'
import { createClient } from '@/lib/supabase/client'

const season = [
  { label: "Pre-season", short: "Pre" },
  { label: "Technique", short: "Tech" },
  { label: "Comp prep", short: "Prep" },
  { label: "Competition", short: "Comp" },
  { label: "Recovery", short: "Rec" },
]
const activePhase = 2

const days = [
  { label: "M" }, { label: "T" }, { label: "W" },
  { label: "T" }, { label: "F" }, { label: "S" }, { label: "S" },
]
const today = 2 // Wednesday = index 2

const weekFocus = ["Entries", "Competition simulation", "3m consistency"]

export default function DashboardPage() {
  const { profile, activeRole, roles, loading } = useUser()
  const [clubName, setClubName] = useState<string | null>(null)
  const router = useRouter()

  // Atleter utan coach/admin-roll redirectas till sin egna sida
  useEffect(() => {
    if (loading) return
    if (roles.length > 0 && !roles.includes('coach') && !roles.includes('admin')) {
      router.replace('/athlete')
    }
  }, [roles, loading, router])

  useEffect(() => {
    if (!profile?.club_id) return
    createClient()
      .from('clubs')
      .select('name')
      .eq('id', profile.club_id)
      .single()
      .then(({ data }) => { if (data) setClubName(data.name) })
  }, [profile?.club_id])

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    coach: 'Coach',
    athlete: 'Atlet',
  }
  const roleLabel = activeRole ? roleLabels[activeRole] ?? activeRole : null

  const greeting = activeRole
    ? activeRole.charAt(0).toUpperCase() + activeRole.slice(1)
    : 'Coach'

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520, margin: '0 auto' }}>

      {/* ── Hero Card ─────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(145deg, #0D7377 0%, #0a5c60 50%, #074c4e 100%)',
        borderRadius: 24,
        padding: '24px 22px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(13,115,119,0.3), 0 2px 8px rgba(0,0,0,0.1)',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          {clubName && (
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              {clubName}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
              Good morning
            </p>
            {roleLabel && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6, padding: '2px 8px',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                {roleLabel}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 2 }}>
            {greeting} 👋
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginBottom: 20 }}>
            {new Date().toLocaleDateString('en-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          {/* Quick action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/live" style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 9999,
              padding: '9px 18px',
              textDecoration: 'none',
              color: 'white',
              fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
            }}>
              <Play size={14} fill="white" color="white" />
              Start
            </Link>
            <Link href="/planning" style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 9999,
              padding: '9px 18px',
              textDecoration: 'none',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
            }}>
              <CalendarDays size={14} color="rgba(255,255,255,0.85)" />
              Plan
            </Link>
          </div>
        </div>
      </div>

      {/* ── Season Progress ───────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Season Progress
          </h2>
          <span style={{
            fontSize: 12, fontWeight: 700, color: '#0D7377',
            background: 'rgba(13,115,119,0.1)', borderRadius: 8, padding: '3px 10px',
          }}>
            {season[activePhase].label}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{
            height: 6, borderRadius: 9999,
            background: 'rgba(0,0,0,0.06)',
          }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, height: 6, borderRadius: 9999,
            width: `${((activePhase + 1) / season.length) * 100}%`,
            background: 'linear-gradient(90deg, #0D7377, #26a0a0)',
            boxShadow: '0 0 8px rgba(13,115,119,0.4)',
            transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Phase labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {season.map((phase, i) => (
            <div key={phase.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i <= activePhase ? '#0D7377' : '#E2E8F0',
                boxShadow: i === activePhase ? '0 0 0 3px rgba(13,115,119,0.2)' : 'none',
                transition: 'all 0.2s ease',
              }} />
              <span style={{
                fontSize: 10, fontWeight: i === activePhase ? 700 : 500,
                color: i === activePhase ? '#0D7377' : '#94A3B8',
                letterSpacing: '0.01em',
              }}>
                {phase.short}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2-col grid ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Next Events */}
        <div className="glass-card" style={{ padding: '16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(13,115,119,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="#0D7377" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>Events</span>
          </div>
          <p style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, lineHeight: 1.4 }}>
            No upcoming competitions
          </p>
        </div>

        {/* Week Focus */}
        <div className="glass-card" style={{ padding: '16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(13,115,119,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={14} color="#0D7377" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>Focus</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {weekFocus.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#0D7377', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Week Planner ──────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '18px 20px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 16 }}>
          Week Planner
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {days.map((day, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: i === today ? '#0D7377' : '#94A3B8',
                letterSpacing: '0.02em',
              }}>
                {day.label}
              </span>
              <div style={{
                width: i === today ? 32 : 10,
                height: i === today ? 32 : 10,
                borderRadius: i === today ? 11 : '50%',
                background: i === today
                  ? 'linear-gradient(135deg, #0D7377, #0a5c60)'
                  : 'rgba(0,0,0,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: i === today ? '0 2px 8px rgba(13,115,119,0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}>
                {i === today && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>T</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Today ────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Today
          </h2>
          <Link href="/planning" style={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: '#0D7377', fontSize: 13, fontWeight: 600 }}>
            View all <ChevronRight size={14} />
          </Link>
        </div>
        <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500, marginBottom: 18 }}>
          No sessions scheduled
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            href="/live"
            className="btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 0', textDecoration: 'none', fontSize: 14 }}
          >
            <Play size={15} fill="white" color="white" />
            Start Training
          </Link>
          <Link
            href="/planning"
            className="btn-secondary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 0', textDecoration: 'none', fontSize: 14 }}
          >
            <CalendarDays size={15} color="#0F172A" />
            Plan Session
          </Link>
        </div>
      </div>

    </div>
  )
}
