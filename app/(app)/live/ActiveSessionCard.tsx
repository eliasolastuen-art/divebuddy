'use client'
import { Play, Square, Radio } from 'lucide-react'

export interface LiveSession {
  id: string
  club_id: string
  coach_id: string
  group_id: string | null
  status: 'active' | 'ended'
  started_at: string
  ended_at: string | null
  groups?: { name: string; color: string | null }
}

interface Props {
  session: LiveSession | null
  onOpen: (session: LiveSession) => void
  onEnd: (session: LiveSession) => void
  ending: boolean
}

export default function ActiveSessionCard({ session, onOpen, onEnd, ending }: Props) {
  if (!session) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 20px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'rgba(13,115,119,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Radio size={28} color="#0D7377" strokeWidth={1.5} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
          Inget aktivt träningspass
        </p>
        <p style={{ fontSize: 13, color: '#94A3B8' }}>
          Starta ett pass från dagens schema nedan.
        </p>
      </div>
    )
  }

  const startTime = new Date(session.started_at).toLocaleTimeString('sv-SE', {
    hour: '2-digit', minute: '2-digit',
  })
  const groupName = session.groups?.name ?? 'Okänd grupp'
  const groupColor = session.groups?.color ?? '#0D7377'

  return (
    <div
      className="glass-card"
      style={{
        padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        borderLeft: '3px solid #16A34A',
        borderRadius: 18,
      }}
    >
      {/* Green pulse dot */}
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: '#16A34A',
        flexShrink: 0,
        boxShadow: '0 0 0 3px rgba(22,163,74,0.2)',
      }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
          {groupName}
        </div>
        <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
          Startade {startTime}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => onEnd(session)}
          disabled={ending}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 12px', borderRadius: 12,
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.15)',
            fontSize: 13, fontWeight: 700, color: '#DC2626',
            cursor: 'pointer', opacity: ending ? 0.5 : 1,
          }}
        >
          <Square size={13} strokeWidth={2.5} />
          {ending ? 'Avslutar…' : 'Avsluta'}
        </button>
        <button
          onClick={() => onOpen(session)}
          className="btn-primary"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 14px', borderRadius: 12,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Play size={13} strokeWidth={2.5} />
          Öppna
        </button>
      </div>
    </div>
  )
}
