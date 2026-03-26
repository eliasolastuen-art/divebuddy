'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Timer, Star } from 'lucide-react'
import AthleteLogging from './AthleteLogging'
import { useUser } from '@/lib/context/user'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionItem {
  id: string
  name: string
  reps?: number
  sets?: number
  duration_seconds?: number
}

interface SessionBlock {
  id: string
  name: string
  category: string
  sort_order: number
  items: SessionItem[]
}

interface AthleteRow {
  id: string
  name: string
}

interface SavedScore {
  athleteId: string
  score: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BLOCK_COLORS: Record<string, string> = {
  vatten:      '#0D7377',
  land:        '#D4A017',
  styrka:      '#DC2626',
  rorlighet:   '#16A34A',
  uppvarmning: '#F97316',
  tavling:     '#6366F1',
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LiveSessionPage() {
  const { id: sessionId } = useParams()
  const sid = Array.isArray(sessionId) ? sessionId[0] : sessionId as string
  const router = useRouter()
  const { profile } = useUser()

  const [sessionInfo, setSessionInfo] = useState<{ id: string; training_id: string | null; groupName: string | null; group_id: string | null } | null>(null)
  const [blocks, setBlocks] = useState<SessionBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [noTraining, setNoTraining] = useState(false)
  const [ending, setEnding] = useState(false)

  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [activeTimer, setActiveTimer] = useState<{ itemId: string; remaining: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Scoring state ────────────────────────────────────────────────────────────
  const [athletes, setAthletes] = useState<AthleteRow[]>([])
  const [scoringItem, setScoringItem] = useState<SessionItem | null>(null)
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({})
  const [savedScores, setSavedScores] = useState<Record<string, SavedScore[]>>({})
  const [savingScore, setSavingScore] = useState(false)

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      const { data: session } = await supabase
        .from('live_sessions')
        .select('id, training_id, group_id, groups(name)')
        .eq('id', sid)
        .single()

      if (!session) { setLoading(false); return }

      const groupName = (session as any).groups?.name ?? null
      const group_id = (session as any).group_id ?? null
      setSessionInfo({ id: session.id, training_id: (session as any).training_id, groupName, group_id })

      // Load athletes filtered by group
      let athQuery = supabase
        .from('athletes')
        .select('id, name')
        .eq('club_id', profile?.club_id ?? '')
        .order('name')
      if (group_id) athQuery = athQuery.eq('group_id', group_id)
      const { data: ath } = await athQuery
      if (ath) setAthletes(ath)

      if (!(session as any).training_id) {
        setNoTraining(true)
        setLoading(false)
        return
      }

      const [blockResult, scoresResult] = await Promise.all([
        supabase
          .from('training_blocks')
          .select(`
            id, name, category, sort_order,
            training_block_items(
              id, custom_name, reps, sets, duration_seconds, sort_order,
              library_item:library_items(name)
            )
          `)
          .eq('training_id', (session as any).training_id)
          .order('sort_order'),
        supabase
          .from('exercise_scores')
          .select('training_block_item_id, athlete_id, score')
          .eq('session_id', sid),
      ])

      if (blockResult.data) {
        setBlocks(blockResult.data.map((b: any) => ({
          id: b.id,
          name: b.name,
          category: b.category,
          sort_order: b.sort_order,
          items: (b.training_block_items || [])
            .sort((a: any, b2: any) => a.sort_order - b2.sort_order)
            .map((it: any) => ({
              id: it.id,
              name: it.library_item?.name || it.custom_name || '–',
              reps: it.reps ?? undefined,
              sets: it.sets ?? undefined,
              duration_seconds: it.duration_seconds ?? undefined,
            })),
        })))
      }

      // Build savedScores map: itemId → [{athleteId, score}]
      if (scoresResult.data) {
        const map: Record<string, SavedScore[]> = {}
        scoresResult.data.forEach((s: any) => {
          const key = s.training_block_item_id
          if (!map[key]) map[key] = []
          map[key].push({ athleteId: s.athlete_id, score: Number(s.score) })
        })
        setSavedScores(map)
      }

      setLoading(false)
    }
    load()
  }, [sid])

