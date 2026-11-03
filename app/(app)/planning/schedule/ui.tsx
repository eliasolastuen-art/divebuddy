'use client'

import { dateNum, dayShort, placeColors, STATUS_STYLE, UI } from '@/lib/schedule/format'
import type { PassStatus } from '@/lib/schedule/types'

export function SegTabs<T extends string>({ value, options, onChange, label }: {
  value: T
  options: [T, string][]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="no-print" style={{
      display: 'flex', gap: 4, padding: 4, borderRadius: 14,
      background: 'rgba(0,0,0,0.04)', overflowX: 'auto',
    }}>
      {options.map(([k, l]) => {
        const active = k === value
        return (
          <button key={k} role="tab" aria-selected={active} onClick={() => onChange(k)} style={{
            flex: '1 0 auto', minHeight: 40, padding: '0 14px', borderRadius: 11, border: 'none',
            background: active ? '#fff' : 'transparent',
            boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            color: active ? UI.tealDark : UI.muted,
            fontSize: 14, fontWeight: active ? 700 : 600, cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}>{l}</button>
        )
      })}
    </div>
  )
}

export function Pills<T extends string>({ value, options, onChange, label }: {
  value: T
  options: { id: T; name: string; color: string; count?: number }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="no-print" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
      {options.map(o => {
        const active = o.id === value
        return (
          <button key={o.id} aria-pressed={active} onClick={() => onChange(o.id)} style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, minHeight: 40,
            padding: '0 14px', borderRadius: 999, fontFamily: 'inherit', cursor: 'pointer',
            border: `1.5px solid ${active ? o.color : 'rgba(0,0,0,0.08)'}`,
            background: active ? o.color : '#fff', color: active ? '#fff' : UI.text,
            fontSize: 13.5, fontWeight: 600,
          }}>
            <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: active ? '#fff' : o.color }} />
            {o.name}
            {o.count !== undefined && <span style={{ opacity: 0.75, fontWeight: 500 }}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function PlaceTag({ place }: { place: string }) {
  const c = placeColors(place)
  return (
    <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: c.bg, color: c.fg }}>
      {place || 'Plats ej satt'}
    </span>
  )
}

export function StatusTag({ status }: { status: PassStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span style={{
      flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
      background: s.bg, color: s.fg, border: `1px ${s.dashed ? 'dashed' : 'solid'} ${s.border}`,
    }}>{s.label}</span>
  )
}

export function DateBadge({ date, color = UI.text, small = false }: { date: string; color?: string; small?: boolean }) {
  return (
    <div style={{ width: small ? 40 : 46, flexShrink: 0, textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: UI.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{dayShort(date)}</div>
      <div style={{ fontSize: small ? 17 : 20, fontWeight: 800, color, lineHeight: 1.05, letterSpacing: '-0.02em' }}>{dateNum(date)}</div>
    </div>
  )
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: UI.text, letterSpacing: '-0.02em' }}>{children}</h2>
      {aside}
    </div>
  )
}

export function Bar({ pct, color, height = 8 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{ flex: 1, height, background: 'rgba(0,0,0,0.05)', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', background: color, borderRadius: height }} />
    </div>
  )
}
