'use client'

import type { Exercise } from '@/lib/library/queries'
import { exerciseLabel } from '@/lib/library/queries'

// A group's (or a search's) exercises in one white card. With `selected`
// each row has a 44 px check; otherwise rows open the exercise (›).

export default function ExerciseList({ exercises, subtitle, selected, onToggle, onOpen, onNew }: {
  exercises: Exercise[]
  subtitle?: (e: Exercise) => string
  selected?: Set<string>
  onToggle?: (e: Exercise) => void
  onOpen?: (e: Exercise) => void
  onNew?: () => void
}) {
  return (
    <div style={{ borderRadius: 18, background: '#fff', border: '1px solid #E1E8F0', padding: '0 8px 0 16px' }}>
      {exercises.map(e => {
        const on = selected?.has(e.id) ?? false
        const label = exerciseLabel(e)
        return (
          <button key={e.id} type="button"
            onClick={() => (selected ? onToggle?.(e) : onOpen?.(e))}
            aria-pressed={selected ? on : undefined}
            aria-label={selected ? `${label}: ${on ? 'vald' : 'välj'}` : undefined}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: subtitle ? '8px 0' : '14px 0', minHeight: subtitle ? 60 : 50,
              border: 'none', borderBottom: '1px solid #E1E8F0', background: 'none', textAlign: 'left',
              fontFamily: 'inherit', color: '#1E2B42', cursor: 'pointer',
            }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{label}</span>
              {subtitle && <span style={{ display: 'block', fontSize: 13, color: '#56637A', fontWeight: 500 }}>{subtitle(e)}</span>}
            </span>
            {selected ? (
              <span aria-hidden style={{
                width: 44, height: 44, flex: 'none', borderRadius: 12, fontSize: 20, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                background: on ? '#2B5C9E' : '#fff', border: `2px solid ${on ? '#2B5C9E' : '#B9C6D8'}`,
              }}>✓</span>
            ) : (
              <span aria-hidden style={{ fontSize: 22, color: '#56637A', paddingRight: 8 }}>›</span>
            )}
          </button>
        )
      })}
      {exercises.length === 0 && (
        <div style={{ padding: '24px 0', fontSize: 15, fontWeight: 600, color: '#56637A', borderBottom: onNew ? '1px solid #E1E8F0' : 'none' }}>Ingen övning hittades.</div>
      )}
      {onNew && (
        <button type="button" onClick={onNew} style={{
          display: 'flex', alignItems: 'center', minHeight: 48, width: '100%', border: 'none', background: 'none', padding: 0,
          fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#2B5C9E', cursor: 'pointer',
        }}>+ Ny övning här</button>
      )}
    </div>
  )
}
