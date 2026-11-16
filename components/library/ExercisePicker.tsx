'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { lastUsedReps, prefill, searchExercises, type Exercise, type LibraryArea, type LibraryGroup, type PrefilledItem } from '@/lib/library/queries'
import GroupTiles, { AREAS, Segmented } from './GroupTiles'
import ExerciseList from './ExerciseList'
import { useLibrary } from './useLibrary'
import ExerciseForm from './ExerciseForm'
import Portal from '@/components/Portal'

// Design screen 9 "Lägg till övningar": search across all exercises, Vatten/Land,
// group tiles, multi-select that survives switching group or searching, and
// one button that adds everything with prefilled values.

export default function ExercisePicker({ initialArea = 'vatten', onClose, onAdd }: {
  initialArea?: LibraryArea
  onClose: () => void
  onAdd: (items: PrefilledItem[]) => void
}) {
  const { profile } = useUser()
  const { groups, exercises, loading, error, addLocal } = useLibrary()
  const [newIn, setNewIn] = useState<{ group: LibraryGroup | null } | null>(null)
  const [query, setQuery] = useState('')
  const [area, setArea] = useState<LibraryArea>(initialArea)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Exercise[]>([])
  const [adding, setAdding] = useState(false)

  const selectedIds = useMemo(() => new Set(selected.map(e => e.id)), [selected])
  const groupById = useMemo(() => Object.fromEntries(groups.map(g => [g.id, g])), [groups])
  const picked = useMemo(() => {
    const out: Record<string, number> = {}
    selected.forEach(e => { if (e.groupId) out[e.groupId] = (out[e.groupId] ?? 0) + 1 })
    return out
  }, [selected])

  const searching = query.trim().length > 0
  const group = groupId ? groupById[groupId] : null
  const list = searching
    ? searchExercises(exercises, query)
    : group ? exercises.filter(e => e.groupId === group.id) : []

  const areaLabel = (a: LibraryArea | undefined) => (a === 'land' ? 'Land' : 'Vatten')
  const subtitle = (e: Exercise) => {
    const g = e.groupId ? groupById[e.groupId] : null
    if (searching) return g ? `${areaLabel(g.area)} · ${g.name}` : 'Utan grupp'
    return e.defaultHeight ? `${e.defaultHeight} m` : areaLabel(g?.area)
  }

  const toggle = (e: Exercise) =>
    setSelected(s => (s.some(x => x.id === e.id) ? s.filter(x => x.id !== e.id) : [...s, e]))

  const add = async (chosen: Exercise[] = selected) => {
    if (!chosen.length) { onClose(); return }
    setAdding(true)
    let last: Record<string, number> = {}
    try {
      if (profile?.id) last = await lastUsedReps(createClient(), profile.id, chosen.map(e => e.id))
    } catch (err) {
      console.error('lastUsedReps failed:', err) // fall back to defaults
    }
    onAdd(prefill(chosen, groups, last))
    setAdding(false)
  }

  // A new exercise is chosen right away and everything goes back into the pass
  const onCreated = (e: Exercise) => {
    addLocal(e)
    setNewIn(null)
    add([...selected, e])
  }

  const onNewExercise = (g: LibraryGroup | null) => setNewIn({ group: g })

  const n = selected.length
  const cta = n === 0 ? 'Klar' : n === 1 ? 'Lägg till 1 övning' : `Lägg till ${n} övningar`

  return (
    <Portal>
      <div role="dialog" aria-modal="true" aria-label="Lägg till övningar" style={{
        position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', flexDirection: 'column',
        background: '#EEF3F8', color: '#1E2B42', paddingTop: 'var(--safe-top)',
      }}>
        <header style={{ flex: 'none', height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, background: '#EEF3F8', borderBottom: '1px solid #E1E8F0' }}>
          <button type="button" onClick={onClose} aria-label="Stäng" style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #E1E8F0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
            <X size={18} color="#1E2B42" strokeWidth={2.2} aria-hidden />
          </button>
          <span style={{ flex: 1, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>Lägg till övningar</span>
          {(
            <button type="button" onClick={() => onNewExercise(group)} style={{ minHeight: 44, border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#2B5C9E', cursor: 'pointer' }}>+ Ny övning</button>
          )}
        </header>

        <div style={{ flex: 'none', padding: '14px 16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'block' }}>
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>Sök övning</span>
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Sök i alla övningar, t.ex. 105B"
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, borderRadius: 14, border: '1px solid #C9D5E3', background: '#fff', padding: '0 14px', fontSize: 16, color: '#1E2B42', fontFamily: 'inherit' }} />
          </label>
          {!searching && !group && (
            <Segmented label="Område" options={AREAS} value={area} onChange={a => { setArea(a); setGroupId(null) }} />
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 16px' }}>
          {error && <p style={{ margin: 0, fontSize: 15, color: '#56637A' }}>{error}</p>}
          {loading && <p style={{ margin: 0, fontSize: 15, color: '#56637A' }}>Laddar övningar …</p>}

          {!loading && !searching && !group && (
            <GroupTiles groups={groups.filter(g => g.area === area)} picked={picked} onOpen={g => setGroupId(g.id)} />
          )}

          {!loading && (searching || group) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group && !searching && (
                <button type="button" onClick={() => setGroupId(null)} style={{ alignSelf: 'flex-start', minHeight: 44, border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#2B5C9E', cursor: 'pointer' }}>
                  ‹ {areaLabel(area)}
                </button>
              )}
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em' }}>
                {searching ? 'Sökresultat' : `${group!.name}${group!.description ? ` · ${group!.description}` : ''}`}
              </h2>
              <ExerciseList exercises={list} subtitle={subtitle} selected={selectedIds} onToggle={toggle}
                onNew={() => onNewExercise(searching ? null : group)} />
            </div>
          )}
        </div>

        <div style={{ flex: 'none', padding: '12px 16px calc(22px + var(--safe-bottom))', background: '#fff', borderTop: '1px solid #E1E8F0' }}>
          <button type="button" onClick={() => add()} disabled={adding} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 54, borderRadius: 14,
            border: 'none', background: '#2B5C9E', color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
            cursor: 'pointer', opacity: adding ? 0.7 : 1,
          }}>{cta}</button>
        </div>

        {newIn && (
          <ExerciseForm groups={groups} initialArea={newIn.group?.area ?? area} initialGroupId={newIn.group?.id ?? null}
            saveLabel="Spara och lägg till i passet" onSaved={onCreated} onClose={() => setNewIn(null)} />
        )}
      </div>
    </Portal>
  )
}
