'use client'

import { C } from '@/components/schedule/ui'

// Design Live.dc.html: one blue box per pass. Time (and "pågår"), the group
// large, the pass name, place and coaches, and a white button.
export default function LiveCard({ heading, top, group, title, sub, button, onPress, busy }: {
  heading: string
  top: string
  group: string
  title: string
  sub: string
  button: string
  onPress: () => void
  busy?: boolean
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{heading}</h2>
      <div style={{ borderRadius: 20, color: '#fff', padding: 18, display: 'flex', flexDirection: 'column', gap: 3, background: C.hero }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{top}</span>
        <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15 }}>{group}</span>
        {title && <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>}
        {sub && <span style={{ fontSize: 13.5, fontWeight: 500 }}>{sub}</span>}
        <button type="button" onClick={onPress} disabled={busy} style={{
          marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 14,
          border: 'none', background: '#fff', color: '#234E88', fontSize: 16, fontWeight: 800, fontFamily: 'inherit',
          cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
        }}>{busy ? 'Startar …' : button}</button>
      </div>
    </section>
  )
}
