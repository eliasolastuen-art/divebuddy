'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'

interface Athlete {
  id: string
  name: string
  email: string | null
  active: boolean
  profile_id: string | null
}

export default function GroupAthletesPage() {
  const params   = useParams()
  const router   = useRouter()
  const { profile } = useUser()
  const groupId  = params.id as string
  const supabase = createClient()

  const [athletes, setAthletes]     = useState<Athlete[]>([])
  const [groupColor, setGroupColor] = useState('#0D7377')
  const [loading, setLoading]       = useState(true)

  // Invite state
  const [sending, setSending]           = useState<string | null>(null)   // athleteId being sent
  const [sentInvites, setSentInvites]   = useState<Set<string>>(new Set())
  const [toast, setToast]               = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: groupData }, { data: athleteData }] = await Promise.all([
        supabase.from('groups').select('color').eq('id', groupId).single(),
        supabase
          .from('athletes')
          .select('id, name, email, active, profile_id')
          .eq('group_id', groupId)
          .order('name'),
      ])
      if (groupData?.color) setGroupColor(groupData.color)
      if (athleteData) setAthletes(athleteData)
      setLoading(false)
    }
    load()
  }, [groupId])

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSendInvite(athlete: Athlete) {
    if (!athlete.email) return
    setSending(athlete.id)

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
            athlete_id:  athlete.id,
            email:       athlete.email,
            athlete_name: athlete.name,
            club_name:   (profile as any)?.club_name ?? 'klubben',
            invited_by:  profile?.full_name ?? 'Din tränare',
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
      setSending(null)
    }
  }

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

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px' }}>

      {/* Toast */}
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

      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 16 }}>
        Atleter
      </h2>

      {athletes.length === 0 ? (
        <div className="glass-card" style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>
          Inga atleter i denna grupp
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {athletes.map((athlete, i) => {
            const canInvite = !!athlete.email && !athlete.profile_id
            const wasSent   = sentInvites.has(athlete.id)
            const isSending = sending === athlete.id

            return (
              <div
                key={athlete.id}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '14px 18px',
                  borderBottom: i < athletes.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {/* Avatar */}
                <div
                  onClick={() => router.push(`/groups/${groupId}/athletes/${athlete.id}`)}
                  style={{
                    width: 42, height: 42, borderRadius: 14, flexShrink: 0, marginRight: 14,
                    background: `${groupColor}18`,
                    border: `1.5px solid ${groupColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 17, fontWeight: 800, color: groupColor }}>
                    {athlete.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Name + email */}
                <div
                  onClick={() => router.push(`/groups/${groupId}/athletes/${athlete.id}`)}
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: athlete.active ? '#0F172A' : '#94A3B8' }}>
                    {athlete.name}
                  </div>
                  {athlete.email && (
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{athlete.email}</div>
                  )}
                </div>

                {/* Right side: invite button or status pill */}
                {canInvite ? (
                  wasSent ? (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 9999,
                      background: 'rgba(148,163,184,0.1)', color: '#94A3B8', flexShrink: 0,
                    }}>
                      Skickad ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendInvite(athlete)}
                      disabled={isSending}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 9999,
                        background: 'rgba(13,115,119,0.08)', color: '#0D7377',
                        border: 'none', fontSize: 12, fontWeight: 700,
                        cursor: isSending ? 'not-allowed' : 'pointer',
                        opacity: isSending ? 0.6 : 1, flexShrink: 0,
                      }}
                    >
                      <Send size={12} strokeWidth={2.2} />
                      {isSending ? '...' : 'Bjud in'}
                    </button>
                  )
                ) : (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 9999,
                    background: athlete.active ? 'rgba(13,115,119,0.1)' : 'rgba(0,0,0,0.05)',
                    color: athlete.active ? '#0D7377' : '#94A3B8', flexShrink: 0,
                  }}>
                    {athlete.active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
