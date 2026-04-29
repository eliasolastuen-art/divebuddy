'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Portal from '@/components/Portal'

interface Group {
  id: string
  name: string
  color: string | null
}

interface Athlete {
  id: string
  name: string
}

interface Training {
  id: string
  title: string
  scheduled_date: string
  status: 'draft' | 'published'
}

function seedDD(id: string): string {
  return ((id.charCodeAt(0) % 9) / 10 + 2.2).toFixed(1)
}

function seedTrend(id: string): { symbol: string; bg: string; color: string } {
  const t = id.charCodeAt(1) % 3
  if (t === 0) return { symbol: '↑', bg: 'rgba(34,197,94,0.12)', color: '#16A34A' }
  if (t === 1) return { symbol: '=', bg: 'rgba(148,163,184,0.12)', color: '#64748B' }
  return { symbol: '↓', bg: 'rgba(239,68,68,0.12)', color: '#DC2626' }
}

export default function GroupDashboardPage() {
  const params = useParams()
  const groupId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [group, setGroup] = useState<Group | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)

  const [showInviteSheet, setShowInviteSheet] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]

      const [{ data: groupData }, { data: athleteData }, { data: trainingData }] = await Promise.all([
        supabase.from('groups').select('id, name, color').eq('id', groupId).single(),
        supabase.from('athletes').select('id, name').eq('group_id', groupId).order('name'),
        supabase
          .from('trainings')
          .select('id, title, scheduled_date, status')
          .eq('group_id', groupId)
          .gte('scheduled_date', today)
          .order('scheduled_date', { ascending: true })
          .limit(3),
      ])

      if (groupData) setGroup(groupData)
      if (athleteData) setAthletes(athleteData)
      if (trainingData) setTrainings(trainingData)
      setLoading(false)
    }
    load()
  }, [groupId])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid rgba(13,115,119,0.2)',
          borderTopColor: '#0D7377',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  if (!group) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
        Gruppen hittades inte
      </div>
    )
  }

  const groupColor = group.color || '#0D7377'
  const nextSession = trainings.find(t => t.status === 'published')

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviteSending(true)
    setInviteMessage(null)
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), groupId, role: 'athlete' }),
      })
      if (res.ok) {
        setInviteMessage({ type: 'success', text: 'Inbjudan skickad!' })
        setInviteEmail('')
      } else {
        setInviteMessage({ type: 'error', text: 'Något gick fel. Försök igen.' })
      }
    } catch {
      setInviteMessage({ type: 'error', text: 'Något gick fel. Försök igen.' })
    } finally {
      setInviteSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* ── Gradient Hero ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0D7377 0%, #064d50 100%)',
        padding: '20px 20px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 30, right: 80, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
              background: groupColor,
              border: '2px solid rgba(255,255,255,0.4)',
            }} />
            <h1 style={{
              fontSize: 28, fontWeight: 900, color: 'white',
              letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
            }}>
              {group.name}
            </h1>
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
            {athletes.length} atleter · Säsong 2026
          </p>
        </div>
      </div>

      {/* ── Floating Stats Cards ── */}
      <div style={{
        margin: '0 16px',
        marginTop: -28,
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        gap: 8,
      }}>
        {[
          { value: trainings.length, label: 'Kommande pass' },
          { value: '2.6', label: 'Snitt DD' },
          { value: '↑ 8%', label: 'Framsteg' },
        ].map(({ value, label }) => (
          <div key={label} style={{
            flex: 1,
            background: 'white',
            borderRadius: 16,
            padding: '14px 12px',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>
              {value}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginTop: 2, letterSpacing: '0.04em' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column' }}>

        {/* ── Next Session Banner ── */}
        {nextSession && (
          <div
            onClick={() => router.push(`/groups/${groupId}/planning`)}
            style={{
              marginTop: 16,
              background: 'linear-gradient(135deg, #0D7377 0%, #064d50 100%)',
              borderRadius: 16,
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>
                Nästa pass
              </p>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nextSession.title}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
                {formatDate(nextSession.scheduled_date)}
              </p>
            </div>
            <div style={{
              background: 'white',
              color: '#0D7377',
              borderRadius: 9999,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}>
              Starta
            </div>
          </div>
        )}

        {/* ── Athlete Section ── */}
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
            Atleter
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {athletes.map((a) => {
              const dd = seedDD(a.id)
              const trend = seedTrend(a.id)
              return (
                <div
                  key={a.id}
                  onClick={() => router.push(`/groups/${groupId}/athletes/${a.id}`)}
                  style={{
                    background: 'white',
                    borderRadius: 18,
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                    background: `${groupColor}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: groupColor }}>
                      {a.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                      — hopp · Sist aktiv —
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>
                      {dd}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      borderRadius: 9999, padding: '2px 8px',
                      background: trend.bg, color: trend.color,
                    }}>
                      {trend.symbol}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* ── Invite Card ── */}
            <div
              onClick={() => {
                setInviteMessage(null)
                setInviteEmail('')
                setShowInviteSheet(true)
              }}
              style={{
                background: 'white',
                borderRadius: 18,
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                opacity: 0.5,
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 20, color: '#64748B', lineHeight: 1 }}>+</span>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Bjud in atlet</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Skicka inbjudan via mail</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }} />
      </div>

      {/* ── Invite Sheet ── */}
      {showInviteSheet && (
        <Portal>
        <div
          onClick={() => setShowInviteSheet(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-sheet"
            style={{ width: '100%', maxWidth: 520, margin: '0 auto', padding: '24px 20px calc(env(safe-area-inset-bottom, 0px) + 100px)', maxHeight: '85vh', overflowY: 'auto' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '0 auto 20px' }} />

            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 6 }}>
              Bjud in atlet
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
              Atleten får ett mail med länk för att skapa konto.
            </p>

            <input
              className="glass-input"
              type="email"
              placeholder="E-postadress"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
            />

            {inviteMessage && (
              <p style={{
                fontSize: 13, fontWeight: 600, marginBottom: 12,
                color: inviteMessage.type === 'success' ? '#16A34A' : '#DC2626',
              }}>
                {inviteMessage.text}
              </p>
            )}

            <button
              className="btn-primary"
              onClick={handleInvite}
              disabled={inviteSending || !inviteEmail.trim()}
              style={{ width: '100%' }}
            >
              {inviteSending ? 'Skickar...' : 'Skicka inbjudan'}
            </button>
          </div>
        </div>
        </Portal>
      )}

    </div>
  )
}
