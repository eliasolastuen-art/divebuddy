'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import Portal from '@/components/Portal'
import { UI } from '@/lib/schedule/format'

// Bottom sheet used by all schedule dialogs (pass details, planner, forms)
export default function Sheet({ title, subtitle, onClose, children, footer, zIndex = 100 }: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  zIndex?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <Portal>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex, background: 'rgba(30,43,66,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
      <div role="dialog" aria-modal="true" className="glass-sheet" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: zIndex + 1, maxWidth: 600, margin: '0 auto',
        maxHeight: '90dvh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '18px 20px 12px' }}>
          <div style={{ minWidth: 0 }}>
            {subtitle && <div style={{ fontSize: 13, fontWeight: 600, color: UI.muted }}>{subtitle}</div>}
            <h2 style={{ margin: '2px 0 0', fontSize: 21, fontWeight: 900, letterSpacing: '-0.03em', color: UI.text }}>{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Stäng" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, border: '1px solid #E1E8F0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} color={UI.text} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>{children}</div>
        {footer && (
          <div style={{ padding: '12px 20px calc(14px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${UI.line}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {footer}
          </div>
        )}
        {!footer && <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />}
      </div>
    </Portal>
  )
}

// ── Form building blocks ───────────────────────────────────────────────────

export const inputStyle: React.CSSProperties = {
  width: '100%', minHeight: 44, boxSizing: 'border-box', padding: '0 12px', borderRadius: 12,
  border: '1px solid #E1E8F0', background: '#fff', color: UI.text,
  fontFamily: 'inherit', fontSize: 15,
}

export function Field({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: grow ? '1 1 160px' : '0 1 auto', minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: UI.muted }}>{label}</span>
      {children}
    </label>
  )
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: UI.muted, marginBottom: 6 }}>{children}</div>
}

export function Chips({ options, selected, onToggle, label }: {
  options: { id: string; name: string; color: string }[]
  selected: string[]
  onToggle: (id: string) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(o => {
        const on = selected.includes(o.id)
        return (
          <button key={o.id} type="button" aria-pressed={on} onClick={() => onToggle(o.id)} style={{
            minHeight: 40, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 600,
            border: `1.5px solid ${on ? o.color : 'rgba(0,0,0,0.1)'}`, background: on ? o.color : '#fff', color: on ? '#fff' : UI.text,
          }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: on ? '#fff' : o.color }} />{o.name}
          </button>
        )
      })}
    </div>
  )
}

export function Button({ children, onClick, variant = 'secondary', disabled, grow, type = 'button' }: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean
  grow?: boolean
  type?: 'button' | 'submit'
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: UI.primary, color: '#fff', border: `1px solid ${UI.primary}` },
    secondary: { background: '#fff', color: UI.text, border: '1px solid #E1E8F0' },
    danger: { background: '#fff', color: '#B91C1C', border: '1px solid #FECACA' },
    ghost: { background: 'transparent', color: UI.primary, border: '1px solid transparent' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      ...styles[variant], flex: grow ? '1 1 auto' : '0 0 auto', minHeight: 46, padding: '0 16px', borderRadius: 12,
      fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    }}>{children}</button>
  )
}

export const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id])
