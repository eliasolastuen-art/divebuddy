'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, X, UserPlus, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import BottomNav from '@/components/nav/BottomNav'

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

interface LibraryDive {
  id: string
  name: string
  code: string | null
  group_name: string | null
  dd: number | null
  description: string | null
}

type Tab = 'progress' | 'hopp' | 'notes'

const BAR_HEIGHTS = [40, 60, 45, 75, 55, 80, 35, 90]
const BAR_LABELS = ['v10', 'v11', 'v12', 'v13', 'v14', 'v15', 'v16', 'v17']

const HARDCODED_NOTES = [
  { date: '15 apr 2026', text: 'Bra progression i bakåt-rotation. Fokus nästa pass på entry.' },
  { date: '8 apr 2026', text: 'Arbetar på DD 3.2-nivå. Ser ut att nå målet till tävling.' },
]

const SEASON_GOALS = [
  { label: 'DD-snitt 2.8', pct: 85, color: '#0D7377' },
  { label: 'Tävlingshopp klart', pct: 66, color: '#F59E0B' },
]

export default function Athlete360Page() {
  const params = useParams()
  const router = useRouter()
  const athleteId = params.athleteId as string
  const groupId = params.id as string

  const [athlete, setAthlete] = useState<AthleteDetail | null>(null)
  const [totalSessions, setTotalSessions] = useState(0)
  const [snittDD, setSnittDD] = useState<string>('—')
  const [uniqueDives, setUniqueDives] = useState(0)
  const [libraryDives, setLibraryDives] = useState<LibraryDive[]>([])
  const [tab, setTab] = useState<Tab>('progress')
  const [loading, setLoading] = useState(true)

  // Note sheet
  const [showNoteSheet, setShowNoteSheet] = useState(false)
  const [noteText, setNoteText] = useState('')

  // Edit sheet (preserved from prior page)
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
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
    const athleteDetail: AthleteDetail = {
      id: a.id, name: a.name, email: a.email, active: a.active,
      group_id: a.group_id, club_id: a.club_id,
      group_name: groupData?.name ?? null,
      group_color: groupData?.color ?? null,
    }
    setAthlete(athleteDetail)

    // Sessions
    const { data: sessionAthletes } = await supabase
      .from('live_session_athletes')
      .select('session_id')
      .eq('athlete_id', athleteId)

    if (sessionAthletes?.length) {
      const sessionIds = sessionAthletes.map(s => s.session_id)
      setTotalSessions(sessionIds.length)

      const { data: diveData } = await supabase
        .from('live_dive_log')
        .select('session_id, dive_code, dd')
        .eq('athlete_id', athleteId)
        .in('session_id', sessionIds)

      if (diveData?.length) {
        const ddValues = diveData.filter(d => d.dd != null).map(d => d.dd as number)
        if (ddValues.length > 0) {
          const avg = ddValues.reduce((s, v) => s + v, 0) / ddValues.length
          setSnittDD(avg.toFixed(1))
        }
        const codes = new Set(diveData.map(d => d.dive_code).filter(Boolean))
        setUniqueDives(codes.size)
      }
    }

    // Library dives for this club
    if (a.club_id) {
      const { data: libData } = await supabase
        .from('library_items')
        .select('id, name, code, group_name, dd, description')
        .eq('club_id', a.club_id)
        .eq('type', 'dive')
        .eq('archived', false)
        .order('name')
      setLibraryDives((libData ?? []) as LibraryDive[])
    }

    setLoading(false)
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
      body: JSON.stringify({ email: inviteEmail.trim(), roles: ['athlete'], clubId: athlete.club_id }),
    })
    const result = await res.json()
    setInviteMessage(
      res.ok
        ? { type: 'success', text: `Inbjudan skickad till ${inviteEmail}` }
        : { type: 'error', text: result.error ?? 'Kunde inte skicka inbjudan.' }
    )
    setInviteSending(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ width: 28, height: 28, border: '3px solid rgba(13,115,119,0.2)', borderTopColor: '#0D7377', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (!athlete) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Atleten hittades inte</div>
  )

  const teal = '#0D7377'
  const initial = athlete.name.charAt(0).toUpperCase()

  const STATS = [
    { value: totalSessions, label: 'Pass' },
    { value: snittDD, label: 'Snitt DD' },
    { value: uniqueDives || '—', label: 'Unika hopp' },
    { value: '—', label: 'Trend' },
  ]

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface-bg)' }}>

      {/* ── Dark Header ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0F172A, #1e293b)',
        padding: '20px 20px 24px',
        paddingTop: 'max(20px, var(--safe-top))',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(13,115,119,0.08)', pointerEvents: 'none' }} />

        {/* Row 1: back + edit */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
          <button
            onClick={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <ArrowLeft size={17} color="white" strokeWidth={2.5} />
          </button>
          <button
            onClick={openEdit}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Pencil size={15} color="rgba(255,255,255,0.8)" strokeWidth={2} />
          </button>
        </div>

        {/* Row 2: avatar + name + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, position: 'relative' }}>
          <div style={{
            width: 54, height: 54, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #0D7377, #064d50)',
            border: '2.5px solid rgba(13,115,119,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(13,115,119,0.4)',
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{initial}</span>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: '-0.04em', lineHeight: 1.15 }}>
              {athlete.name}
            </div>
            {athlete.group_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: teal, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                  {athlete.group_name} · {athlete.active ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: 4 stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, position: 'relative' }}>
          {STATS.map(({ value, label }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '10px 8px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>{value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 2, letterSpacing: '0.02em' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        padding: '6px 16px',
        gap: 4,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {(['progress', 'hopp', 'notes'] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = { progress: 'Progress', hopp: 'Hopp', notes: 'Notes' }
          const active = tab === t
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                color: active ? teal : '#94A3B8',
                background: active ? 'rgba(13,115,119,0.08)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              {labels[t]}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, padding: '16px 16px 0' }}>

        {/* PROGRESS TAB */}
        {tab === 'progress' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Bar chart card */}
            <div className="glass-card" style={{ padding: '20px 20px 16px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Framsteg</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
                {BAR_HEIGHTS.map((h, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: '100%',
                      height: h,
                      borderRadius: '6px 6px 2px 2px',
                      background: i === BAR_HEIGHTS.length - 1
                        ? '#EF4444'
                        : `linear-gradient(180deg, ${teal} 0%, #064d50 100%)`,
                      opacity: i === BAR_HEIGHTS.length - 1 ? 0.85 : 1,
                    }} />
                    <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600, letterSpacing: '0.01em' }}>
                      {BAR_LABELS[i]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Season goals card */}
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Säsongsmål</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {SEASON_GOALS.map(({ label, pct, color }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: `${color}18`, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: color, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* HOPP TAB */}
        {tab === 'hopp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {libraryDives.length > 0 ? (
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                {libraryDives.map((dive, i) => (
                  <div
                    key={dive.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px',
                      borderBottom: i < libraryDives.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    }}
                  >
                    {/* Code badge */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(13,115,119,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: teal, textAlign: 'center', lineHeight: 1.2 }}>
                        {dive.code ?? dive.group_name?.slice(0, 3) ?? '—'}
                      </span>
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {dive.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                        {dive.dd != null ? `DD ${dive.dd}` : 'DD —'}
                        {dive.group_name ? ` · ${dive.group_name}` : ''}
                      </div>
                    </div>
                    {/* Score placeholder */}
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#94A3B8', flexShrink: 0 }}>—</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Inga hopp registrerade än</p>
                <p style={{ fontSize: 13, color: '#94A3B8' }}>Hopp från klubbens bibliotek visas här.</p>
              </div>
            )}

            {/* Add dive CTA */}
            <button style={{
              width: '100%', padding: '16px', borderRadius: 18,
              background: 'transparent',
              border: `1.5px dashed rgba(13,115,119,0.4)`,
              cursor: 'pointer', color: teal, fontSize: 14, fontWeight: 700,
              opacity: 0.7,
            }}>
              + Lägg till hopp
            </button>
          </div>
        )}

        {/* NOTES TAB */}
        {tab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {HARDCODED_NOTES.map((note, i) => (
              <div
                key={i}
                className="glass-card"
                style={{ padding: '16px 18px', background: 'rgba(13,115,119,0.03)', cursor: 'default' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Lock size={13} color={teal} strokeWidth={2.2} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: teal, flex: 1 }}>Coach-notering</span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{note.date}</span>
                </div>
                <p style={{ fontSize: 14, color: '#0F172A', fontStyle: 'italic', lineHeight: 1.55, margin: 0 }}>
                  "{note.text}"
                </p>
              </div>
            ))}

            {/* New note CTA */}
            <button
              onClick={() => { setNoteText(''); setShowNoteSheet(true) }}
              style={{
                width: '100%', padding: '16px', borderRadius: 18,
                background: 'transparent',
                border: `1.5px dashed rgba(13,115,119,0.4)`,
                cursor: 'pointer', color: teal, fontSize: 14, fontWeight: 700,
                opacity: 0.7,
              }}
            >
              + Ny notering
            </button>
          </div>
        )}

        <div style={{ height: 100 }} />
      </div>

      <BottomNav />

      {/* ── Note Sheet ── */}
      {showNoteSheet && (
        <>
          <div
            onClick={() => setShowNoteSheet(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000 }}
          />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001, padding: '16px 20px calc(var(--safe-bottom, 0px) + 24px)' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Ny notering</h2>
              <button onClick={() => setShowNoteSheet(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Skriv din notering här..."
              rows={4}
              className="glass-input"
              style={{ width: '100%', padding: '12px 14px', fontSize: 14, marginBottom: 14, resize: 'none', boxSizing: 'border-box' }}
              autoFocus
            />
            <button
              onClick={() => { console.log('Coach note:', noteText); setShowNoteSheet(false) }}
              disabled={!noteText.trim()}
              className="btn-primary"
              style={{ width: '100%', padding: 14, fontSize: 15, opacity: noteText.trim() ? 1 : 0.4 }}
            >
              Spara
            </button>
          </div>
        </>
      )}

      {/* ── Edit Sheet ── */}
      {showEdit && (
        <>
          <div onClick={() => setShowEdit(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001, padding: '16px 20px calc(var(--safe-bottom, 0px) + 100px)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Redigera atlet</h2>
              <button onClick={() => setShowEdit(false)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Namn *" className="glass-input" style={{ width: '100%', padding: '12px 14px', fontSize: 15, marginBottom: 10 }} autoFocus />
            <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="E-post (valfritt)" className="glass-input" style={{ width: '100%', padding: '12px 14px', fontSize: 15, marginBottom: 16 }} />
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setEditActive(v => !v)}
                style={{ padding: '9px 18px', borderRadius: 9999, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: editActive ? 'rgba(13,115,119,0.1)' : 'rgba(0,0,0,0.06)', color: editActive ? teal : '#94A3B8', transition: 'all 0.15s ease' }}
              >
                {editActive ? 'Aktiv' : 'Inaktiv'}
              </button>
            </div>
            <button onClick={saveAthlete} disabled={saving || !editName.trim()} className="btn-primary" style={{ width: '100%', padding: 14, fontSize: 15, opacity: editName.trim() ? 1 : 0.4, marginBottom: 10 }}>
              {saving ? 'Sparar...' : 'Spara ändringar'}
            </button>

            {/* Invite */}
            <div style={{ margin: '10px 0', padding: 16, background: 'rgba(13,115,119,0.05)', borderRadius: 14, border: '1px solid rgba(13,115,119,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <UserPlus size={15} color={teal} strokeWidth={2.2} />
                <span style={{ fontSize: 13, fontWeight: 700, color: teal }}>Bjud in till appen</span>
              </div>
              {inviteMessage && (
                <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontSize: 12, fontWeight: 500, background: inviteMessage.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(13,115,119,0.08)', color: inviteMessage.type === 'error' ? '#DC2626' : teal }}>
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
              <button onClick={() => setConfirmDelete(true)} style={{ width: '100%', padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer', borderRadius: 14, background: 'rgba(220,38,38,0.08)', border: 'none', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Trash2 size={14} strokeWidth={2.5} /> Ta bort atlet
              </button>
            ) : (
              <div style={{ background: 'rgba(220,38,38,0.07)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', marginBottom: 12, textAlign: 'center' }}>Ta bort {athlete.name}?</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: 11, borderRadius: 12, background: 'rgba(0,0,0,0.06)', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Avbryt</button>
                  <button onClick={deleteAthlete} disabled={saving} style={{ flex: 1, padding: 11, borderRadius: 12, background: '#DC2626', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'white' }}>
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
