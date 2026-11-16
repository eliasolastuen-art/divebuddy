'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import Portal from '@/components/Portal'
import { C } from '@/components/schedule/ui'

// Small white sheet over the pass editor (detail, new block, ⋯ menu)
export default function BottomSheet({ title, onClose, children, footer }: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <Portal>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10200, background: 'rgba(30,43,66,0.45)' }} />
      <div role="dialog" aria-modal="true" aria-label={title} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10201, maxWidth: 560, margin: '0 auto', maxHeight: '88dvh',
        background: '#fff', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', color: C.text,
      }}>
        <div style={{ flex: 'none', display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <span style={{ width: 40, height: 5, borderRadius: 3, background: '#D5DEE9' }} />
        </div>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px 4px' }}>
          <h2 style={{ flex: 1, margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em' }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Stäng" style={{ width: 44, height: 44, borderRadius: 12, background: C.bg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
            <X size={18} color={C.text} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {children}
        </div>
        {footer && (
          <div style={{ flex: 'none', padding: '12px 20px calc(18px + var(--safe-bottom))', borderTop: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {footer}
          </div>
        )}
        {!footer && <div style={{ height: 'var(--safe-bottom)' }} />}
      </div>
    </Portal>
  )
}

export const fieldLabel: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700, color: C.muted }
export const textInput: React.CSSProperties = {
  minHeight: 48, borderRadius: 14, border: '1px solid #C9D5E3', background: '#fff', padding: '0 14px',
  fontSize: 16, color: C.text, fontFamily: 'inherit', boxSizing: 'border-box', width: '100%',
}
export const pill = (on: boolean): React.CSSProperties => ({
  minHeight: 44, padding: '0 18px', borderRadius: 999, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
  background: on ? C.primary : '#fff', color: on ? '#fff' : C.text, border: `1px solid ${on ? C.primary : '#C9D5E3'}`,
})
export const linkButton: React.CSSProperties = {
  minHeight: 44, border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
  color: C.primary, cursor: 'pointer', textAlign: 'left',
}
