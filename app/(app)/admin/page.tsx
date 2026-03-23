'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/context/user'
import { createClient } from '@/lib/supabase/client'
import { Mail, UserCheck, UserX, Send, Shield } from 'lucide-react'

interface Invite {
  id: string
  email: string
  roles: string[]
  accepted: boolean
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const { roles, profile, loading } = useUser()

  const [inviteEmail, setInviteEmail] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    if (!loading && !roles.includes('admin')) {
      router.replace('/dashboard')
    }
  }, [loading, roles, router])

  useEffect(() => {
    if (profile?.club_id) {
      fetchInvites()
    }
  }, [profile])

  async function fetchInvites() {
    const supabase = createClient()
    const { data } = await supabase
      .from('invites')
      .select('*')
      .eq('club_id', profile!.club_id)
      .order('created_at', { ascending: false })

    setInvites(data ?? [])
  }

  function toggleRole(role: string) {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  async function sendInvite() {
    if (!inviteEmail || selectedRoles.length === 0) {
      setMessage({ type: 'error', text: 'Fill in email and select at least one role.' })
      return
    }

    setSending(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.from('invites').insert({
      email: inviteEmail.toLowerCase().trim(),
      club_id: profile?.club_id,
      roles: selectedRoles,
      created_by: profile?.id,
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: `Invite sent to ${inviteEmail}` })
      setInviteEmail('')
      setSelectedRoles([])
      fetchInvites()
    }

    setSending(false)
  }

  if (loading) return null

  return (
    <div style={{ padding: '24px 16px', maxWidth: 480, margin: '0 auto' }}>

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
            Manage invites and access
          </p>
        </div>
      </div>

      {/* Section 1: Invite user */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
        }}>
          Invite user
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
          placeholder="Email address"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          className="glass-input"
          style={{
            width: '100%', padding: '12px 14px',
            borderRadius: 12, fontSize: 15,
            marginBottom: 14, boxSizing: 'border-box',
          }}
        />

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 10 }}>
            Roles
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['coach', 'athlete'] as const).map(role => {
              const selected = selectedRoles.includes(role)
              return (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    fontSize: 14, fontWeight: 600,
                    cursor: 'pointer',
                    border: selected ? '1.5px solid #0D7377' : '1.5px solid rgba(0,0,0,0.1)',
                    background: selected ? 'rgba(13,115,119,0.1)' : 'rgba(255,255,255,0.6)',
                    color: selected ? '#0D7377' : '#64748B',
                    transition: 'all 0.15s ease',
                    textTransform: 'capitalize',
                  }}
                >
                  {role}
                </button>
              )
            })}
          </div>
        </div>

        <button
          onClick={sendInvite}
          disabled={sending}
          className="btn-primary"
          style={{
            width: '100%', padding: '12px 0',
            borderRadius: 12, fontSize: 14, fontWeight: 700,
            border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Send size={15} strokeWidth={2.2} />
          {sending ? 'Sending...' : 'Send invite'}
        </button>
      </div>

      {/* Section 2: Invite list */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
        }}>
          Invites ({invites.length})
        </div>

        {invites.length === 0 ? (
          <div style={{ color: '#94A3B8', fontSize: 14, padding: '8px 0' }}>
            No invites sent yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {invites.map((invite, i) => (
              <div
                key={invite.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 4px',
                  borderBottom: i < invites.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                  background: invite.accepted ? 'rgba(13,115,119,0.1)' : 'rgba(148,163,184,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {invite.accepted
                    ? <UserCheck size={16} color="#0D7377" strokeWidth={2} />
                    : <Mail size={16} color="#94A3B8" strokeWidth={2} />
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: '#0F172A',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {invite.email}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>
                    {invite.roles.join(', ')}
                  </div>
                </div>

                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8,
                  background: invite.accepted ? 'rgba(13,115,119,0.12)' : 'rgba(148,163,184,0.12)',
                  color: invite.accepted ? '#0D7377' : '#94A3B8',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {invite.accepted ? 'Accepted' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
