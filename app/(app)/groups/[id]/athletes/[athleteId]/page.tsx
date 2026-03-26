'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, X, UserPlus, Waves, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'

interface AthleteDetail {
  id: string
  name: string
  email: string | null
  active: boolean
  group_id: string | null
  club_id: string | null
  group_name: string | null
  group_color: string | null
}

interface SessionSummary {
  id: string
  started_at: string
  dive_count: number
}

interface DiveEntry {
  id: string
  dive_code: string | null
  dive_name: string | null
  dd: number | null
  status: 'pending' | 'done'
  coach_feedback: string | null
}

const GROUP_COLORS = ['#0D7377','#D4A017','#6366F1','#EC4899','#10B981','#F97316','#3B82F6','#8B5CF6']

export default function AthleteProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useUser()
  const athleteId = params.athleteId as string
  const groupId = params.id as string

  const [athlete, setAthlete] = useState<AthleteDetail | null>(null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [dives, setDives] = useState<DiveEntry[]>([])
  const [totalDives, setTotalDives] = useState(0)
  const [loading, setLoading] = useState(true)

  // Edit sheet state
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole] = useState<'athlete'>('athlete')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const supabase = createClient()

  const load = async () => {
    const { data: a } = await supabase
      .from('athletes')
      .select('id, name, email, active, group_id, club_id, groups(name, color)')
      .eq('id', athleteId)
      .single()

    if (!a) { setLoading(false); return }

    const groupData = a.groups as unknown as { name: string; color: string } | null
    setAthlete({
      id: a.id, name: a.name, email: a.email, active: a.active,
      group_id: a.group_id, club_id: a.club_id,
      group_name: groupData?.name ?? null,
      group_color: groupData?.color ?? null,
    })

    // Hämta sessioner där atleten deltog
    const { data: sessionAthletes } = await supabase
      .from('live_session_athletes')
      .select('session_id')
      .eq('athlete_id', athleteId)

    if (sessionAthletes?.length) {
      const sessionIds = sessionAthletes.map(s => s.session_id)

      const { data: sessionData } = await supabase
        .from('live_sessions')
        .select('id, started_at')
        .in('id', sessionIds)
        .order('started_at', { ascending: false })
        .limit(20)

      const { data: allDives } = await supabase
        .from('live_dive_log')
        .select('session_id')
        .eq('athlete_id', athleteId)
        .in('session_id', sessionIds)

      const countMap: Record<string, number> = {}
      allDives?.forEach(d => { countMap[d.session_id] = (countMap[d.session_id] ?? 0) + 1 })

      const summaries = (sessionData ?? []).map(s => ({
        id: s.id,
        started_at: s.started_at,
        dive_count: countMap[s.id] ?? 0,
      }))
      setSessions(summaries)
      setTotalDives(allDives?.length ?? 0)

      // Ladda hopp för senaste sessionen automatiskt
      if (summaries.length > 0) {
        setSelectedSession(summaries[0].id)
        loadDives(summaries[0].id)
      }
    }

    setLoading(false)
  }

  const loadDives = async (sessionId: string) => {
    const { data } = await supabase
      .from('live_dive_log')
      .select('id, dive_code, dive_name, dd, status, coach_feedback')
      .eq('athlete_id', athleteId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    setDives((data ?? []) as DiveEntry[])
  }

  useEffect(() => { load() }, [athleteId])

  const openEdit = () => {
    if (!athlete) return
    setEditName(athlete.name)
    setEditEmail(athlete.email ?? '')
    setEditActive(athlete.active)
    setInviteEmail(athlete.email ?? '')
    setConfirmDelete(false)
    setInviteMessage(null)
    setShowEdit(true)
  }

  const saveAthlete = async () => {
    if (!athlete || !editName.trim()) return
    setSaving(true)
    await supabase.from('athletes').update({
      name: editName.trim(),
      email: editEmail.trim() || null,
      active: editActive,
    }).eq('id', athlete.id)
    setSaving(false)
    setShowEdit(false)
    load()
  }

  const deleteAthlete = async () => {
    if (!athlete) return
    setSaving(true)
    await supabase.from('athletes').delete().eq('id', athlete.id)
    setSaving(false)
    router.replace(`/groups/${groupId}`)
  }

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !athlete?.club_id) return
    setInviteSending(true)
    setInviteMessage(null)
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), roles: [inviteRole], clubId: athlete.club_id }),
    })
    const result = await res.json()
    setInviteMessage(
      res.ok
        ? { type: 'success', text: `Inbjudan skickad till ${inviteEmail}` }
        : { type: 'error', text: result.error ?? 'Kunde inte skicka inbjudan.' }
    )
    setInviteSending(false)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' })

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ width: 28, height: 28, border: '3px solid rgba(13,115,119,0.2)', borderTopColor: '#0D7377', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (!athlete) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Atleten hittades inte</div>
  )

  const groupColor = athlete.group_color || '#0D7377'

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button
          onClick={() => router.back()}
          style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <ArrowLeft size={18} color="#0F172A" strokeWidth={2.5} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: `${groupColor}18`, border: `2px solid ${groupColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: groupColor }}>{athlete.name.charAt(0).toUpperCase()}</span>
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{athlete.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              {athlete.group_name && (
                <span style={{ fontSize: 12, fontWeight: 600, color: groupColor, background: `${groupColor}12`, padding: '2px 8px', borderRadius: 6 }}>
                  {athlete.group_name}
                </span>
              )}
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: athlete.active ? 'rgba(13,115,119,0.1)' : 'rgba(0,0,0,0.05)', color: athlete.active ? '#0D7377' : '#94A3B8' }}>
                {athlete.active ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>
          </div>
          <button
            onClick={openEdit}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Pencil size={15} color="#64748B" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Statistik */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="glass-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Waves size={15} color="#0D7377" />
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hopp</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>{totalDives}</p>
            <p style={{ fontSize: 12, color: '#64748B' }}>totalt loggade</p>
          </div>
          <div className="glass-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Award size={15} color="#0D7377" />
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pass</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>{sessions.length}</p>
            <p style={{ fontSize: 12, color: '#64748B' }}>deltagit</p>
          </div>
        </div>

        {/* Pass-historik */}
        {sessions.length > 0 && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Pass</h2>
            </div>
            {sessions.map((session, i) => (
              <button
                key={session.id}
                onClick={() => {
                  setSelectedSession(session.id)
                  loadDives(session.id)
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 18px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: i < sessions.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  background: selectedSession === session.id ? 'rgba(13,115,119,0.05)' : 'transparent',
                }}
              >
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', textTransform: 'capitalize' }}>
                    {formatDate(session.started_at)}
                  </p>
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: '#0D7377',
                  background: 'rgba(13,115,119,0.08)', borderRadius: 8, padding: '2px 10px',
                }}>
                  {session.dive_count} hopp
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Hopp i valt pass */}
        {selectedSession && dives.length > 0 && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                Hopp — {formatDate(sessions.find(s => s.id === selectedSession)?.started_at ?? '')}
              </h2>
            </div>
            {dives.map((dive, i) => (
              <div
                key={dive.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 18px',
                  borderBottom: i < dives.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  background: dive.status === 'done' ? 'rgba(13,115,119,0.02)' : 'transparent',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  background: dive.status === 'done' ? '#0D7377' : 'rgba(0,0,0,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {dive.status === 'done' && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      {dive.dive_code ?? '—'}
                    </span>
                    {dive.dive_name && (
                      <span style={{ fontSize: 13, color: '#64748B' }}>{dive.dive_name}</span>
                    )}
                    {dive.dd && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginLeft: 'auto' }}>
                        DD {dive.dd}
                      </span>
                    )}
                  </div>
                  {dive.coach_feedback && (
                    <p style={{ fontSize: 12, color: '#64748B', marginTop: 4, fontStyle: 'italic' }}>
                      {dive.coach_feedback}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {sessions.length === 0 && (
          <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
            <Waves size={32} color="rgba(13,115,119,0.3)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Inga pass ännu</p>
            <p style={{ fontSize: 13, color: '#64748B' }}>Pass och hopp visas här när atleten deltar i träning.</p>
          </div>
        )}
      </div>

      {/* ── Edit sheet ─────────────────────────────────────────────────────────── */}
      {showEdit && (
        <>
          <div onClick={() => setShowEdit(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001, padding: '16px 20px calc(var(--safe-bottom) + 24px)' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Redigera atlet</h2>
              <button onClick={() => setShowEdit(false)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Namn *" className="glass-input" style={{ width: '100%', padding: '12px 14px', fontSize: 15, marginBottom: 10 }} autoFocus />
            <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="E-post (valfritt)" className="glass-input" style={{ width: '100%', padding: '12px 14px', fontSize: 15, marginBottom: 16 }} />
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setEditActive(a => !a)}
                style={{ padding: '9px 18px', borderRadius: 9999, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: editActive ? 'rgba(13,115,119,0.1)' : 'rgba(0,0,0,0.06)', color: editActive ? '#0D7377' : '#94A3B8', transition: 'all 0.15s ease' }}
              >
                {editActive ? 'Aktiv' : 'Inaktiv'}
              </button>
            </div>
            <button onClick={saveAthlete} disabled={saving || !editName.trim()} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, cursor: 'pointer', opacity: editName.trim() ? 1 : 0.4, marginBottom: 10 }}>
              {saving ? 'Sparar...' : 'Spara ändringar'}
            </button>

            {/* Bjud in till appen */}
            <div style={{ margin: '14px 0', padding: '16px', background: 'rgba(13,115,119,0.05)', borderRadius: 14, border: '1px solid rgba(13,115,119,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <UserPlus size={15} color="#0D7377" strokeWidth={2.2} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0D7377' }}>Bjud in till appen</span>
              </div>
              {inviteMessage && (
                <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontSize: 12, fontWeight: 500, background: inviteMessage.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(13,115,119,0.08)', color: inviteMessage.type === 'error' ? '#DC2626' : '#0D7377' }}>
                  {inviteMessage.text}
                </div>
              )}
              <input type="email" placeholder="E-postadress" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="glass-input" style={{ width: '100%', padding: '10px 12px', fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }} />
              <button
                onClick={sendInvite}
                disabled={inviteSending || !inviteEmail.trim()}
                style={{ width: '100%', padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', background: 'linear-gradient(135deg, #0D7377, #0a5c60)', color: 'white', cursor: inviteSending ? 'not-allowed' : 'pointer', opacity: inviteEmail.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <UserPlus size={14} strokeWidth={2.2} />
                {inviteSending ? 'Skickar...' : 'Skicka inbjudan'}
              </button>
            </div>

            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', borderRadius: 14, background: 'rgba(220,38,38,0.08)', border: 'none', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Trash2 size={14} strokeWidth={2.5} /> Ta bort atlet
              </button>
            ) : (
              <div style={{ background: 'rgba(220,38,38,0.07)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', marginBottom: 12, textAlign: 'center' }}>Ta bort {athlete.name}?</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(0,0,0,0.06)', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Avbryt</button>
                  <button onClick={deleteAthlete} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: 12, background: '#DC2626', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'white' }}>
                    {saving ? 'Tar bort...' : 'Ta bort'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
