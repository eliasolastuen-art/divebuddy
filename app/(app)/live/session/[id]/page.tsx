'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Timer } from 'lucide-react'

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

  const [sessionInfo, setSessionInfo] = useState<{ id: string; training_id: string | null; groupName: string | null } | null>(null)
  const [blocks, setBlocks] = useState<SessionBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [noTraining, setNoTraining] = useState(false)
  const [ending, setEnding] = useState(false)

  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [activeTimer, setActiveTimer] = useState<{ itemId: string; remaining: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      const { data: session } = await supabase
        .from('live_sessions')
        .select('id, training_id, groups(name)')
        .eq('id', sid)
        .single()

      if (!session) { setLoading(false); return }

      const groupName = (session as any).groups?.name ?? null
      setSessionInfo({ id: session.id, training_id: (session as any).training_id, groupName })

      if (!(session as any).training_id) {
        setNoTraining(true)
        setLoading(false)
        return
      }

      const { data: blockData } = await supabase
        .from('training_blocks')
        .select(`
          id, name, category, sort_order,
          training_block_items(
            id, custom_name, reps, sets, duration_seconds, sort_order,
            library_item:library_items(name)
          )
        `)
        .eq('training_id', (session as any).training_id)
        .order('sort_order')

      if (blockData) {
        setBlocks(blockData.map((b: any) => ({
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
    await supabase
      .from('live_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', sid)
    router.push('/live')
  }

  // ── Toggle check ────────────────────────────────────────────────────────────

  const toggleCheck = (itemId: string) => {
    setChecked(prev => {
      const arr = Array.from(prev)
      if (prev.has(itemId)) {
        return new Set(arr.filter(x => x !== itemId))
      }
      return new Set(arr.concat(itemId))
    })
    if (activeTimer?.itemId === itemId) stopTimer()
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

                        {/* Right: chips + timer button */}
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
    </div>
  )
}
