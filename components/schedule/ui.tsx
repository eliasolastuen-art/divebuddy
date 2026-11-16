'use client'

import Link from 'next/link'

// Shared building blocks for the schedule screens (design screens 1–6).
// Only the palette colours; no shadows, chips or group colours.

export const C = {
  bg: '#EEF3F8', card: '#FFFFFF', line: '#E1E8F0', text: '#1E2B42', muted: '#56637A',
  primary: '#2B5C9E', primarySoft: '#E3ECF7', hero: 'linear-gradient(135deg, oklch(0.50 0.10 232), oklch(0.42 0.10 256))',
}

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 24, color: C.text }}>
      {children}
    </div>
  )
}

export function Hero({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ borderRadius: 22, padding: 22, color: '#fff', background: C.hero, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {children}
    </section>
  )
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function TextLink({ href, onClick, children }: { href?: string; onClick?: () => void; children: React.ReactNode }) {
  const style: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: C.primary, textDecoration: 'none', padding: '6px 0', background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center' }
  return href ? <Link href={href} style={style}>{children}</Link> : <button type="button" onClick={onClick} style={style}>{children}</button>
}

// White card with thin lines between rows
export function ListCard({ children }: { children: React.ReactNode }) {
  return <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, padding: '0 16px' }}>{children}</div>
}

export function Row({ children, onClick, last }: { children: React.ReactNode; onClick?: () => void; last?: boolean }) {
  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', minHeight: 48, width: '100%',
    borderBottom: last ? 'none' : `1px solid ${C.line}`, background: 'none', border: 'none', textAlign: 'left',
    fontFamily: 'inherit', color: C.text, cursor: onClick ? 'pointer' : 'default',
  }
  if (!onClick) return <div style={{ ...style, borderBottom: last ? 'none' : `1px solid ${C.line}` }}>{children}</div>
  return <button type="button" onClick={onClick} style={{ ...style, borderBottom: last ? 'none' : `1px solid ${C.line}` }}>{children}</button>
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, padding: '14px 0', fontSize: 15, color: C.muted, fontWeight: 500 }}>{children}</p>
}

export const primaryButton: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 54, borderRadius: 14,
  border: 'none', background: C.primary, color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
  textDecoration: 'none', cursor: 'pointer',
}
