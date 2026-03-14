'use client'

import BottomNav from '@/components/nav/BottomNav'
import HamburgerMenu from '@/components/nav/HamburgerMenu'
import { Menu } from 'lucide-react'
import { useState } from 'react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Top Header — Liquid Glass */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div className="glass-nav" style={{
          padding: '0 16px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            style={{
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 12,
              cursor: 'pointer',
            }}
            aria-label="Open menu"
          >
            <Menu size={18} color="#1E293B" strokeWidth={2.2} />
          </button>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30,
              background: 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(13,115,119,0.35)',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M8 6C8 4.9 8.9 4 10 4h4c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2V6zM3 9a1 1 0 0 1 1-1h2v8H4a1 1 0 0 1-1-1V9zm14-1h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2V8z" fill="white"/>
              </svg>
            </div>
            <span style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              DiveBuddy
            </span>
          </div>

          <div style={{ width: 40 }} />
        </div>
      </header>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main style={{ flex: 1, paddingBottom: 100, overflowY: 'auto' }}>
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
