'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/context/user'
import { createClient } from '@/lib/supabase/client'
import { Lock, Mail, X, Check, Download } from 'lucide-react'
import Portal from '@/components/Portal'

// ── Types ──────────────────────────────────────────────────────
interface Profile {
  id: string
  email: string | null
  full_name: string | null
  club_id: string | null
}

interface UserRole {
  profile_id: string
  role: string
}

interface Invite {
  id: string
  email: string
  roles: string[]
  accepted: boolean
  created_at: string
  athlete_id: string | null
}

// ── Constants ──────────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; desc: string; bg: string; color: string }> = {
  admin:   { label: 'Admin',    desc: 'Full åtkomst till admin-panelen',   bg: 'rgba(147,51,234,0.12)',  color: '#9333EA' },
  coach:   { label: 'Tränare',  desc: 'Kan hantera grupper och atleter',    bg: 'rgba(13,115,119,0.10)',  color: '#0D7377' },
  athlete: { label: 'Atlet',    desc: 'Åtkomst till athlete-vyn',           bg: 'rgba(245,158,11,0.12)',  color: '#D97706' },
}

// ── Helpers ────────────────────────────────────────────────────
function initials(name: string | null, email: string | null): string {
  const src = name ?? email ?? '?'
  const parts = src.trim().split(/[\s@]/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'Skickad idag'
  if (days === 1) return 'Skickad igår'
  return `Skickad ${days} dagar sedan`
}

// ── Sub-components ─────────────────────────────────────────────
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

function RolePill({ role }: { role: string }) {
  const m = ROLE_META[role] ?? { label: role, bg: '#F1F5F9', color: '#64748B' }
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11, fontWeight: 700,
      padding: '2px 8px', borderRadius: 20,
      background: m.bg, color: m.color,
    }}>
      {m.label}
    </span>
  )
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.9)',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.8)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      padding: '14px 16px',
      flex: 1,
    }}>
      <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, marginTop: 3 }}>
        {label}
      </div>
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
        {title}
      </span>
      {action}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const { profile: currentProfile, roles, loading: userLoading } = useUser()
  const supabase = createClient()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [clubName, setClubName] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // ManageRoles sheet
  const [manageProfile, setManageProfile] = useState<Profile | null>(null)
  const [rolesSaving, setRolesSaving] = useState<string | null>(null)

  // InviteStaff sheet
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'coach' | 'admin'>('coach')
  const [inviteSending, setInviteSending] = useState(false)

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    if (!userLoading && !roles.includes('admin')) {
      router.replace('/dashboard')
    }
  }, [userLoading, roles, router])

  // ── Data fetch ────────────────────────────────────────────
  async function fetchAll() {
    if (!currentProfile?.club_id) return
    setDataLoading(true)

    const [{ data: prof }, { data: roleRows }, { data: inv }, { data: club }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, club_id')
        .eq('club_id', currentProfile.club_id),
      supabase
        .from('user_roles')
        .select('profile_id, role'),
      supabase
        .from('invites')
        .select('id, email, roles, accepted, created_at, athlete_id')
        .eq('club_id', currentProfile.club_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('clubs')
        .select('name')
        .eq('id', currentProfile.club_id)
        .single(),
    ])

    setProfiles((prof as Profile[]) ?? [])
    setUserRoles((roleRows as UserRole[]) ?? [])
    setInvites((inv as Invite[]) ?? [])
    setClubName((club as { name: string } | null)?.name ?? null)
    setDataLoading(false)
  }

  useEffect(() => { fetchAll() }, [currentProfile?.club_id])

  // ── Toast ─────────────────────────────────────────────────
  function showToast(text: string, type: 'success' | 'error' = 'success') {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Send invite ───────────────────────────────────────────
  async function sendInvite(email: string, role: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ email, role }),
        }
      )
    } catch {
      // best-effort
    }
  }

  // ── Role toggle ───────────────────────────────────────────
  function profileRoles(profileId: string): string[] {
    return userRoles.filter(r => r.profile_id === profileId).map(r => r.role)
  }

  async function toggleRole(profileId: string, role: string, has: boolean) {
    setRolesSaving(role)
    if (has) {
      await supabase
        .from('user_roles')
        .delete()
        .eq('profile_id', profileId)
        .eq('role', role)
      setUserRoles(prev => prev.filter(r => !(r.profile_id === profileId && r.role === role)))
    } else {
      const { data } = await supabase
        .from('user_roles')
        .insert({ profile_id: profileId, role })
        .select('profile_id, role')
        .single()
      if (data) setUserRoles(prev => [...prev, data as UserRole])
    }
    setRolesSaving(null)
  }

  // ── Computed stats ────────────────────────────────────────
  const stats = useMemo(() => ({
    users:    profiles.length,
    coaches:  new Set(userRoles.filter(r => r.role === 'coach').map(r => r.profile_id)).size,
    admins:   new Set(userRoles.filter(r => r.role === 'admin').map(r => r.profile_id)).size,
    pending:  invites.filter(i => !i.accepted).length,
  }), [profiles, userRoles, invites])

  if (userLoading) return null

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--surface-bg)' }}>

      {toast && <Toast text={toast.text} type={toast.type} />}

      {/* ── Sticky header ──────────────────────────────────── */}
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
            width: 34, height: 34, borderRadius: 11, flexShrink: 0,
            background: 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(13,115,119,0.25)',
          }}>
            <Lock size={15} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Admin
            </div>
            {clubName && (
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                {clubName}
              </div>
            )}
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

        {/* ── Stats row ──────────────────────────────────── */}
        {dataLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 72, borderRadius: 14, background: 'rgba(0,0,0,0.05)' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatCard value={stats.users}   label="Totalt användare" />
            <StatCard value={stats.coaches} label="Tränare" />
            <StatCard value={stats.admins}  label="Admins" />
            <StatCard value={stats.pending} label="Väntande inbjudningar" />
          </div>
        )}

        {/* ── Users & Roles ──────────────────────────────── */}
        <div>
          <SectionHeader
            title="Användare & Roller"
            action={
              <button
                onClick={() => { setShowInvite(true); setInviteEmail(''); setInviteRole('coach') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: '#0D7377', color: 'white',
                  border: 'none', borderRadius: 20,
                  padding: '7px 13px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Mail size={13} strokeWidth={2.5} />
                Bjud in tränare/admin
              </button>
            }
          />

          {dataLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 70, borderRadius: 14, background: 'rgba(0,0,0,0.05)' }} />
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <div style={{ color: '#94A3B8', fontSize: 14, padding: '20px 0', textAlign: 'center' }}>
              Inga användare ännu
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profiles.map(p => {
                const pRoles = profileRoles(p.id)
                const displayName = p.full_name ?? p.email ?? 'Okänd'
                return (
                  <div
                    key={p.id}
                    style={{
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.8)',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 14, fontWeight: 700,
                    }}>
                      {initials(p.full_name, p.email)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {displayName}
                      </div>
                      {p.full_name && p.email && (
                        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.email}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                        {pRoles.length === 0 ? (
                          <span style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 500 }}>Inga roller</span>
                        ) : (
                          pRoles.map(r => <RolePill key={r} role={r} />)
                        )}
                      </div>
                    </div>

                    {/* Manage button */}
                    <button
                      onClick={() => setManageProfile(p)}
                      className="btn-secondary"
                      style={{ fontSize: 12, fontWeight: 700, padding: '7px 12px', flexShrink: 0 }}
                    >
                      Hantera
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Pending invites ─────────────────────────────── */}
        <div>
          <SectionHeader
            title="Väntande inbjudningar"
            action={
              stats.pending > 0 ? (
                <span style={{
                  background: 'rgba(245,158,11,0.12)', color: '#D97706',
                  borderRadius: 20, padding: '3px 10px',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {stats.pending}
                </span>
              ) : undefined
            }
          />

          {dataLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: 'rgba(0,0,0,0.05)' }} />)}
            </div>
          ) : invites.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.7)',
              borderRadius: 14, border: '1px dashed rgba(0,0,0,0.1)',
              padding: '28px 20px', textAlign: 'center',
              color: '#94A3B8', fontSize: 14,
            }}>
              Inga inbjudningar skickade än
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {invites.map(inv => (
                <div
                  key={inv.id}
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: inv.accepted ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Mail size={16} color={inv.accepted ? '#059669' : '#D97706'} strokeWidth={2} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {inv.email}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '4px 0' }}>
                      {(inv.roles ?? []).map(r => <RolePill key={r} role={r} />)}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
                      {daysAgo(inv.created_at)}
                    </div>
                  </div>

                  {/* Action */}
                  {inv.accepted ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', flexShrink: 0 }}>
                      Accepterad ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        sendInvite(inv.email, inv.roles?.[0] ?? 'coach')
                        showToast(`Inbjudan skickad igen till ${inv.email}`)
                      }}
                      style={{
                        fontSize: 12, fontWeight: 700, color: '#0D7377',
                        background: 'none', border: 'none',
                        cursor: 'pointer', flexShrink: 0,
                        padding: '6px 0',
                      }}
                    >
                      Skicka igen
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Danger zone ─────────────────────────────────── */}
        <div style={{
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 16, padding: '16px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#DC2626', marginBottom: 12, letterSpacing: '-0.01em' }}>
            Farlig zon
          </div>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none',
              border: '1.5px solid rgba(239,68,68,0.3)',
              borderRadius: 12, padding: '10px 14px',
              color: '#DC2626', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', width: '100%',
            }}
          >
            <Download size={15} strokeWidth={2} />
            Exportera all data
          </button>
        </div>
      </div>

      {/* ── Manage Roles Sheet ──────────────────────────── */}
      {manageProfile && (
        <Portal>
          <SheetBackdrop onClose={() => setManageProfile(null)} />
          <div className="glass-sheet" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            padding: '20px 20px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
            maxWidth: 480, margin: '0 auto',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '0 auto 18px' }} />

            <button
              onClick={() => setManageProfile(null)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <X size={20} color="#94A3B8" />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 16, fontWeight: 700,
              }}>
                {initials(manageProfile.full_name, manageProfile.email)}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                  {manageProfile.full_name ?? manageProfile.email ?? 'Okänd'}
                </div>
                {manageProfile.full_name && manageProfile.email && (
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{manageProfile.email}</div>
                )}
              </div>
            </div>

            {/* Role label */}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 10 }}>Roller</div>

            {/* Role toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
              {(['admin', 'coach', 'athlete'] as const).map(role => {
                const has = profileRoles(manageProfile.id).includes(role)
                const m = ROLE_META[role]
                const saving = rolesSaving === role
                return (
                  <button
                    key={role}
                    onClick={() => toggleRole(manageProfile.id, role, has)}
                    disabled={saving}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', borderRadius: 12,
                      background: has ? `${m.bg}` : 'rgba(0,0,0,0.02)',
                      border: `1.5px solid ${has ? m.color + '40' : 'rgba(0,0,0,0.06)'}`,
                      cursor: saving ? 'default' : 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: has ? m.color : '#0F172A' }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{m.desc}</div>
                    </div>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: has ? m.color : 'rgba(0,0,0,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}>
                      {has && <Check size={13} color="white" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              className="btn-secondary"
              onClick={() => setManageProfile(null)}
              style={{ width: '100%', padding: '13px', fontSize: 15 }}
            >
              Stäng
            </button>
          </div>
        </Portal>
      )}

      {/* ── Invite Staff Sheet ──────────────────────────── */}
      {showInvite && (
        <Portal>
          <SheetBackdrop onClose={() => setShowInvite(false)} />
          <div className="glass-sheet" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            padding: '20px 20px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
            maxWidth: 480, margin: '0 auto',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '0 auto 18px' }} />

            <button
              onClick={() => setShowInvite(false)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <X size={20} color="#94A3B8" />
            </button>

            <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', marginBottom: 18 }}>
              Bjud in tränare eller admin
            </div>

            {/* Email */}
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4 }}>
              E-post
            </label>
            <input
              className="glass-input"
              type="email"
              placeholder="namn@email.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', marginBottom: 16 }}
              autoFocus
            />

            {/* Role picker */}
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 8 }}>
              Roll
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['coach', 'admin'] as const).map(r => {
                const m = ROLE_META[r]
                const active = inviteRole === r
                return (
                  <button
                    key={r}
                    onClick={() => setInviteRole(r)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                      border: active ? 'none' : '1.5px solid rgba(0,0,0,0.1)',
                      background: active ? m.bg : 'rgba(255,255,255,0.7)',
                      color: active ? m.color : '#64748B',
                      cursor: 'pointer',
                    }}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>

            <button
              className="btn-primary"
              disabled={inviteSending || !inviteEmail.trim()}
              onClick={async () => {
                setInviteSending(true)
                await sendInvite(inviteEmail.trim(), inviteRole)
                showToast(`Inbjudan skickad till ${inviteEmail.trim()}`)
                setShowInvite(false)
                setInviteSending(false)
              }}
              style={{ width: '100%', padding: '13px' }}
            >
              {inviteSending ? 'Skickar...' : 'Skicka inbjudan'}
            </button>
          </div>
        </Portal>
      )}
    </div>
  )
}
