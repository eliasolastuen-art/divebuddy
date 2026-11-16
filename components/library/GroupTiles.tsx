'use client'

import type { LibraryArea, LibraryGroup } from '@/lib/library/queries'

// Vatten/Land switch and the group tiles in two columns (design screens 9 and 11)

export const AREAS: [LibraryArea, string][] = [['vatten', 'Vatten'], ['land', 'Land']]

export function Segmented<K extends string>({ options, value, onChange, label }: {
  options: [K, string][]
  value: K
  onChange: (k: K) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 13, background: '#DFE7F1' }}>
      {options.map(([k, text]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)} style={{
          flex: 1, minHeight: 40, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          background: value === k ? '#fff' : 'transparent', color: value === k ? '#1E2B42' : '#56637A',
        }}>{text}</button>
      ))}
    </div>
  )
}

export default function GroupTiles({ groups, onOpen, picked, subtitle }: {
  groups: LibraryGroup[]
  onOpen: (g: LibraryGroup) => void
  picked?: Record<string, number> // group id → number of chosen exercises
  subtitle?: (g: LibraryGroup) => string
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
      {groups.map(g => {
        const n = picked?.[g.id] ?? 0
        return (
          <button key={g.id} type="button" onClick={() => onOpen(g)} style={{
            minHeight: 92, borderRadius: 18, border: '1px solid #E1E8F0', background: '#fff', padding: '14px 16px',
            textAlign: 'left', fontFamily: 'inherit', color: '#1E2B42', display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', gap: 6, cursor: 'pointer',
          }}>
            <span style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.03em' }}>{g.name}</span>
            <span style={n
              ? { fontSize: 13.5, fontWeight: 700, color: '#2B5C9E' }
              : { fontSize: 13.5, fontWeight: 500, color: '#56637A' }}>
              {n ? `${n} ${n === 1 ? 'vald' : 'valda'}` : subtitle ? subtitle(g) : g.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}
