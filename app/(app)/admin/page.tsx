'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/context/user'
import { createClient } from '@/lib/supabase/client'
import { removeMemberFromClub, deleteInvite } from '@/lib/actions/adminActions'
import {
  Mail, Send, Shield, Trash2, Clock,
  CheckCircle, AlertCircle, Plus, X, Check,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  admin:   'Admin',
  coach:   'Tränare',
  athlete: 'Atlet',
}

const ROLE_COLOR: Record<string, { bg: string; color: string }> = {
  admin:   { bg: 'rgba(147,51,234,0.12)',  color: '#9333EA' },
  coach:   { bg: 'rgba(13,115,119,0.10)',  color: '#0D7377' },
  athlete: { bg: 'rgba(245,158,11,0.12)',  color: '#D97706' },
}

// ── Interfaces ────────────────────────────────────────────────
interface Member {
  id: string
  email: string
  full_name: string | null
  user_roles: { role: string }[]
}

interface Invite {
  id: string
  email: string
  roles: string[]
  created_at: string
}

interface AthleteRow {
  id: string
  name: string
  email: string | null
  active: boolean
  profile_id: string | null
  group_id: string | null
  group_name: string | null
  group_color: string | null
}

interface GroupRow {
  id: string
  name: string
  color: string
}

// ── Helpers ───────────────────────────────────────────────────
function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function SkeletonLine({ w = '60%', h = 12 }: { w?: string; h?: number }) {
  return (
    <div style={{ height: h, background: '#F1F5F9', borderRadius: 6, width: w }} />
  )
}

