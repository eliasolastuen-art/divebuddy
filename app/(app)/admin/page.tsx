'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/context/user'
import { createClient } from '@/lib/supabase/client'
import { removeMemberFromClub, deleteInvite } from '@/lib/actions/adminActions'
import { Mail, UserCheck, Send, Shield, Trash2, Users, Clock } from 'lucide-react'

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

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  coach: 'Tränare',
  athlete: 'Atlet',
}

const ROLE_COLOR: Record<string, { bg: string; color: string }> = {
  admin: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626' },
  coach: { bg: 'rgba(13,115,119,0.1)', color: '#0D7377' },
  athlete: { bg: 'rgba(99,102,241,0.1)', color: '#6366F1' },
}

export default function AdminPage() {
  const router = useRouter()
  const { roles, profile, loading } = useUser()

  const [inviteEmail, setInviteEmail] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([])
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !roles.includes('admin')) {
      router.replace('/dashboard')
    }
  }, [loading, roles, router])

  useEffect(() => {
    if (profile?.club_id) {
      fetchAll()
    }
  }, [profile])

  async function fetchAll() {
    const supabase = createClient()

    const [{ data: memberData }, { data: inviteData }] = await Promise.all([
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
    ])

    setMembers((memberData ?? []) as Member[])
    setPendingInvites(inviteData ?? [])
  }

  function toggleRole(role: string) {
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

    // Check if already a member
    if (members.some(m => m.email?.toLowerCase() === normalized)) {
      setMessage({ type: 'error', text: 'Den här personen är redan medlem i klubben.' })
      return
    }

    // Check if already has a pending invite
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
  }

  async function handleDeleteInvite(inviteId: string) {
    setRemovingId(inviteId)
    await deleteInvite(inviteId)
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId))
    setRemovingId(null)
  }

  if (loading) return null

  return (
    <div style={{ padding: '24px 16px', maxWidth: 480, margin: '0 auto', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 12,
          background: 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(13,115,119,0.3)',
        }}>
          <Shield size={18} color="white" strokeWidth={2} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.03em' }}>
            Admin
          </h1>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, fontWeight: 500 }}>
            Hantera medlemmar och inbjudningar
          </p>
        </div>
      </div>

      {/* Section 1: Invite */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
        }}>
          Bjud in
        </div>

        {message && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, marginBottom: 14,
            fontSize: 13, fontWeight: 500,
            background: message.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(13,115,119,0.08)',
            color: message.type === 'error' ? '#DC2626' : '#0D7377',
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
            width: '100%', padding: '12px 14px',
            borderRadius: 12, fontSize: 15,
            marginBottom: 14, boxSizing: 'border-box',
          }}
        />

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>
            Roll
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['athlete', 'coach', 'admin'] as const).map(role => {
              const selected = selectedRoles.includes(role)
              const colors = ROLE_COLOR[role]
              return (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  style={{
                    padding: '7px 14px', borderRadius: 10,
                    fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
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
            width: '100%', padding: '12px 0',
            borderRadius: 12, fontSize: 14, fontWeight: 700,
            border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending || !inviteEmail || selectedRoles.length === 0 ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Send size={15} strokeWidth={2.2} />
          {sending ? 'Skickar...' : 'Skicka inbjudan'}
        </button>
      </div>

      {/* Section 2: Pending invites */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 700, color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
        }}>
          <Clock size={12} strokeWidth={2.5} />
          Väntande inbjudningar ({pendingInvites.length})
        </div>

        {pendingInvites.length === 0 ? (
          <div style={{ color: '#94A3B8', fontSize: 14, padding: '4px 0' }}>
            Inga väntande inbjudningar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {pendingInvites.map((invite, i) => (
              <div
                key={invite.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 4px',
                  borderBottom: i < pendingInvites.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                }}
              >
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
                    background: 'none', border: 'none',
                    cursor: 'pointer', padding: 6,
                    color: '#CBD5E1', borderRadius: 8,
                    opacity: removingId === invite.id ? 0.4 : 1,
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={15} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Members */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 700, color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
        }}>
          <Users size={12} strokeWidth={2.5} />
          Klubbmedlemmar ({members.length})
        </div>

        {members.length === 0 ? (
          <div style={{ color: '#94A3B8', fontSize: 14, padding: '4px 0' }}>
            Inga medlemmar ännu.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {members.map((member, i) => {
              const isMe = member.id === profile?.id
              const memberRoles = member.user_roles?.map(r => r.role) ?? []
              return (
                <div
                  key={member.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 4px',
                    borderBottom: i < members.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  {/* Avatar */}
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
                      <div style={{
                        fontSize: 12, color: '#94A3B8',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {member.email}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                      {memberRoles.map(role => (
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

                  {!isMe && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingId === member.id}
                      style={{
                        background: 'none', border: 'none',
                        cursor: 'pointer', padding: 6,
                        color: '#CBD5E1', borderRadius: 8,
                        opacity: removingId === member.id ? 0.4 : 1,
                        flexShrink: 0,
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
    </div>
  )
}
