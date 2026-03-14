'use client'

import Link from 'next/link'
import { Radio, Zap, CalendarDays } from 'lucide-react'

export default function LivePage() {
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(145deg, #0D7377 0%, #0a5c60 55%, #074c4e 100%)',
        borderRadius: 28,
        padding: '40px 28px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(13,115,119,0.3), 0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, left: 20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div style={{
          width: 72, height: 72, borderRadius: 24,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        }}>
          <Radio size={32} color="white" strokeWidth={1.8} />
        </div>

        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'white', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 10 }}>
          Live Training
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', fontWeight: 500, lineHeight: 1.5, maxWidth: 260, marginBottom: 28 }}>
          Real-time session tracking and athlete management coming soon.
        </p>

        <Link href="/planning" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 9999, padding: '12px 24px',
          textDecoration: 'none', color: 'white',
          fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
        }}>
          <CalendarDays size={16} color="white" />
          Plan a Session
        </Link>
      </div>

      {/* Feature preview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { Icon: Radio,        title: 'Live Timer',   desc: 'Track exercises in real-time',        color: '#0D7377' },
          { Icon: Zap,          title: 'Quick Start',  desc: 'Begin any planned session instantly',  color: '#D4A017' },
          { Icon: CalendarDays, title: 'Session Sync', desc: 'Sync with planning seamlessly',        color: '#6366F1' },
          { Icon: Radio,        title: 'Athlete View', desc: 'Monitor each athlete\'s progress',     color: '#16A34A' },
        ].map((feature, i) => (
          <div key={i} className="glass-card" style={{ padding: '18px 16px', opacity: 0.75 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: `${feature.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <feature.Icon size={16} color={feature.color} strokeWidth={2} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{feature.title}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, lineHeight: 1.4 }}>{feature.desc}</div>
          </div>
        ))}
      </div>

    </div>
  )
}
