'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { Users } from 'lucide-react'

interface Athlete {
  id: string
  name: string
}

interface LogState {
  score: string
  notes: string
}

interface Props {
  trainingId: string
  groupId: string | null
  onFinish: () => void
}

export default function AthleteLogging({ trainingId, groupId, onFinish }: Props) {
  const router = useRouter()
  const { profile } = useUser()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [logs, setLogs]         = useState<Record<string, LogState>>({})
  const [finishing, setFinishing] = useState(false)
  const [saving, setSaving]     = useState<Record<string, boolean>>({})

  const logsRef      = useRef<Record<string, LogState>>({})
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ── Load athletes + existing logs ─────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      if (!profile?.club_id) return
      let athleteQuery = supabase
        .from('athletes')
        .select('id, name')
        .eq('club_id', profile.club_id)
        .order('name')

      if (groupId) athleteQuery = athleteQuery.eq('group_id', groupId)

      const [{ data: ath }, { data: existingLogs }] = await Promise.all([
        athleteQuery,
        supabase
          .from('session_logs')
          .select('athlete_id, score, notes')
          .eq('training_id', trainingId),
      ])

      if (ath) setAthletes(ath)

      const initLogs: Record<string, LogState> = {}
      ;(ath ?? []).forEach((a: Athlete) => {
        const existing = (existingLogs ?? []).find((l: any) => l.athlete_id === a.id)
        initLogs[a.id] = {
          score: existing?.score != null ? String(existing.score) : '',
          notes: existing?.notes ?? '',
        }
      })
      setLogs(initLogs)
      logsRef.current = initLogs
    }

    load()
  }, [trainingId, groupId, profile?.id])

  // ── Auto-save (debounced per athlete) ─────────────────────────────────────

  const handleChange = (athleteId: string, field: 'score' | 'notes', value: string) => {
    const updated = { ...logsRef.current[athleteId], [field]: value }
    logsRef.current[athleteId] = updated
    setLogs(prev => ({ ...prev, [athleteId]: updated }))

    clearTimeout(debounceRefs.current[athleteId])
    debounceRefs.current[athleteId] = setTimeout(async () => {
      setSaving(prev => ({ ...prev, [athleteId]: true }))
      const row = logsRef.current[athleteId]
      await createClient()
        .from('session_logs')
        .upsert(
          {
            training_id: trainingId,
            athlete_id: athleteId,
            score: row.score !== '' ? parseFloat(row.score) : null,
            notes: row.notes || null,
          },
          { onConflict: 'training_id,athlete_id' },
        )
      setSaving(prev => ({ ...prev, [athleteId]: false }))
    }, 800)
  }

  // ── Finish session ─────────────────────────────────────────────────────────

  const handleFinish = async () => {
    setFinishing(true)
    const supabase = createClient()
    await supabase
      .from('trainings')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', trainingId)
    onFinish()
    router.push('/live')
  }

  if (athletes.length === 0) return null

  return (
    <div style={{ padding: '0 16px', marginTop: 8 }}>

      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 12,
      }}>
        <Users size={14} color="#56637A" strokeWidth={2} />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#56637A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Utövare
        </span>
      </div>

      {/* Athlete rows */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        {athletes.map((athlete, i) => {
          const log = logs[athlete.id] ?? { score: '', notes: '' }
          const isSaving = saving[athlete.id]

          return (
            <div
              key={athlete.id}
              style={{
                padding: '14px 16px',
                borderBottom: i < athletes.length - 1 ? '1px solid #E1E8F0' : 'none',
              }}
            >
              {/* Name row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1E2B42' }}>
                  {athlete.name}
                </span>
                {isSaving && (
                  <span style={{ fontSize: 11, color: '#56637A', fontWeight: 500 }}>Sparar…</span>
                )}
              </div>

              {/* Inputs */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: '0 0 80px' }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#56637A', display: 'block', marginBottom: 4 }}>
                    Poäng
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={log.score}
                    onChange={e => handleChange(athlete.id, 'score', e.target.value)}
                    placeholder="—"
                    style={{
                      width: '100%', padding: '7px 10px',
                      border: '1px solid #E1E8F0',
                      borderRadius: 10, fontSize: 14, fontWeight: 600,
                      background: '#FFFFFF',
                      color: '#1E2B42', outline: 'none',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#56637A', display: 'block', marginBottom: 4 }}>
                    Anteckningar
                  </label>
                  <input
                    type="text"
                    value={log.notes}
                    onChange={e => handleChange(athlete.id, 'notes', e.target.value)}
                    placeholder="Kommentar…"
                    style={{
                      width: '100%', padding: '7px 10px',
                      border: '1px solid #E1E8F0',
                      borderRadius: 10, fontSize: 13,
                      background: '#FFFFFF',
                      color: '#1E2B42', outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Finish button */}
      <button
        onClick={handleFinish}
        disabled={finishing}
        style={{
          width: '100%', padding: '14px',
          background: finishing ? '#56637A' : 'linear-gradient(135deg, #16A34A, #15803d)',
          color: 'white', border: 'none', borderRadius: 14,
          fontSize: 15, fontWeight: 800, cursor: finishing ? 'default' : 'pointer',
          boxShadow: finishing ? 'none' : 'none',
          marginBottom: 20,
          letterSpacing: '-0.01em',
        }}
      >
        {finishing ? 'Avslutar…' : '✓ Avsluta pass'}
      </button>
    </div>
  )
}
