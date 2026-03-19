'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Pencil, Trash2, X } from 'lucide-react'

interface Group {
  id: string
  name: string
  color: string | null
}

interface Athlete {
  id: string
  name: string
  email: string | null
  active: boolean
  group_id: string
}

const GROUP_COLORS = ['#0D7377','#D4A017','#6366F1','#EC4899','#10B981','#F97316','#3B82F6','#8B5CF6']

export default function GroupPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string
  const supabase = createClient()

  const [group, setGroup] = useState<Group | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  // Edit group
  const [showEditGroup, setShowEditGroup] = useState(false)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupColor, setEditGroupColor] = useState('#0D7377')
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false)

  // Edit athlete
  const [editAthlete, setEditAthlete] = useState<Athlete | null>(null)
  const [editAthleteName, setEditAthleteName] = useState('')
  const [editAthleteEmail, setEditAthleteEmail] = useState('')
  const [editAthleteActive, setEditAthleteActive] = useState(true)
  const [confirmDeleteAthlete, setConfirmDeleteAthlete] = useState(false)

  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [{ data: groupData }, { data: athleteData }] = await Promise.all([
      supabase.from('groups').select('*').eq('id', groupId).single(),
      supabase.from('athletes').select('*').eq('group_id', groupId).order('name'),
    ])
    if (groupData) setGroup(groupData)
    if (athleteData) setAthletes(athleteData)
    setLoading(false)
  }

  useEffect(() => { load() }, [groupId])

  // ── Group ────────────────────────────────────────────────────────────────────

  const openEditGroup = () => {
    if (!group) return
    setEditGroupName(group.name)
    setEditGroupColor(group.color ?? '#0D7377')
    setConfirmDeleteGroup(false)
    setShowEditGroup(true)
  }

  const saveGroup = async () => {
    if (!group || !editGroupName.trim()) return
    setSaving(true)
    await supabase.from('groups').update({ name: editGroupName.trim(), color: editGroupColor }).eq('id', group.id)
    setSaving(false)
    setShowEditGroup(false)
    load()
  }

  const deleteGroup = async () => {
    if (!group) return
    setSaving(true)
    await supabase.from('athletes').update({ group_id: null }).eq('group_id', group.id)
    await supabase.from('groups').delete().eq('id', group.id)
    setSaving(false)
    router.replace('/groups')
  }

  // ── Athlete ──────────────────────────────────────────────────────────────────

  const openEditAthlete = (a: Athlete) => {
    setEditAthlete(a)
    setEditAthleteName(a.name)
    setEditAthleteEmail(a.email ?? '')
    setEditAthleteActive(a.active)
    setConfirmDeleteAthlete(false)
  }

  const saveAthlete = async () => {
    if (!editAthlete || !editAthleteName.trim()) return
    setSaving(true)
    await supabase.from('athletes').update({
      name: editAthleteName.trim(),
      email: editAthleteEmail.trim() || null,
      active: editAthleteActive,
    }).eq('id', editAthlete.id)
    setSaving(false)
    setEditAthlete(null)
    load()
  }

  const deleteAthlete = async () => {
    if (!editAthlete) return
    setSaving(true)
    await supabase.from('athletes').delete().eq('id', editAthlete.id)
    setSaving(false)
    setEditAthlete(null)
    load()
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#94A3B8' }}>
      Laddar grupp...
    </div>
  )

  if (!group) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Gruppen hittades inte</div>
  )

  const groupColor = group.color || '#0D7377'

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
          <div style={{ width: 44, height: 44, borderRadius: 15, background: `${groupColor}18`, border: `2px solid ${groupColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: groupColor }}>{group.name.charAt(0)}</span>
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{group.name}</h1>
            <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>{athletes.length} atleter</p>
          </div>
          <button
            onClick={openEditGroup}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Pencil size={15} color="#64748B" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Athletes */}
      <div style={{ padding: '0 16px' }}>
        {athletes.length === 0 ? (
          <div className="glass-card" style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>
            Inga atleter i denna grupp
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {athletes.map((athlete, ii) => (
              <button
                key={athlete.id}
                onClick={() => openEditAthlete(athlete)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: ii < athletes.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 14, background: `${groupColor}18`, border: `1.5px solid ${groupColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 14 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: groupColor }}>{athlete.name.charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: athlete.active ? '#0F172A' : '#94A3B8' }}>{athlete.name}</div>
                  {athlete.email && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{athlete.email}</div>}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 9999, background: athlete.active ? 'rgba(13,115,119,0.1)' : 'rgba(0,0,0,0.05)', color: athlete.active ? '#0D7377' : '#94A3B8', flexShrink: 0 }}>
                  {athlete.active ? 'Aktiv' : 'Inaktiv'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit group sheet ─────────────────────────────────────────────────────── */}
      {showEditGroup && (
        <>
          <div onClick={() => setShowEditGroup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, padding: '16px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Redigera grupp</h2>
              <button onClick={() => setShowEditGroup(false)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>
            <input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} placeholder="Namn på gruppen..." className="glass-input" style={{ width: '100%', padding: '12px 14px', fontSize: 15, marginBottom: 18 }} autoFocus />
            <div style={{ marginBottom: 22 }}>
              <div className="text-label" style={{ marginBottom: 10 }}>Färg</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {GROUP_COLORS.map(c => (
                  <button key={c} onClick={() => setEditGroupColor(c)} style={{ width: 36, height: 36, borderRadius: '50%', background: c, border: editGroupColor === c ? '3px solid #0F172A' : '3px solid transparent', cursor: 'pointer', boxShadow: editGroupColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none', transition: 'all 0.15s ease' }} />
                ))}
              </div>
            </div>
            <button onClick={saveGroup} disabled={saving || !editGroupName.trim()} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, cursor: 'pointer', opacity: editGroupName.trim() ? 1 : 0.4, marginBottom: 10 }}>
              {saving ? 'Sparar...' : 'Spara ändringar'}
            </button>
            {!confirmDeleteGroup ? (
              <button onClick={() => setConfirmDeleteGroup(true)} style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', borderRadius: 14, background: 'rgba(220,38,38,0.08)', border: 'none', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Trash2 size={14} strokeWidth={2.5} /> Ta bort grupp
              </button>
            ) : (
              <div style={{ background: 'rgba(220,38,38,0.07)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', marginBottom: 4, textAlign: 'center' }}>Ta bort {group.name}?</p>
                <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, textAlign: 'center' }}>Atleterna i gruppen behålls men blir otilldelade</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDeleteGroup(false)} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(0,0,0,0.06)', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Avbryt</button>
                  <button onClick={deleteGroup} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: 12, background: '#DC2626', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'white' }}>
                    {saving ? 'Tar bort...' : 'Ta bort'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Edit athlete sheet ───────────────────────────────────────────────────── */}
      {editAthlete && (
        <>
          <div onClick={() => setEditAthlete(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, padding: '16px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Redigera atlet</h2>
              <button onClick={() => setEditAthlete(null)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>
            <input value={editAthleteName} onChange={e => setEditAthleteName(e.target.value)} placeholder="Namn *" className="glass-input" style={{ width: '100%', padding: '12px 14px', fontSize: 15, marginBottom: 10 }} autoFocus />
            <input value={editAthleteEmail} onChange={e => setEditAthleteEmail(e.target.value)} placeholder="E-post (valfritt)" className="glass-input" style={{ width: '100%', padding: '12px 14px', fontSize: 15, marginBottom: 16 }} />
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setEditAthleteActive(a => !a)}
                style={{ padding: '9px 18px', borderRadius: 9999, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: editAthleteActive ? 'rgba(13,115,119,0.1)' : 'rgba(0,0,0,0.06)', color: editAthleteActive ? '#0D7377' : '#94A3B8', transition: 'all 0.15s ease' }}
              >
                {editAthleteActive ? 'Aktiv' : 'Inaktiv'}
              </button>
            </div>
            <button onClick={saveAthlete} disabled={saving || !editAthleteName.trim()} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, cursor: 'pointer', opacity: editAthleteName.trim() ? 1 : 0.4, marginBottom: 10 }}>
              {saving ? 'Sparar...' : 'Spara ändringar'}
            </button>
            {!confirmDeleteAthlete ? (
              <button onClick={() => setConfirmDeleteAthlete(true)} style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', borderRadius: 14, background: 'rgba(220,38,38,0.08)', border: 'none', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Trash2 size={14} strokeWidth={2.5} /> Ta bort atlet
              </button>
            ) : (
              <div style={{ background: 'rgba(220,38,38,0.07)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', marginBottom: 12, textAlign: 'center' }}>Ta bort {editAthlete.name}?</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDeleteAthlete(false)} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(0,0,0,0.06)', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Avbryt</button>
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
