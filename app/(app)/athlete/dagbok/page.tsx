'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Star } from 'lucide-react'
import { useUser } from '@/lib/context/user'
import { createClient } from '@/lib/supabase/client'

interface SessionEntry {
  id: string
  started_at: string
  training_title: string | null
  blocks: {
    id: string
    name: string
    category: string
    items: {
      id: string
      name: string
      score: number | null
    }[]
  }[]
}

export default function DagbokPage() {
  const { profile, loading } = useUser()
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id || loading) return

    async function load() {
      const supabase = createClient()

      // Get athlete record
      const { data: athleteData } = await supabase
        .from('athletes')
        .select('id, group_id')
        .eq('profile_id', profile!.id)
        .single()

      if (!athleteData) {
        setDataLoading(false)
        return
      }

      // Get completed sessions for this athlete's group
      let sessionsQuery = supabase
        .from('live_sessions')
        .select('id, started_at, training_id, trainings(title)')
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .limit(20)

      if (athleteData.group_id) {
        sessionsQuery = sessionsQuery.eq('group_id', athleteData.group_id)
      }

      const { data: sessionsData } = await sessionsQuery

      if (!sessionsData?.length) {
        setDataLoading(false)
        return
      }

      // For each session, load blocks + items + scores
      const entries: SessionEntry[] = []

      for (const session of sessionsData) {
        const trainingId = (session as any).training_id
        const trainingTitle = (session as any).trainings?.title ?? null

        if (!trainingId) {
          entries.push({
            id: session.id,
            started_at: session.started_at,
            training_title: trainingTitle,
            blocks: [],
          })
          continue
        }

        // Load blocks and items
        const { data: blocksData } = await supabase
          .from('training_blocks')
          .select(`
            id, name, category,
            training_block_items(
              id, custom_name, assigned_athlete_id,
              library_item:library_items(name)
            )
          `)
          .eq('training_id', trainingId)
          .order('sort_order')

        // Load scores for this athlete in this session
        const { data: scoresData } = await supabase
          .from('exercise_scores')
          .select('training_block_item_id, score')
          .eq('session_id', session.id)
          .eq('athlete_id', athleteData.id)

        const scoreMap: Record<string, number> = {}
        scoresData?.forEach((s: any) => {
          scoreMap[s.training_block_item_id] = Number(s.score)
        })

        const blocks = (blocksData ?? []).map((b: any) => ({
          id: b.id,
          name: b.name,
          category: b.category ?? 'vatten',
          items: (b.training_block_items ?? [])
            .filter((it: any) =>
              // Show items assigned to this athlete, or unassigned items
              !it.assigned_athlete_id || it.assigned_athlete_id === athleteData.id
            )
            .map((it: any) => ({
              id: it.id,
              name: it.library_item?.name || it.custom_name || '–',
              score: scoreMap[it.id] ?? null,
            })),
        })).filter((b: any) => b.items.length > 0)

        entries.push({
          id: session.id,
          started_at: session.started_at,
          training_title: trainingTitle,
          blocks,
        })
      }

      setSessions(entries)
      setDataLoading(false)
    }

    load()
  }, [profile?.id, loading])

  if (loading || dataLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: 28, height: 28, border: '3px solid rgba(13,115,119,0.2)', borderTopColor: '#0D7377', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'rgba(13,115,119,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Star size={28} color="rgba(13,115,119,0.5)" />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 8 }}>
          Dagbok
        </h1>
        <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
          Inga genomförda pass ännu. Din träningshistorik visas här efter att du har kört ditt första pass.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 20 }}>
        Dagbok
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sessions.map(session => {
          const isOpen = expandedSession === session.id
          const totalItems = session.blocks.reduce((s, b) => s + b.items.length, 0)
          const scoredItems = session.blocks.reduce((s, b) => s + b.items.filter(i => i.score !== null).length, 0)
          const avgScore = scoredItems > 0
            ? (session.blocks.reduce((s, b) => s + b.items.reduce((s2, i) => s2 + (i.score ?? 0), 0), 0) / scoredItems).toFixed(1)
            : null

          return (
            <div key={session.id} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Session header */}
              <button
                onClick={() => setExpandedSession(isOpen ? null : session.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
                    {session.training_title ?? 'Träningspass'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                      {new Date(session.started_at).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    {totalItems > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>
                        {totalItems} övningar
                      </span>
                    )}
                    {avgScore && (
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: '#0D7377', background: 'rgba(13,115,119,0.08)',
                        padding: '1px 7px', borderRadius: 9999,
                      }}>
                        {avgScore} p
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  size={16} color="#94A3B8"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                />
              </button>

              {/* Expanded content */}
              {isOpen && session.blocks.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  {session.blocks.map(block => (
                    <div key={block.id}>
                      <div style={{
                        padding: '8px 16px',
                        fontSize: 11, fontWeight: 800,
                        color: '#0D7377',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        background: 'rgba(13,115,119,0.03)',
                      }}>
                        {block.name}
                      </div>
                      {block.items.map((item, i) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 16px',
                            borderBottom: i < block.items.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', flex: 1 }}>
                            {item.name}
                          </span>
                          {item.score !== null ? (
                            <span style={{
                              fontSize: 13, fontWeight: 700,
                              color: '#0D7377', background: 'rgba(13,115,119,0.08)',
                              padding: '2px 10px', borderRadius: 9999,
                            }}>
                              {item.score} p
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#CBD5E1' }}>–</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {isOpen && session.blocks.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: 13, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  Inga övningar registrerade
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