  // ── Timer ───────────────────────────────────────────────────────────────────

  const startTimer = (itemId: string, duration: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setActiveTimer({ itemId, remaining: duration })
    timerRef.current = setInterval(() => {
      setActiveTimer(prev => {
        if (!prev) return null
        if (prev.remaining <= 1) {
          clearInterval(timerRef.current!)
          setChecked(c => new Set(Array.from(c).concat(prev.itemId)))
          return null
        }
        return { ...prev, remaining: prev.remaining - 1 }
      })
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setActiveTimer(null)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // ── End session ─────────────────────────────────────────────────────────────

  const handleEnd = async () => {
    setEnding(true)
    stopTimer()
    const supabase = createClient()
    const now = new Date().toISOString()
    await Promise.all([
      supabase.from('live_sessions').update({ status: 'ended', ended_at: now }).eq('id', sid),
      sessionInfo?.training_id
        ? supabase.from('trainings').update({ is_active: false, ended_at: now, status: 'completed' }).eq('id', sessionInfo.training_id)
        : Promise.resolve(),
    ])
    router.push('/live')
  }

  // ── Toggle check ────────────────────────────────────────────────────────────

  const toggleCheck = (itemId: string) => {
    setChecked(prev => {
      const arr = Array.from(prev)
      if (prev.has(itemId)) return new Set(arr.filter(x => x !== itemId))
      return new Set(arr.concat(itemId))
    })
    if (activeTimer?.itemId === itemId) stopTimer()
  }

  // ── Scoring ─────────────────────────────────────────────────────────────────

  const openScoreSheet = (item: SessionItem) => {
    const existing = savedScores[item.id] ?? []
    const preSelected = new Set(existing.map(s => s.athleteId))
    const preInputs: Record<string, string> = {}
    existing.forEach(s => { preInputs[s.athleteId] = String(s.score) })
    setScoringItem(item)
    setSelectedAthletes(preSelected)
    setScoreInputs(preInputs)
  }

  const toggleAthlete = (athleteId: string) => {
    setSelectedAthletes(prev => {
      const next = new Set(prev)
      if (next.has(athleteId)) next.delete(athleteId)
      else next.add(athleteId)
      return next
    })
  }

  const saveScores = async () => {
    if (!scoringItem) return
    setSavingScore(true)
    const supabase = createClient()
    const rows = Array.from(selectedAthletes)
      .filter(aid => scoreInputs[aid]?.trim() !== '')
      .map(aid => ({
        session_id: sid,
        training_block_item_id: scoringItem.id,
        athlete_id: aid,
        score: parseFloat(scoreInputs[aid]),
      }))
    if (rows.length > 0) {
      await supabase.from('exercise_scores').upsert(rows, {
        onConflict: 'session_id,training_block_item_id,athlete_id',
      })
    }
    setSavedScores(prev => ({
      ...prev,
      [scoringItem.id]: rows.map(r => ({ athleteId: r.athlete_id, score: r.score })),
    }))
    setSavingScore(false)
    setScoringItem(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const totalItems = blocks.reduce((s, b) => s + b.items.length, 0)
  const checkedCount = checked.size

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 100 }}>

      {/* Header */}
      <div className="glass-nav" style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', height: 56,
        borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <button
          onClick={() => router.push('/live')}
          style={{
            width: 36, height: 36, borderRadius: 11,
            background: 'rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.08)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} color="#0F172A" strokeWidth={2.5} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {sessionInfo?.groupName ?? 'Session'}
          </div>
          {!loading && totalItems > 0 && (
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>
              {checkedCount}/{totalItems} klart
            </div>
          )}
        </div>

        <button
          onClick={handleEnd}
          disabled={ending}
          style={{
            padding: '7px 14px', borderRadius: 10,
            background: 'rgba(220,38,38,0.1)',
            border: '1px solid rgba(220,38,38,0.2)',
            fontSize: 13, fontWeight: 700, color: '#DC2626',
            cursor: ending ? 'default' : 'pointer',
            opacity: ending ? 0.6 : 1,
          }}
        >
          {ending ? 'Avslutar…' : 'Avsluta'}
        </button>
      </div>

      {/* Progress bar */}
      {totalItems > 0 && (
        <div style={{ height: 3, background: 'rgba(13,115,119,0.08)' }}>
          <div style={{
            height: '100%',
            width: `${(checkedCount / totalItems) * 100}%`,
            background: 'linear-gradient(90deg, #0D7377, #0a9ea5)',
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '16px 16px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>Laddar…</div>
        ) : noTraining ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Inget träningspass kopplat</div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Sessionen startades utan ett schemalagt pass.</div>
          </div>
        ) : blocks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Inga övningar</div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Passet har inga block eller övningar ännu.</div>
          </div>
        ) : (
          blocks.map(block => {
            const color = BLOCK_COLORS[block.category] ?? '#64748B'
            return (
              <div key={block.id} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, color,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  marginBottom: 8, paddingLeft: 2,
                }}>
                  {block.name}
                </div>

                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {block.items.map((item, ii) => {
                    const isChecked = checked.has(item.id)
                    const isTimerActive = activeTimer?.itemId === item.id
                    const dur = item.duration_seconds
                    const durLabel = dur
                      ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`
                      : null
                    const setsPrefix = item.sets && item.sets > 1 ? `${item.sets} × ` : ''
                    const itemScores = savedScores[item.id] ?? []
                    const hasScores = itemScores.length > 0

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '14px 16px',
                          borderBottom: ii < block.items.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                          background: isChecked ? 'rgba(13,115,119,0.04)' : 'transparent',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleCheck(item.id)}
                          style={{
                            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                            border: isChecked ? 'none' : '2px solid rgba(0,0,0,0.15)',
                            background: isChecked ? '#0D7377' : 'transparent',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isChecked && (
                            <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                              <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>

                        {/* Name + active timer display */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 600,
                            color: isChecked ? '#94A3B8' : '#0F172A',
                            textDecoration: isChecked ? 'line-through' : 'none',
                            transition: 'all 0.2s ease',
                          }}>
                            {setsPrefix}{item.name}
                          </div>
                          {isTimerActive && (
                            <div style={{
                              fontSize: 22, fontWeight: 800, color: '#0D7377',
                              letterSpacing: '-0.03em', lineHeight: 1.2, marginTop: 2,
                            }}>
                              {formatTime(activeTimer!.remaining)}
                            </div>
                          )}
                        </div>

                        {/* Right: chips + timer + score buttons */}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                          {item.reps && !isTimerActive && (
                            <span style={{
                              fontSize: 12, fontWeight: 700,
                              background: 'rgba(100,116,139,0.08)', color: '#475569',
                              padding: '3px 8px', borderRadius: 9999,
                            }}>
                              🔁 {item.reps}
                            </span>
                          )}
                          {dur && !isChecked && (
                            isTimerActive ? (
                              <button
                                onClick={stopTimer}
                                style={{
                                  fontSize: 12, fontWeight: 700,
                                  background: 'rgba(220,38,38,0.1)',
                                  border: '1px solid rgba(220,38,38,0.2)',
                                  color: '#DC2626',
                                  padding: '5px 10px', borderRadius: 9999,
                                  cursor: 'pointer',
                                }}
                              >
                                Stopp
                              </button>
                            ) : (
                              <button
                                onClick={() => startTimer(item.id, dur)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  fontSize: 12, fontWeight: 700,
                                  background: 'rgba(13,115,119,0.08)',
                                  border: '1px solid rgba(13,115,119,0.15)',
                                  color: '#0D7377',
                                  padding: '5px 10px', borderRadius: 9999,
                                  cursor: 'pointer',
                                }}
                              >
                                <Timer size={12} strokeWidth={2.5} />
                                {durLabel}
                              </button>
                            )
                          )}

                          {/* Score button */}
                          {athletes.length > 0 && (
                            <button
                              onClick={() => openScoreSheet(item)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                fontSize: 12, fontWeight: 700,
                                background: hasScores ? 'rgba(13,115,119,0.12)' : 'rgba(100,116,139,0.08)',
                                border: `1px solid ${hasScores ? 'rgba(13,115,119,0.25)' : 'rgba(100,116,139,0.15)'}`,
                                color: hasScores ? '#0D7377' : '#64748B',
                                padding: '5px 10px', borderRadius: 9999,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              <Star size={11} strokeWidth={hasScores ? 2.5 : 2} fill={hasScores ? '#0D7377' : 'none'} />
                              {hasScores ? itemScores.length : 'Score'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Athlete logging section */}
      {!loading && sessionInfo?.training_id && (
        <AthleteLogging
          trainingId={sessionInfo.training_id}
          groupId={sessionInfo.group_id}
          onFinish={handleEnd}
        />
      )}

      {/* All done state */}
      {!loading && !noTraining && totalItems > 0 && checkedCount === totalItems && (
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(22,163,74,0.08)',
            borderRadius: 16, padding: '16px 28px',
          }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#16A34A' }}>Alla övningar klara!</div>
            <button
              onClick={handleEnd}
              style={{
                marginTop: 12, padding: '10px 24px',
                background: 'linear-gradient(135deg, #16A34A, #15803d)',
                color: 'white', border: 'none', borderRadius: 12,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
              }}
            >
              Avsluta pass
            </button>
          </div>
        </div>
      )}

      {/* ── Scoring bottom sheet ─────────────────────────────────────────────── */}
      {scoringItem && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setScoringItem(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 }}
          />

          {/* Sheet */}
          <div
            className="glass-sheet"
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001,
              borderRadius: '24px 24px 0 0',
              padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 32px)',
              maxWidth: 520, margin: '0 auto',
              maxHeight: '85vh', overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '0 auto 20px' }} />

            {/* Exercise title */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Scora övning
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                {scoringItem.name}
              </div>
            </div>

            {/* Athlete chips */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Välj utövare
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {athletes.map(athlete => {
                  const isSelected = selectedAthletes.has(athlete.id)
                  return (
                    <button
                      key={athlete.id}
                      onClick={() => toggleAthlete(athlete.id)}
                      style={{
                        padding: '8px 16px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                        fontSize: 14, fontWeight: 700,
                        background: isSelected ? '#0D7377' : 'rgba(0,0,0,0.06)',
                        color: isSelected ? 'white' : '#64748B',
                        transition: 'all 0.15s',
                      }}
                    >
                      {athlete.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Score inputs for selected athletes */}
            {selectedAthletes.size > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Poäng (0 – 10)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {athletes
                    .filter(a => selectedAthletes.has(a.id))
                    .map(athlete => (
                      <div key={athlete.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#0F172A' }}>
                          {athlete.name}
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="10"
                          value={scoreInputs[athlete.id] ?? ''}
                          onChange={e => setScoreInputs(prev => ({ ...prev, [athlete.id]: e.target.value }))}
                          placeholder="—"
                          style={{
                            width: 90, padding: '10px 12px',
                            border: '1.5px solid rgba(13,115,119,0.25)',
                            borderRadius: 12, fontSize: 18, fontWeight: 700,
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.8)',
                            color: '#0F172A', outline: 'none',
                          }}
                        />
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={saveScores}
              disabled={savingScore || selectedAthletes.size === 0}
              className="btn-primary"
              style={{
                width: '100%', padding: '14px', fontSize: 15, fontWeight: 800,
                borderRadius: 16,
                opacity: (savingScore || selectedAthletes.size === 0) ? 0.5 : 1,
                cursor: (savingScore || selectedAthletes.size === 0) ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Star size={16} color="white" strokeWidth={2.5} />
              {savingScore ? 'Sparar…' : 'Spara scores'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
