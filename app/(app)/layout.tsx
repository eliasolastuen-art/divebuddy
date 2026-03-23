'use client'

import BottomNav from '@/components/nav/BottomNav'
import HamburgerMenu from '@/components/nav/HamburgerMenu'
import { UserProvider, useUser } from '@/lib/context/user'
import { Menu } from 'lucide-react'
import { useState } from 'react'

function RoleSwitcher() {
  const { roles, activeRole, setActiveRole } = useUser()

  const switchable = roles.filter(r => r !== 'admin')
  if (switchable.length < 2) return null

  return (
    <div style={{
      display: 'flex',
      background: 'rgba(0,0,0,0.06)',
      borderRadius: 20,
      padding: 3,
    }}>
      {switchable.map(role => (
        <button
          key={role}
          onClick={() => setActiveRole(role)}
          style={{
            padding: '4px 12px',
            borderRadius: 16,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            textTransform: 'capitalize',
            transition: 'all 0.18s ease',
            background: activeRole === role ? 'white' : 'transparent',
            color: activeRole === role ? '#0D7377' : '#94A3B8',
            boxShadow: activeRole === role ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {role}
        </button>
      ))}
    </div>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface-bg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* Header */}
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
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
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

          <RoleSwitcher />

          <span style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#0D7377'
          }}>
            DiveBuddy
          </span>
        </div>
      </header>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Content */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: 200,
        }}
      >
        {children}
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <AppShell>{children}</AppShell>
    </UserProvider>
  )
}
