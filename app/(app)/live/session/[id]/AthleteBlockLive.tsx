'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Plus, Search, X } from 'lucide-react'

interface SessionItem {
  id: string
  name: string
  reps?: number
  sets?: number
  duration_seconds?: number
  assigned_athlete_id?: string | null
}

interface SessionBlock {
  id: string
  name: string
  items: SessionItem[]
}

interface LibraryItem { id: string; name: string; code?: string | null }

interface Props {
  block: SessionBlock
  athletes: { id: string; name: string }[]
  savedScores: Record<string, { athleteId: string; score: number }[]>
  onScore: (item: SessionItem) => void
}

export default function AthleteBlockLive({ block, athletes, savedScores, onScore }: Props) {
  const [expandedAthlete, setExpandedAthlete] = useState<string | null>(null)
  const [localItems, setLocalItems] = useState<SessionItem[]>([])
  const [pickerForAthlete, setPickerForAthlete] = useState<string | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerResults, setPickerResults] = useState<LibraryItem[]>([])
  const [customInputFor, setCustomInputFor] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Combine parent items + locally added items
  const allItems = [...block.items, ...localItems]

  // Show all athletes (not just those with items — coach can add dives for anyone)
  const athletesWithItems = athletes.filter(a =>
    allItems.some(i => i.assigned_athlete_id === a.id)
  )
  // Also include athletes without items if they're in the group
  const allAthletes = athletes.length > 0
    ? athletes
    : athletesWithItems

  // Library search (debounced)
  useEffect(() => {
    if (!pickerForAthlete) return
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      const supabase = createClient()
      let q = supabase.from('library_items').select('id, name, code').order('name').limit(50)
      if (pickerSearch.trim()) q = q.ilike('name', `%${pickerSearch.trim()}%`)
      const { data } = await q
      if (data) setPickerResults(data)
    }, 200)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [pickerSearch, pickerForAthlete])

  const addDive = async (athleteId: string, libraryItem?: LibraryItem, customDiveName?: string) => {
    const supabase = createClient()
    const existingCount = allItems.filter(i => i.assigned_athlete_id === athleteId).length
    const { data } = await supabase
      .from('training_block_items')
      .insert({
        block_id: block.id,
        assigned_athlete_id: athleteId,
        library_item_id: libraryItem?.id ?? null,
        custom_name: libraryItem ? null : (customDiveName ?? null),
        sort_order: existingCount,
      })
      .select('id, custom_name, library_item:library_items(name)')
      .single()
    if (data) {
      const newItem: SessionItem = {
        id: data.id,
        name: (data as any).library_item?.name ?? data.custom_name ?? '–',
        assigned_athlete_id: athleteId,
      }
      setLocalItems(prev => [...prev, newItem])
    }
    setPickerForAthlete(null)
    setPickerSearch('')
    setPickerResults([])
    setCustomInputFor(null)
    setCustomName('')
  }

  if (allAthletes.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
        Inga atleter i detta block
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {allAthletes.map(athlete => {
        const athleteItems = allItems.filter(i => i.assigned_athlete_id === athlete.id)
        const scoredCount = athleteItems.filter(i => (savedScores[i.id]?.length ?? 0) > 0).length
        const isOpen = expandedAthlete === athlete.id
        const allScored = athleteItems.length > 0 && scoredCount === athleteItems.length

        return (
          <div key={athlete.id}>
            <button
              onClick={() => setExpandedAthlete(isOpen ? null : athlete.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: isOpen ? '12px 12px 0 0' : 12,
                background: isOpen ? 'rgba(13,115,119,0.08)' : 'rgba(0,0,0,0.03)',
                border: '1px solid',
                borderColor: isOpen ? 'rgba(13,115,119,0.2)' : 'rgba(0,0,0,0.06)',
                borderBottom: isOpen ? 'none' : undefined,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{athlete.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {athleteItems.length > 0 && (
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: allScored ? '#16A34A' : '#94A3B8',
                    background: allScored ? 'rgba(22,163,74,0.1)' : 'rgba(0,0,0,0.05)',
                    padding: '2px 8px', borderRadius: 9999,
                  }}>
                    {scoredCount}/{athleteItems.length}
                  </span>
                )}
                <ChevronDown size={16} color="#64748B" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
            </button>

            {isOpen && (
              <div style={{ border: '1px solid rgba(13,115,119,0.2)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                {athleteItems.map((item, i) => {
                  const scores = savedScores[item.id] ?? []
                  const hasScore = scores.length > 0
                  const score = hasScore ? scores[0].score : null
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px',
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        background: hasScore ? 'rgba(13,115,119,0.03)' : 'transparent',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                          {i + 1}. {item.name}
                        </span>
                      </div>
                      <button
                        onClick={() => onScore(item)}
                        style={{
                          padding: '5px 14px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                          background: hasScore ? 'rgba(13,115,119,0.12)' : 'rgba(0,0,0,0.06)',
                          color: hasScore ? '#0D7377' : '#64748B',
                          fontWeight: 700, fontSize: 13, flexShrink: 0,
                        }}
                      >
                        {hasScore ? `${score} p` : 'Score'}
                      </button>
                    </div>
                  )
                })}

                {/* Custom input row */}
                {customInputFor === athlete.id && (
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'rgba(255,255,255,0.7)', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      autoFocus
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && customName.trim()) addDive(athlete.id, undefined, customName.trim()) }}
                      placeholder="Övningsnamn"
                      style={{ flex: 1, minWidth: 100, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(13,115,119,0.2)', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: 'white' }}
                    />
                    <button
                      onClick={() => { if (customName.trim()) addDive(athlete.id, undefined, customName.trim()) }}
                      disabled={!customName.trim()}
                      style={{ padding: '7px 12px', borderRadius: 8, background: customName.trim() ? '#0D7377' : 'rgba(0,0,0,0.08)', color: customName.trim() ? 'white' : '#94A3B8', border: 'none', fontWeight: 700, fontSize: 13, cursor: customName.trim() ? 'pointer' : 'default' }}
                    >
                      Lägg till
                    </button>
                    <button
                      onClick={() => { setCustomInputFor(null); setCustomName('') }}
                      style={{ padding: '7px 8px', borderRadius: 8, background: 'transparent', color: '#94A3B8', border: 'none', fontSize: 13, cursor: 'pointer' }}
                    >
                      Avbryt
                    </button>
                  </div>
                )}

                {/* Add dive buttons */}
                {customInputFor !== athlete.id && (
                  <div style={{ display: 'flex', gap: 6, padding: '8px 12px' }}>
                    <button
                      onClick={() => { setPickerForAthlete(athlete.id); setPickerSearch(''); setPickerResults([]) }}
                      style={{ flex: 1, padding: '7px', borderRadius: 10, border: '1.5px dashed rgba(13,115,119,0.3)', background: 'rgba(13,115,119,0.04)', fontSize: 12, fontWeight: 600, color: '#0D7377', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                      <Search size={11} /> Bibliotek
                    </button>
                    <button
                      onClick={() => { setCustomInputFor(athlete.id); setCustomName('') }}
                      style={{ flex: 1, padding: '7px', borderRadius: 10, border: '1.5px dashed rgba(0,0,0,0.1)', background: 'transparent', fontSize: 12, fontWeight: 600, color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                      <Plus size={11} /> Eget hopp
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Library picker bottom sheet */}
      {pickerForAthlete && (
        <>
          <div
            onClick={() => setPickerForAthlete(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }}
          />
          <div
            className="glass-sheet"
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401, borderRadius: '20px 20px 0 0', padding: '16px 16px calc(env(safe-area-inset-bottom,0px) + 24px)', maxHeight: '70vh', display: 'flex', flexDirection: 'column', maxWidth: 520, margin: '0 auto' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '0 auto 14px', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexShrink: 0 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: '8px 12px' }}>
                <Search size={14} color="#94A3B8" />
                <input
                  autoFocus
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Sök övning…"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#0F172A', fontFamily: 'inherit' }}
                />
              </div>
              <button
                onClick={() => setPickerForAthlete(null)}
                style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <X size={16} color="#64748B" />
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {pickerResults.map(item => (
                <button
                  key={item.id}
                  onClick={() => addDive(pickerForAthlete, item)}
                  style={{ width: '100%', padding: '12px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  {item.code && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0D7377', background: 'rgba(13,115,119,0.08)', padding: '2px 6px', borderRadius: 5, flexShrink: 0 }}>
                      {item.code}
                    </span>
                  )}
                  <span style={{ fontSize: 14, color: '#0F172A', flex: 1 }}>{item.name}</span>
                  <Plus size={14} color="#94A3B8" />
                </button>
              ))}
              {pickerResults.length === 0 && pickerSearch && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8', fontSize: 13 }}>Inga resultat</div>
              )}
              {pickerResults.length === 0 && !pickerSearch && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8', fontSize: 13 }}>Börja skriva för att söka</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
