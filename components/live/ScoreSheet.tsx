'use client'

import { useEffect, useState } from 'react'
import Portal from '@/components/Portal'
import { C } from '@/components/schedule/ui'

// Design Poang.dc.html: one row per athlete with − value +, steps of 0,5
// between 0 and 10. "–" until the first tap, which gives 7,0.
export default function ScoreSheet({ title, sub, athletes, initial, onSave, onClose }: {
  title: string
  sub: string // "Sätt poäng · 3 m · 4 hopp"
  athletes: { id: string; name: string }[]
  initial: Record<string, number>
  onSave: (scores: Record<string, number>) => Promise<void>
  onClose: () => void
}) {
  const [values, setValues] = useState<Record<string, number | null>>(() => Object.fromEntries(athletes.map(a => [a.id, initial[a.id] ?? null])))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const step = (id: string, dir: 1 | -1) => setValues(v => {
    const cur = v[id]
    const next = cur == null ? 7 : Math.max(0, Math.min(10, cur + dir * 0.5))
    return { ...v, [id]: next }
  })

  const set = Object.entries(values).filter((e): e is [string, number] => e[1] != null)
  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(Object.fromEntries(set))
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara poängen')
      setSaving(false)
    }
  }

  return (
    <Portal>
      <div onClick={() => !saving && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 10200, background: 'rgba(30,43,66,0.45)' }} />
      <div role="dialog" aria-modal="true" aria-label={`Sätt poäng för ${title}`} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10201, maxWidth: 560, margin: '0 auto', maxHeight: '88dvh',
        background: '#fff', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', color: C.text,
      }}>
        <div style={{ flex: 'none', display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <span style={{ width: 40, height: 5, borderRadius: 3, background: '#D5DEE9' }} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 20px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>{sub}</div>
              <h1 style={{ margin: '2px 0 0', fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>{title}</h1>
            </div>
            <button type="button" onClick={onClose} aria-label="Stäng" style={{ width: 44, height: 44, flex: 'none', borderRadius: 12, background: C.bg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          {athletes.length === 0 ? (
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: C.muted }}>Inga atleter i gruppen.</p>
          ) : (
            <div style={{ borderRadius: 16, border: `1px solid ${C.line}`, padding: '0 8px 0 16px' }}>
              {athletes.map((a, i) => {
                const v = values[a.id]
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < athletes.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700 }}>{a.name}</span>
                    <button type="button" onClick={() => step(a.id, -1)} aria-label={`Sänk poäng för ${a.name}`} style={stepper}>−</button>
                    <span style={{ width: 48, flex: 'none', textAlign: 'center', fontSize: 19, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: v == null ? C.muted : C.text }}>
                      {v == null ? '–' : v.toFixed(1).replace('.', ',')}
                    </span>
                    <button type="button" onClick={() => step(a.id, 1)} aria-label={`Höj poäng för ${a.name}`} style={stepper}>+</button>
                  </div>
                )
              })}
            </div>
          )}
          {error && <p role="alert" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{error}</p>}
        </div>
        <div style={{ flex: 'none', padding: '12px 20px calc(22px + var(--safe-bottom))', borderTop: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.muted }}>{set.length} av {athletes.length} har poäng</span>
          <button type="button" onClick={save} disabled={saving || set.length === 0} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 54, padding: '0 28px', borderRadius: 14, border: 'none',
            background: C.primary, color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
            opacity: saving || set.length === 0 ? 0.6 : 1,
          }}>{saving ? 'Sparar …' : 'Spara poäng'}</button>
        </div>
      </div>
    </Portal>
  )
}

const stepper: React.CSSProperties = {
  width: 44, height: 44, flex: 'none', borderRadius: 12, border: '1px solid #C9D5E3', background: '#fff',
  fontSize: 22, fontWeight: 600, color: C.primary, padding: 0, fontFamily: 'inherit', cursor: 'pointer',
}
