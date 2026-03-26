'use client'

import { BookOpen } from 'lucide-react'

export default function DagbokPage() {
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: 'rgba(13,115,119,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <BookOpen size={28} color="rgba(13,115,119,0.5)" />
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 10 }}>
        Dagbok
      </h1>
      <p style={{ fontSize: 15, color: '#94A3B8', lineHeight: 1.6 }}>
        Din träningsdagbok kommer snart.
      </p>
    </div>
  )
}
