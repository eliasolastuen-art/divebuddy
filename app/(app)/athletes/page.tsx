'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/context/user'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, ChevronDown, ChevronRight, Check } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface Group {
  id: string
  name: string
  color: string
}

interface Athlete {
  id: string
  name: string
  email: string | null
  active: boolean
  profile_id: string | null
  group_id: string | null
  groups: { id: string; name: string; color: string } | null
}

type StatusFilter = 'all' | 'active' | 'invited' | 'uninvited'

// ── Helpers ────────────────────────────────────────────────────
function initials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function athleteStatus(a: Athlete): 'active' | 'invited' | 'uninvited' {
  if (a.profile_id) return 'active'
  if (a.email) return 'invited'
  return 'uninvited'
}

// ── Toast component ────────────────────────────────────────────
function Toast({ text, type }: { text: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      position: 'fixed',
      top: 'max(16px, env(safe-area-inset-top, 16px))',
      left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000,
      background: type === 'success' ? '#0D7377' : '#DC2626',
      color: 'white', borderRadius: 14,
      padding: '10px 20px', fontSize: 13, fontWeight: 600,
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      whiteSpace: 'nowrap', pointerEvents: 'none',
    }}>
      {type === 'success' ? '✓ ' : '✗ '}{text}
    </div>
  )
}

