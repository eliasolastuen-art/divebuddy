'use client'
import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Athlete { id: string; name: string }
interface Dive {
  id: string
  dive_code: string | null
  dive_name: string | null
  dd: number | null
  status: string
}

interface Props {
  block: { id: string; name: string }
  athletes: Athlete[]
  sessionId: string
  onAddDive: (athleteId: string, athleteName: string) => void
}

export default function CompetitionAthleteBlock({ block: _block, athletes, sessionId, onAddDive }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dives, setDives] = useState<Record<string, Dive[]>>({})
  const [loading, setLoading] = useState<string | null>(null)

  const toggle = async (athleteId: string) => {
    if (expanded === athleteId) {
      setExpanded(null)
      return
    }
    setExpanded(athleteId)
    if (!dives[athleteId]) {
      setLoading(athleteId)
      const supabase = createClient()
      const { data } = await supabase
        .from('live_dive_log')
        .select('id, dive_code, dive_name, dd, status')
        .eq('athlete_id', athleteId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      setDives(prev => ({ ...prev, [athleteId]: data ?? [] }))
      setLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {athletes.map(athlete => {
        const isOpen = expanded === athlete.id
        const athleteDives = dives[athlete.id] ?? []
        const isLoading = loading === athlete.id

        return (
          <div key={athlete.id}>
            {/* Atlet-rad */}
            <button
              onClick={() => toggle(athlete.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: isOpen ? '12px 12px 0 0' : 12,
                background: isOpen ? 'rgba(99,102,241,0.08)' : 'rgba(0,0,0,0.03)',
                border: '1px solid',
                borderColor: isOpen ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.06)',
                borderBottom: isOpen ? 'none' : undefined,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                {athlete.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {athleteDives.length > 0 && (
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: '#6366F1',
                    background: 'rgba(99,102,241,0.1)',
                    padding: '2px 8px', borderRadius: 9999,
                  }}>
                    {athleteDives.length} hopp
                  </span>
                )}
                <ChevronDown
                  size={16}
                  color="#64748B"
                  style={{
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </div>
            </button>

            {/* Accordion */}
            {isOpen && (
              <div style={{
                border: '1px solid rgba(99,102,241,0.2)',
                borderTop: 'none',
                borderRadius: '0 0 12px 12px',
                overflow: 'hidden',
              }}>
                {isLoading ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                    Laddar…
                  </div>
                ) : (
                  <>
                    {athleteDives.length === 0 && (
                      <div style={{ padding: '12px 16px', fontSize: 13, color: '#94A3B8' }}>
                        Inga hopp loggade ännu
                      </div>
                    )}
                    {athleteDives.map((dive, i) => (
                      <div
                        key={dive.id}
                        style={{
                          padding: '10px 16px',
                          borderBottom: '1px solid rgba(0,0,0,0.05)',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between',
                          background: dive.status === 'done'
                            ? 'rgba(13,115,119,0.03)'
                            : 'transparent',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                            {i + 1}. {dive.dive_code ?? '—'}
                          </span>
                          {dive.dive_name && (
                            <span style={{ fontSize: 12, color: '#64748B', marginLeft: 8 }}>
                              {dive.dive_name}
                            </span>
                          )}
                        </div>
                        {dive.dd && (
                          <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
                            DD {dive.dd}
                          </span>
                        )}
                      </div>
                    ))}

                    {/* Lägg till hopp */}
                    <button
                      onClick={() => onAddDive(athlete.id, athlete.name)}
                      style={{
                        width: '100%', padding: '12px 16px',
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'transparent',
                        border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700, color: '#6366F1',
                      }}
                    >
                      <Plus size={14} />
                      Lägg till hopp
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