// ── Component ─────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const { roles, profile, loading } = useUser()

  // ── Existing state ────────────────────────────────────────
  const [inviteEmail, setInviteEmail]     = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [sending, setSending]             = useState(false)
  const [message, setMessage]             = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [members, setMembers]             = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([])
  const [removingId, setRemovingId]       = useState<string | null>(null)

  // ── New state ────────────────────────────────────────────
  const [athletes, setAthletes]     = useState<AthleteRow[]>([])
  const [allGroups, setAllGroups]   = useState<GroupRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Athlete invite state
  const [inviteSending, setInviteSending] = useState<string | null>(null)
  const [sentInvites, setSentInvites]     = useState<Set<string>>(new Set())

  // Athlete linking sheet
  const [linkAthlete, setLinkAthlete]               = useState<AthleteRow | null>(null)
  const [linkProfileId, setLinkProfileId]           = useState<string | null>(null)
  const [linkGroupId, setLinkGroupId]               = useState<string | null>(null)
  const [linkSaving, setLinkSaving]                 = useState(false)

  // Add-role sheet
  const [addRoleForId, setAddRoleForId] = useState<string | null>(null)
  const [addingRole, setAddingRole]     = useState(false)

  // ── Toast helper ──────────────────────────────────────────
  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Role check ────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !roles.includes('admin')) {
      router.replace('/dashboard')
    }
  }, [loading, roles, router])

  useEffect(() => {
    if (profile?.club_id) fetchAll()
  }, [profile])

  // ── Data fetch ────────────────────────────────────────────
  async function fetchAll() {
    const supabase = createClient()
    setDataLoading(true)
    setFetchError(null)

    const [memberRes, inviteRes, athleteRes, groupRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, user_roles(role)')
        .eq('club_id', profile!.club_id),
      supabase
        .from('invites')
        .select('id, email, roles, created_at')
        .eq('club_id', profile!.club_id)
        .eq('accepted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('athletes')
        .select('id, name, email, active, profile_id, group_id, groups(id, name, color)')
        .eq('club_id', profile!.club_id)
        .order('name'),
      supabase
        .from('groups')
        .select('id, name, color')
        .eq('club_id', profile!.club_id),
    ])

    if (memberRes.error || athleteRes.error || groupRes.error) {
      setFetchError('Kunde inte ladda data. Försök igen.')
      setDataLoading(false)
      return
    }

    setMembers((memberRes.data ?? []) as Member[])
    setPendingInvites(inviteRes.data ?? [])

    setAthletes(
      (athleteRes.data ?? []).map((a: any) => {
        const g = Array.isArray(a.groups) ? a.groups[0] : a.groups
        return {
          id: a.id,
          name: a.name,
          email: a.email ?? null,
          active: a.active,
          profile_id: a.profile_id ?? null,
          group_id: a.group_id ?? null,
          group_name: g?.name ?? null,
          group_color: g?.color ?? null,
        }
      })
    )
    setAllGroups((groupRes.data ?? []) as GroupRow[])
    setDataLoading(false)
  }

  // ── Existing actions ──────────────────────────────────────
  function toggleInviteRole(role: string) {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  async function sendInvite() {
    const normalized = inviteEmail.toLowerCase().trim()
    if (!normalized || selectedRoles.length === 0) {
      setMessage({ type: 'error', text: 'Ange e-post och välj minst en roll.' })
      return
    }
    if (members.some(m => m.email?.toLowerCase() === normalized)) {
      setMessage({ type: 'error', text: 'Den här personen är redan medlem i klubben.' })
      return
    }
    if (pendingInvites.some(i => i.email.toLowerCase() === normalized)) {
      setMessage({ type: 'error', text: 'Det finns redan en väntande inbjudan till den här e-posten.' })
      return
    }
    setSending(true)
    setMessage(null)
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized, roles: selectedRoles, clubId: profile!.club_id }),
    })
    const result = await res.json()
    if (!res.ok) {
      setMessage({ type: 'error', text: result.error ?? 'Kunde inte skicka inbjudan.' })
    } else {
      setMessage({ type: 'success', text: `Inbjudan skickad till ${normalized}` })
      setInviteEmail('')
      setSelectedRoles([])
      fetchAll()
    }
    setSending(false)
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Ta bort den här personen från klubben?')) return
    setRemovingId(memberId)
    await removeMemberFromClub(memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
    setRemovingId(null)
    showToast('success', 'Medlem borttagen')
  }

  async function handleDeleteInvite(inviteId: string) {
    setRemovingId(inviteId)
    await deleteInvite(inviteId)
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId))
    setRemovingId(null)
    showToast('success', 'Inbjudan borttagen')
  }

  // ── Athlete linking ───────────────────────────────────────
  function openLinkSheet(athlete: AthleteRow) {
    setLinkAthlete(athlete)
    setLinkProfileId(null)
    setLinkGroupId(athlete.group_id)
  }

  async function saveLinking() {
    if (!linkAthlete) return
    const supabase = createClient()
    setLinkSaving(true)

    const updates: Record<string, string | null> = {}
    if (linkProfileId) updates.profile_id = linkProfileId
    if (linkGroupId !== linkAthlete.group_id) updates.group_id = linkGroupId

    if (Object.keys(updates).length === 0) {
      setLinkAthlete(null)
      setLinkSaving(false)
      return
    }

    const { error } = await supabase
      .from('athletes')
      .update(updates)
      .eq('id', linkAthlete.id)

    setLinkSaving(false)
    if (error) {
      showToast('error', 'Kunde inte spara ändringar')
    } else {
      showToast('success', 'Atlet uppdaterad')
      setLinkAthlete(null)
      fetchAll()
    }
  }

  // ── Role management ───────────────────────────────────────
  async function addRole(profileId: string, role: string) {
    const supabase = createClient()
    setAddingRole(true)
    const { error } = await supabase
      .from('user_roles')
      .insert({ profile_id: profileId, role })
    setAddingRole(false)
    setAddRoleForId(null)
    if (error) {
      showToast('error', 'Kunde inte lägga till roll')
    } else {
      showToast('success', `Roll "${ROLE_LABEL[role]}" tillagd`)
      fetchAll()
    }
  }

  async function removeRole(profileId: string, role: string) {
    if (!confirm(`Ta bort rollen "${ROLE_LABEL[role]}"?`)) return
    const supabase = createClient()
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('profile_id', profileId)
      .eq('role', role)
    if (error) {
      showToast('error', 'Kunde inte ta bort roll')
    } else {
      showToast('success', `Roll borttagen`)
      fetchAll()
    }
  }

  // ── Athlete invite ────────────────────────────────────────
  async function sendAthleteInvite(athlete: AthleteRow) {
    if (!athlete.email) return
    setInviteSending(athlete.id)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            athlete_id:   athlete.id,
            email:        athlete.email,
            athlete_name: athlete.name,
            club_name:    (profile as any)?.club_name ?? 'klubben',
            invited_by:   profile?.full_name ?? 'Din tränare',
          }),
        }
      )
      if (res.ok) {
        setSentInvites(prev => new Set(prev).add(athlete.id))
        showToast('success', `Inbjudan skickad till ${athlete.email}!`)
      } else {
        showToast('error', 'Kunde inte skicka — försök igen')
      }
    } catch {
      showToast('error', 'Kunde inte skicka — försök igen')
    } finally {
      setInviteSending(null)
    }
  }

  if (loading) return null

  // ── Computed ──────────────────────────────────────────────
  const uncoupledCount  = athletes.filter(a => !a.profile_id).length
  const addRoleProfile  = members.find(m => m.id === addRoleForId) ?? null

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* ── Toast ──────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 'max(16px, env(safe-area-inset-top, 16px))',
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 999,
          background: toast.type === 'success' ? '#0D7377' : '#DC2626',
          color: 'white', borderRadius: 14,
          padding: '10px 20px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {toast.type === 'success' ? '✓ ' : '✗ '}{toast.text}
        </div>
      )}

      {/* ── Sticky Header ──────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(245,244,241,0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '12px 16px',
      }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(13,115,119,0.25)',
          }}>
            <Shield size={16} color="white" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Admin
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
              Klubbadministration
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div style={{
        padding: '16px 16px',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 16px)',
        maxWidth: 480, width: '100%', margin: '0 auto',
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>

        {/* Fetch error */}
        {fetchError && (
          <div style={{
            padding: '12px 16px', borderRadius: 12,
            background: 'rgba(239,68,68,0.08)', color: '#DC2626',
            border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, fontWeight: 500,
          }}>
            {fetchError}
          </div>
        )}

        {/* ── Summary Cards ─────────────────────────────────── */}
        {dataLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <SkeletonLine w="40%" h={28} />
                <div style={{ marginTop: 6 }}><SkeletonLine w="70%" h={10} /></div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Totalt atleter',      value: athletes.length,  alert: false },
              { label: 'Atleter utan profil', value: uncoupledCount,   alert: uncoupledCount > 0 },
              { label: 'Antal profiler',      value: members.length,   alert: false },
              { label: 'Antal grupper',       value: allGroups.length, alert: false },
            ].map(card => (
              <div key={card.label} style={{
                background: 'white', borderRadius: 16, padding: '14px 16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: card.alert ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  fontSize: 30, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1,
                  color: card.alert ? '#D97706' : '#0D7377',
                }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginTop: 5 }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Athletes & Profile Linking ─────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Atleter &amp; Profillänkning
            </span>
            {!dataLoading && uncoupledCount > 0 && (
              <span style={{
                background: 'rgba(245,158,11,0.15)', color: '#D97706',
                borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700,
              }}>
                {uncoupledCount} ej kopplade
              </span>
            )}
          </div>

          {dataLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  background: 'white', borderRadius: 14, padding: '14px 16px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  display: 'flex', gap: 12, alignItems: 'center',
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: '#F1F5F9', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <SkeletonLine w="50%" h={12} />
                    <div style={{ marginTop: 6 }}><SkeletonLine w="30%" h={10} /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : athletes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 14 }}>
              Inga atleter registrerade
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {athletes.map(athlete => {
                const hasProfile = !!athlete.profile_id
                const linkedMember = hasProfile ? members.find(m => m.id === athlete.profile_id) : null
                return (
                  <div key={athlete.id} style={{
                    background: 'white', borderRadius: 14, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    border: hasProfile ? '1px solid rgba(0,0,0,0.04)' : '1px solid rgba(245,158,11,0.2)',
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                      background: hasProfile
                        ? 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)'
                        : 'rgba(148,163,184,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                      color: hasProfile ? 'white' : '#94A3B8',
                    }}>
                      {initials(athlete.name)}
                    </div>

                    {/* Name + pills */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700, color: '#0F172A',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {athlete.name}
                      </div>
                      {athlete.email && (
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{athlete.email}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                        {athlete.group_name ? (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                            background: `${athlete.group_color ?? '#94A3B8'}20`,
                            color: athlete.group_color ?? '#64748B',
                            border: `1px solid ${athlete.group_color ?? '#94A3B8'}30`,
                          }}>
                            {athlete.group_name}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                            background: 'rgba(148,163,184,0.1)', color: '#94A3B8',
                          }}>
                            Ingen grupp
                          </span>
                        )}
                        {linkedMember && (linkedMember.user_roles ?? []).map(r => (
                          <span key={r.role} style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                            background: ROLE_COLOR[r.role]?.bg ?? 'rgba(148,163,184,0.1)',
                            color: ROLE_COLOR[r.role]?.color ?? '#64748B',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            {ROLE_LABEL[r.role] ?? r.role}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: status + invite */}
                    {hasProfile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <CheckCircle size={14} color="#16A34A" strokeWidth={2.5} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#16A34A' }}>Kopplad</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <AlertCircle size={13} color="#D97706" strokeWidth={2} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#D97706' }}>Ej kopplad</span>
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {athlete.email && (
                            sentInvites.has(athlete.id) ? (
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 8,
                                background: 'rgba(148,163,184,0.1)', color: '#94A3B8',
                              }}>
                                Skickad ✓
                              </span>
                            ) : (
                              <button
                                onClick={() => sendAthleteInvite(athlete)}
                                disabled={inviteSending === athlete.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  background: 'rgba(13,115,119,0.08)', color: '#0D7377',
                                  border: 'none', borderRadius: 8, padding: '4px 9px',
                                  fontSize: 11, fontWeight: 700,
                                  cursor: inviteSending === athlete.id ? 'not-allowed' : 'pointer',
                                  opacity: inviteSending === athlete.id ? 0.6 : 1,
                                }}
                              >
                                <Send size={11} strokeWidth={2.2} />
                                {inviteSending === athlete.id ? '...' : 'Bjud in'}
                              </button>
                            )
                          )}
                          <button
                            onClick={() => openLinkSheet(athlete)}
                            style={{
                              background: 'rgba(13,115,119,0.08)', color: '#0D7377',
                              border: 'none', borderRadius: 8, padding: '4px 9px',
                              fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            Koppla →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Groups ────────────────────────────────────────── */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#94A3B8',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>
            Grupper
          </div>

          {dataLoading ? (
            <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <SkeletonLine w="50%" h={12} />
              <div style={{ marginTop: 10 }}><SkeletonLine w="70%" h={12} /></div>
            </div>
          ) : allGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: '#94A3B8', fontSize: 14 }}>
              Inga grupper skapade
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 6 }}>
              {allGroups.map((group, i) => {
                const groupAthletes = athletes.filter(a => a.group_id === group.id)
                const uncoupled     = groupAthletes.filter(a => !a.profile_id).length
                return (
                  <div key={group.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 10px',
                    borderBottom: i < allGroups.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: group.color || '#94A3B8', flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', flex: 1 }}>
                      {group.name}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                      background: 'rgba(13,115,119,0.08)', color: '#0D7377',
                    }}>
                      {groupAthletes.length} atleter
                    </span>
                    {uncoupled > 0 && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                        background: 'rgba(245,158,11,0.1)', color: '#D97706',
                      }}>
                        {uncoupled} saknar profil
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Roles & Permissions ───────────────────────────── */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#94A3B8',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>
            Roller &amp; Behörigheter
          </div>

          {dataLoading ? (
            <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              {[0, 1].map(i => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 11, background: '#F1F5F9', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <SkeletonLine w="55%" h={12} />
                    <div style={{ marginTop: 6 }}><SkeletonLine w="35%" h={10} /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: '#94A3B8', fontSize: 14 }}>
              Inga profiler
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 6 }}>
              {members.map((member, i) => {
                const isMe        = member.id === profile?.id
                const memberRoles = member.user_roles?.map(r => r.role) ?? []
                return (
                  <div key={member.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 10px',
                    borderBottom: i < members.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                      background: 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'white',
                    }}>
                      {(member.full_name ?? member.email ?? '?')[0].toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: '#0F172A',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {member.full_name ?? member.email}
                        {isMe && (
                          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginLeft: 6 }}>
                            (du)
                          </span>
                        )}
                      </div>
                      {member.full_name && (
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{member.email}</div>
                      )}
                      <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {memberRoles.map(role => (
                          <button
                            key={role}
                            onClick={() => !isMe && removeRole(member.id, role)}
                            title={isMe ? undefined : 'Tryck för att ta bort'}
                            style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                              background: ROLE_COLOR[role]?.bg ?? 'rgba(148,163,184,0.1)',
                              color: ROLE_COLOR[role]?.color ?? '#64748B',
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                              border: 'none', cursor: isMe ? 'default' : 'pointer',
                            }}
                          >
                            {ROLE_LABEL[role] ?? role}
                          </button>
                        ))}
                        <button
                          onClick={() => setAddRoleForId(member.id)}
                          style={{
                            width: 20, height: 20, borderRadius: 6,
                            background: 'rgba(13,115,119,0.08)', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={12} color="#0D7377" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                    {!isMe && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingId === member.id}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 6, color: '#CBD5E1', borderRadius: 8,
                          opacity: removingId === member.id ? 0.4 : 1, flexShrink: 0,
                        }}
                      >
                        <Trash2 size={15} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Invite ────────────────────────────────────────── */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#94A3B8',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>
            Bjud in ny medlem
          </div>
          <div className="glass-card" style={{ padding: 20 }}>
            {message && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                fontSize: 13, fontWeight: 500,
                background: message.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(13,115,119,0.08)',
                color:  message.type === 'error' ? '#DC2626' : '#0D7377',
                border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(13,115,119,0.2)'}`,
              }}>
                {message.text}
              </div>
            )}
            <input
              type="email"
              placeholder="E-postadress"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendInvite()}
              className="glass-input"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                fontSize: 15, marginBottom: 14, boxSizing: 'border-box',
              }}
            />
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>Roll</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['athlete', 'coach', 'admin'] as const).map(role => {
                  const selected = selectedRoles.includes(role)
                  const colors   = ROLE_COLOR[role]
                  return (
                    <button
                      key={role}
                      onClick={() => toggleInviteRole(role)}
                      style={{
                        padding: '7px 14px', borderRadius: 10,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: selected ? `1.5px solid ${colors.color}` : '1.5px solid rgba(0,0,0,0.1)',
                        background: selected ? colors.bg : 'rgba(255,255,255,0.6)',
                        color: selected ? colors.color : '#64748B',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {ROLE_LABEL[role]}
                    </button>
                  )
                })}
              </div>
            </div>
            <button
              onClick={sendInvite}
              disabled={sending || !inviteEmail || selectedRoles.length === 0}
              className="btn-primary"
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12,
                fontSize: 14, fontWeight: 700, border: 'none',
                cursor: sending ? 'not-allowed' : 'pointer',
                opacity: sending || !inviteEmail || selectedRoles.length === 0 ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Send size={15} strokeWidth={2.2} />
              {sending ? 'Skickar...' : 'Skicka inbjudan'}
            </button>
          </div>
        </div>

        {/* ── Pending Invites ───────────────────────────────── */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 700, color: '#94A3B8',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>
            <Clock size={12} strokeWidth={2.5} />
            Väntande inbjudningar ({pendingInvites.length})
          </div>
          <div className="glass-card" style={{ padding: pendingInvites.length === 0 ? '14px 16px' : 6 }}>
            {pendingInvites.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: 14 }}>Inga väntande inbjudningar.</div>
            ) : (
              pendingInvites.map((invite, i) => (
                <div key={invite.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 10px',
                  borderBottom: i < pendingInvites.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                    background: 'rgba(148,163,184,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Mail size={15} color="#94A3B8" strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: '#0F172A',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {invite.email}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                      {invite.roles.map(role => (
                        <span key={role} style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                          background: ROLE_COLOR[role]?.bg ?? 'rgba(148,163,184,0.1)',
                          color: ROLE_COLOR[role]?.color ?? '#64748B',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          {ROLE_LABEL[role] ?? role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteInvite(invite.id)}
                    disabled={removingId === invite.id}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 6, color: '#CBD5E1', borderRadius: 8,
                      opacity: removingId === invite.id ? 0.4 : 1, flexShrink: 0,
                    }}
                  >
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Athlete Linking Sheet ─────────────────────────────── */}
      {linkAthlete && (
        <>
          <div
            onClick={() => !linkSaving && setLinkAthlete(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 90,
              background: 'rgba(15,23,42,0.45)',
              backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            }}
          />
          <div
            className="glass-sheet"
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 91,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              maxHeight: '85vh', overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
            </div>

            <div style={{ padding: '4px 20px 24px' }}>
              {/* Title */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                    Koppla {linkAthlete.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    Välj profil och grupp
                  </div>
                </div>
                <button
                  onClick={() => setLinkAthlete(null)}
                  style={{
                    background: 'rgba(0,0,0,0.06)', border: 'none',
                    borderRadius: 8, padding: 8, cursor: 'pointer',
                  }}
                >
                  <X size={16} color="#64748B" strokeWidth={2.5} />
                </button>
              </div>

              {/* Section A: Choose profile */}
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 8,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Välj befintlig profil
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                {members.length === 0 ? (
                  <div style={{ color: '#94A3B8', fontSize: 13, padding: '8px 0' }}>
                    Inga profiler tillgängliga
                  </div>
                ) : (
                  members.map(m => {
                    const selected    = linkProfileId === m.id
                    const memberRoles = m.user_roles?.map(r => r.role) ?? []
                    return (
                      <div
                        key={m.id}
                        onClick={() => setLinkProfileId(selected ? null : m.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                          background: selected ? 'rgba(13,115,119,0.06)' : 'rgba(0,0,0,0.02)',
                          border: selected ? '1.5px solid rgba(13,115,119,0.3)' : '1.5px solid transparent',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                          background: selected
                            ? 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)'
                            : 'rgba(148,163,184,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700,
                          color: selected ? 'white' : '#94A3B8',
                        }}>
                          {initials(m.full_name ?? m.email)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                            {m.full_name ?? m.email}
                          </div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>{m.email}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                            {memberRoles.map(role => (
                              <span key={role} style={{
                                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5,
                                background: ROLE_COLOR[role]?.bg ?? 'rgba(148,163,184,0.1)',
                                color: ROLE_COLOR[role]?.color ?? '#64748B',
                                textTransform: 'uppercase', letterSpacing: '0.04em',
                              }}>
                                {ROLE_LABEL[role] ?? role}
                              </span>
                            ))}
                          </div>
                        </div>
                        {selected && <Check size={16} color="#0D7377" strokeWidth={2.5} />}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Section B: Group picker */}
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 8,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Byt grupp
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                <button
                  onClick={() => setLinkGroupId(null)}
                  style={{
                    padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                    background: linkGroupId === null ? 'rgba(13,115,119,0.1)' : 'rgba(0,0,0,0.04)',
                    color:  linkGroupId === null ? '#0D7377' : '#64748B',
                    border: linkGroupId === null ? '1.5px solid rgba(13,115,119,0.3)' : '1.5px solid transparent',
                  }}
                >
                  Ingen grupp
                </button>
                {allGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setLinkGroupId(g.id)}
                    style={{
                      padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer',
                      background: linkGroupId === g.id ? `${g.color}20` : 'rgba(0,0,0,0.04)',
                      color:  linkGroupId === g.id ? g.color : '#64748B',
                      border: linkGroupId === g.id ? `1.5px solid ${g.color}40` : '1.5px solid transparent',
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>

              <button
                onClick={saveLinking}
                disabled={linkSaving || (!linkProfileId && linkGroupId === linkAthlete.group_id)}
                className="btn-primary"
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 14,
                  fontSize: 14, fontWeight: 700, border: 'none',
                  cursor: linkSaving ? 'not-allowed' : 'pointer',
                  opacity: linkSaving || (!linkProfileId && linkGroupId === linkAthlete.group_id) ? 0.5 : 1,
                }}
              >
                {linkSaving ? 'Sparar...' : 'Spara'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Add Role Sheet ──────────────────────────────────── */}
      {addRoleForId && addRoleProfile && (
        <>
          <div
            onClick={() => !addingRole && setAddRoleForId(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 90,
              background: 'rgba(15,23,42,0.45)',
              backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            }}
          />
          <div
            className="glass-sheet"
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 91,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
            </div>
            <div style={{ padding: '4px 20px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                  Lägg till roll
                </div>
                <button
                  onClick={() => setAddRoleForId(null)}
                  style={{
                    background: 'rgba(0,0,0,0.06)', border: 'none',
                    borderRadius: 8, padding: 8, cursor: 'pointer',
                  }}
                >
                  <X size={16} color="#64748B" strokeWidth={2.5} />
                </button>
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                {addRoleProfile.full_name ?? addRoleProfile.email}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(['admin', 'coach', 'athlete'] as const).map(role => {
                  const alreadyHas = (addRoleProfile.user_roles ?? []).some(r => r.role === role)
                  const colors     = ROLE_COLOR[role]
                  return (
                    <button
                      key={role}
                      onClick={() => !alreadyHas && addRole(addRoleForId, role)}
                      disabled={alreadyHas || addingRole}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '13px 16px', borderRadius: 12,
                        background: alreadyHas ? 'rgba(0,0,0,0.02)' : colors.bg,
                        border: `1.5px solid ${alreadyHas ? 'rgba(0,0,0,0.06)' : colors.color + '40'}`,
                        cursor: alreadyHas ? 'not-allowed' : 'pointer',
                        opacity: alreadyHas ? 0.5 : 1,
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: alreadyHas ? '#94A3B8' : colors.color }}>
                        Lägg till {ROLE_LABEL[role]}
                      </span>
                      {alreadyHas && <Check size={14} color="#94A3B8" strokeWidth={2.5} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