// ── Sheet backdrop ─────────────────────────────────────────────
function SheetBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 40,
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
    />
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function AthletesPage() {
  const router = useRouter()
  const { profile, roles, loading: userLoading } = useUser()
  const supabase = createClient()

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [inviteSending, setInviteSending] = useState<string | null>(null)
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set())

  // Sheets
  const [detailAthlete, setDetailAthlete] = useState<Athlete | null>(null)
  const [editEmailAthlete, setEditEmailAthlete] = useState<Athlete | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)

  // Detail sheet form
  const [detailEmail, setDetailEmail] = useState('')
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null)
  const [detailSaving, setDetailSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Edit email form
  const [editEmailValue, setEditEmailValue] = useState('')
  const [editEmailSaving, setEditEmailSaving] = useState(false)

  // Add athlete form
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addGroupId, setAddGroupId] = useState<string | null>(null)
  const [addSaving, setAddSaving] = useState(false)

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    if (!userLoading && !roles.includes('coach') && !roles.includes('admin')) {
      router.replace('/dashboard')
    }
  }, [userLoading, roles, router])

  // ── Data fetch ────────────────────────────────────────────
  async function fetchData() {
    if (!profile?.club_id) return
    setDataLoading(true)
    const [{ data: ath }, { data: grp }] = await Promise.all([
      supabase
        .from('athletes')
        .select('id, name, email, active, profile_id, group_id, groups(id, name, color)')
        .eq('club_id', profile.club_id)
        .order('name'),
      supabase
        .from('groups')
        .select('id, name, color')
        .eq('club_id', profile.club_id),
    ])
    setAthletes((ath as unknown as Athlete[]) ?? [])
    setGroups((grp as Group[]) ?? [])
    setDataLoading(false)
  }

  useEffect(() => { fetchData() }, [profile?.club_id])

  // ── Toast helper ──────────────────────────────────────────
  function showToast(text: string, type: 'success' | 'error' = 'success') {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Send invite ───────────────────────────────────────────
  async function sendInvite(athlete: Athlete) {
    if (!athlete.email) return
    setInviteSending(athlete.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            athlete_id: athlete.id,
            email: athlete.email,
            athlete_name: athlete.name,
            role: 'athlete',
          }),
        }
      )
      if (res.ok) {
        setSentInvites(prev => new Set(prev).add(athlete.id))
        showToast('Inbjudan skickad till ' + athlete.email)
      } else {
        showToast('Kunde inte skicka — försök igen', 'error')
      }
    } catch {
      showToast('Kunde inte skicka — försök igen', 'error')
    } finally {
      setInviteSending(null)
    }
  }

  // ── Open detail sheet ─────────────────────────────────────
  function openDetail(athlete: Athlete) {
    setDetailAthlete(athlete)
    setDetailEmail(athlete.email ?? '')
    setDetailGroupId(athlete.group_id)
    setConfirmDelete(false)
  }

  // ── Save detail changes ───────────────────────────────────
  async function saveDetail() {
    if (!detailAthlete) return
    setDetailSaving(true)
    const { error } = await supabase
      .from('athletes')
      .update({ email: detailEmail || null, group_id: detailGroupId })
      .eq('id', detailAthlete.id)
    if (error) {
      showToast('Kunde inte spara — försök igen', 'error')
    } else {
      showToast('Ändringar sparade')
      setDetailAthlete(null)
      fetchData()
    }
    setDetailSaving(false)
  }

  // ── Delete athlete ────────────────────────────────────────
  async function deleteAthlete() {
    if (!detailAthlete) return
    const { error } = await supabase
      .from('athletes')
      .delete()
      .eq('id', detailAthlete.id)
    if (error) {
      showToast('Kunde inte ta bort — försök igen', 'error')
    } else {
      showToast('Atlet borttagen')
      setDetailAthlete(null)
      setAthletes(prev => prev.filter(a => a.id !== detailAthlete.id))
    }
  }

  // ── Save email edit ───────────────────────────────────────
  async function saveEmail() {
    if (!editEmailAthlete) return
    setEditEmailSaving(true)
    const { error } = await supabase
      .from('athletes')
      .update({ email: editEmailValue.trim() || null })
      .eq('id', editEmailAthlete.id)
    if (error) {
      showToast('Kunde inte spara — försök igen', 'error')
    } else {
      showToast('Mailadress sparad')
      setEditEmailAthlete(null)
      fetchData()
    }
    setEditEmailSaving(false)
  }

  // ── Add athlete ───────────────────────────────────────────
  async function addAthlete() {
    if (!addName.trim() || !addGroupId || !profile?.club_id) return
    setAddSaving(true)
    const { data, error } = await supabase
      .from('athletes')
      .insert({
        name: addName.trim(),
        email: addEmail.trim() || null,
        group_id: addGroupId,
        club_id: profile.club_id,
        active: true,
      })
      .select('id, name, email, active, profile_id, group_id, groups(id, name, color)')
      .single()
    if (error) {
      showToast('Kunde inte lägga till — försök igen', 'error')
      setAddSaving(false)
      return
    }
    setShowAddSheet(false)
    setAddName('')
    setAddEmail('')
    setAddGroupId(null)
    await fetchData()
    if (addEmail.trim() && data) {
      await sendInvite(data as unknown as Athlete)
    }
    setAddSaving(false)
  }

  // ── Filtered + grouped athletes ───────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return athletes.filter(a => {
      if (q && !a.name.toLowerCase().includes(q)) return false
      if (statusFilter === 'active') return !!a.profile_id
      if (statusFilter === 'invited') return !a.profile_id && !!a.email
      if (statusFilter === 'uninvited') return !a.email && !a.profile_id
      return true
    })
  }, [athletes, search, statusFilter])

  const grouped = useMemo(() => {
    const map = new Map<string | null, Athlete[]>()
    for (const a of filtered) {
      const key = a.group_id ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [filtered])

  // Groups sorted by name, no-group at end
  const sortedGroupIds = useMemo(() => {
    const ids = groups
      .filter(g => grouped.has(g.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(g => g.id)
    if (grouped.has(null)) ids.push(null as unknown as string)
    return ids
  }, [groups, grouped])

  if (userLoading) return null

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--surface-bg)' }}>

      {toast && <Toast text={toast.text} type={toast.type} />}

      {/* ── Sticky Header ──────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(245,244,241,0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '12px 16px',
      }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
            Atleter
          </span>
          <button
            onClick={() => setShowAddSheet(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#0D7377', color: 'white',
              border: 'none', borderRadius: 20,
              padding: '8px 14px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Lägg till atlet
          </button>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 16px)',
        maxWidth: 480, width: '100%', margin: '0 auto',
      }}>

        {/* Search */}
        <input
          className="glass-input"
          placeholder="Sök atlet..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', marginBottom: 12 }}
        />

        {/* Status filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
          {([
            { key: 'all',       label: 'Alla' },
            { key: 'active',    label: '✓ Aktiva' },
            { key: 'invited',   label: '✉ Inbjudna' },
            { key: 'uninvited', label: '⚠ Ej inbjudna' },
          ] as { key: StatusFilter; label: string }[]).map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={statusFilter === f.key ? 'chip chip-active' : 'chip chip-inactive'}
              style={{ whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Athlete list grouped by group */}
        {dataLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 72, borderRadius: 14, background: 'rgba(0,0,0,0.05)' }} />
            ))}
          </div>
        ) : sortedGroupIds.length === 0 ? (
          <div style={{
            textAlign: 'center', color: '#94A3B8',
            fontSize: 14, padding: '40px 0',
          }}>
            Inga atleter hittades
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sortedGroupIds.map(gid => {
              const group = groups.find(g => g.id === gid) ?? null
              const groupAthletes = grouped.get(gid ?? null) ?? []
              const collapsed = collapsedGroups.has(gid ?? 'null')

              return (
                <div key={gid ?? 'null'} style={{ marginBottom: 8 }}>
                  {/* Group header */}
                  <button
                    onClick={() => setCollapsedGroups(prev => {
                      const next = new Set(prev)
                      const k = gid ?? 'null'
                      next.has(k) ? next.delete(k) : next.add(k)
                      return next
                    })}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '6px 4px 8px', textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: group?.color ?? '#94A3B8', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
                        {group?.name ?? 'Ingen grupp tilldelad'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        background: 'rgba(0,0,0,0.07)', color: '#64748B',
                        borderRadius: 20, padding: '2px 8px',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {groupAthletes.length}
                      </span>
                      {collapsed
                        ? <ChevronRight size={14} color="#94A3B8" />
                        : <ChevronDown size={14} color="#94A3B8" />
                      }
                    </div>
                  </button>

                  {/* Athlete cards */}
                  {!collapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {groupAthletes.map(athlete => {
                        const status = athleteStatus(athlete)
                        const avatarBg = status === 'active' ? '#0D7377' : status === 'invited' ? '#D97706' : '#94A3B8'
                        const sent = sentInvites.has(athlete.id)
                        const sending = inviteSending === athlete.id

                        return (
                          <div
                            key={athlete.id}
                            onClick={() => openDetail(athlete)}
                            style={{
                              background: 'rgba(255,255,255,0.9)',
                              borderRadius: 14,
                              border: '1px solid rgba(255,255,255,0.8)',
                              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                              padding: '12px 14px',
                              display: 'flex', alignItems: 'center', gap: 12,
                              cursor: 'pointer',
                            }}
                          >
                            {/* Avatar */}
                            <div style={{
                              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                              background: avatarBg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontSize: 14, fontWeight: 700,
                            }}>
                              {initials(athlete.name)}
                            </div>

                            {/* Name + email + status */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {athlete.name}
                              </div>
                              {athlete.email && (
                                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {athlete.email}
                                </div>
                              )}
                              <div style={{
                                display: 'inline-block', marginTop: 3,
                                fontSize: 11, fontWeight: 600,
                                padding: '2px 7px', borderRadius: 20,
                                background: status === 'active'
                                  ? 'rgba(16,185,129,0.12)'
                                  : status === 'invited'
                                    ? 'rgba(217,119,6,0.12)'
                                    : 'rgba(148,163,184,0.15)',
                                color: status === 'active' ? '#059669' : status === 'invited' ? '#D97706' : '#64748B',
                              }}>
                                {status === 'active' ? 'Aktiv' : status === 'invited' ? 'Inbjuden' : 'Ej inbjuden'}
                              </div>
                            </div>

                            {/* Action button */}
                            <div onClick={e => e.stopPropagation()}>
                              {status === 'active' ? (
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>Aktiv ✓</span>
                              ) : status === 'invited' ? (
                                sent ? (
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Skickad ✓</span>
                                ) : (
                                  <button
                                    onClick={() => sendInvite(athlete)}
                                    disabled={sending}
                                    style={{
                                      fontSize: 12, fontWeight: 700,
                                      color: sending ? '#94A3B8' : '#0D7377',
                                      background: 'none',
                                      border: `1.5px solid ${sending ? '#CBD5E1' : '#0D7377'}`,
                                      borderRadius: 20, padding: '5px 11px',
                                      cursor: sending ? 'default' : 'pointer',
                                    }}
                                  >
                                    {sending ? '...' : 'Bjud in'}
                                  </button>
                                )
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditEmailAthlete(athlete)
                                    setEditEmailValue('')
                                  }}
                                  style={{
                                    fontSize: 12, fontWeight: 700, color: '#64748B',
                                    background: 'none',
                                    border: '1.5px solid #CBD5E1',
                                    borderRadius: 20, padding: '5px 11px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Lägg till mail
                                </button>
                              )}
                            </div>

                            {/* Extra "Välj grupp" button for ungrouped */}
                            {!gid && (
                              <div onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => openDetail(athlete)}
                                  style={{
                                    fontSize: 12, fontWeight: 600, color: '#0D7377',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    padding: '5px 0', whiteSpace: 'nowrap',
                                  }}
                                >
                                  Välj grupp →
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Athlete Detail Sheet ────────────────────────────── */}
      {detailAthlete && (
        <>
          <SheetBackdrop onClose={() => setDetailAthlete(null)} />
          <div className="glass-sheet" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            padding: '20px 20px',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
            maxWidth: 480, margin: '0 auto',
          }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '0 auto 18px' }} />

            {/* Close button */}
            <button
              onClick={() => setDetailAthlete(null)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <X size={20} color="#94A3B8" />
            </button>

            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: athleteStatus(detailAthlete) === 'active' ? '#0D7377' : athleteStatus(detailAthlete) === 'invited' ? '#D97706' : '#94A3B8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 18, fontWeight: 700, flexShrink: 0,
              }}>
                {initials(detailAthlete.name)}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>{detailAthlete.name}</div>
                <div style={{
                  display: 'inline-block', marginTop: 4,
                  fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: athleteStatus(detailAthlete) === 'active' ? 'rgba(16,185,129,0.12)' : athleteStatus(detailAthlete) === 'invited' ? 'rgba(217,119,6,0.12)' : 'rgba(148,163,184,0.15)',
                  color: athleteStatus(detailAthlete) === 'active' ? '#059669' : athleteStatus(detailAthlete) === 'invited' ? '#D97706' : '#64748B',
                }}>
                  {athleteStatus(detailAthlete) === 'active' ? 'Aktiv' : athleteStatus(detailAthlete) === 'invited' ? 'Inbjuden' : 'Ej inbjuden'}
                </div>
              </div>
            </div>

            {/* Email field */}
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4 }}>
              E-post
            </label>
            <input
              className="glass-input"
              type="email"
              placeholder="atlet@email.com"
              value={detailEmail}
              onChange={e => setDetailEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', marginBottom: 16 }}
            />

            {/* Group picker */}
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 8 }}>
              Grupp
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setDetailGroupId(g.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 13px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    border: detailGroupId === g.id ? 'none' : '1.5px solid rgba(0,0,0,0.1)',
                    background: detailGroupId === g.id ? g.color : 'rgba(255,255,255,0.7)',
                    color: detailGroupId === g.id ? 'white' : '#0F172A',
                    cursor: 'pointer',
                  }}
                >
                  {detailGroupId === g.id && <Check size={12} strokeWidth={3} />}
                  {g.name}
                </button>
              ))}
              <button
                onClick={() => setDetailGroupId(null)}
                style={{
                  padding: '7px 13px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  border: detailGroupId === null ? 'none' : '1.5px solid rgba(0,0,0,0.1)',
                  background: detailGroupId === null ? '#94A3B8' : 'rgba(255,255,255,0.7)',
                  color: detailGroupId === null ? 'white' : '#0F172A',
                  cursor: 'pointer',
                }}
              >
                Ingen grupp
              </button>
            </div>

            {/* Save */}
            <button
              className="btn-primary"
              onClick={saveDetail}
              disabled={detailSaving}
              style={{ width: '100%', padding: '13px', marginBottom: 10 }}
            >
              {detailSaving ? 'Sparar...' : 'Spara ändringar'}
            </button>

            {/* Send invite if applicable */}
            {detailAthlete.email && !detailAthlete.profile_id && (
              <button
                onClick={() => { sendInvite(detailAthlete); setDetailAthlete(null) }}
                style={{
                  width: '100%', padding: '13px', marginBottom: 10,
                  background: 'rgba(13,115,119,0.1)', color: '#0D7377',
                  border: '1.5px solid rgba(13,115,119,0.25)', borderRadius: 14,
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Skicka inbjudan
              </button>
            )}

            {/* Danger zone */}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  color: '#DC2626', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', padding: '8px',
                }}
              >
                Ta bort atlet
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '11px', fontSize: 14 }}
                >
                  Avbryt
                </button>
                <button
                  onClick={deleteAthlete}
                  style={{
                    flex: 1, padding: '11px', borderRadius: 14, border: 'none',
                    background: '#DC2626', color: 'white',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Bekräfta
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Edit Email Sheet ────────────────────────────────── */}
      {editEmailAthlete && (
        <>
          <SheetBackdrop onClose={() => setEditEmailAthlete(null)} />
          <div className="glass-sheet" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            padding: '20px 20px',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
            maxWidth: 480, margin: '0 auto',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '0 auto 18px' }} />
            <button
              onClick={() => setEditEmailAthlete(null)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <X size={20} color="#94A3B8" />
            </button>

            <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
              Lägg till mailadress
            </div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 16 }}>
              för {editEmailAthlete.name}
            </div>

            <input
              className="glass-input"
              type="email"
              placeholder="atlet@email.com"
              value={editEmailValue}
              onChange={e => setEditEmailValue(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', marginBottom: 14 }}
              autoFocus
            />

            <button
              className="btn-primary"
              onClick={saveEmail}
              disabled={editEmailSaving || !editEmailValue.trim()}
              style={{ width: '100%', padding: '13px' }}
            >
              {editEmailSaving ? 'Sparar...' : 'Spara'}
            </button>
          </div>
        </>
      )}

      {/* ── Add Athlete Sheet ───────────────────────────────── */}
      {showAddSheet && (
        <>
          <SheetBackdrop onClose={() => setShowAddSheet(false)} />
          <div className="glass-sheet" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            padding: '20px 20px',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
            maxWidth: 480, margin: '0 auto',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '0 auto 18px' }} />
            <button
              onClick={() => setShowAddSheet(false)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <X size={20} color="#94A3B8" />
            </button>

            <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', marginBottom: 18 }}>
              Lägg till atlet
            </div>

            {/* Name */}
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4 }}>
              Namn <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              className="glass-input"
              placeholder="Förnamn Efternamn"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', marginBottom: 14 }}
            />

            {/* Email */}
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4 }}>
              E-post <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>(valfritt)</span>
            </label>
            <input
              className="glass-input"
              type="email"
              placeholder="atlet@email.com"
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', marginBottom: 4 }}
            />
            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 14 }}>
              Lägg till för att kunna bjuda in
            </div>

            {/* Group picker */}
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 8 }}>
              Grupp <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setAddGroupId(g.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 13px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    border: addGroupId === g.id ? 'none' : '1.5px solid rgba(0,0,0,0.1)',
                    background: addGroupId === g.id ? g.color : 'rgba(255,255,255,0.7)',
                    color: addGroupId === g.id ? 'white' : '#0F172A',
                    cursor: 'pointer',
                  }}
                >
                  {addGroupId === g.id && <Check size={12} strokeWidth={3} />}
                  {g.name}
                </button>
              ))}
            </div>

            <button
              className="btn-primary"
              onClick={addAthlete}
              disabled={addSaving || !addName.trim() || !addGroupId}
              style={{ width: '100%', padding: '13px', marginBottom: 12 }}
            >
              {addSaving ? 'Lägger till...' : 'Lägg till'}
            </button>

            <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
              Atlet utan mail kan läggas till manuellt och bjudas in senare
            </div>
          </div>
        </>
      )}
    </div>
  )
}
