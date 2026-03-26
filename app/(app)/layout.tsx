'use client'

import BottomNav from '@/components/nav/BottomNav'
import HamburgerMenu from '@/components/nav/HamburgerMenu'
import { UserProvider, useUser } from '@/lib/context/user'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

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
  const pathname = usePathname()

  // Group sub-routes and athlete routes have their own layouts
  const isGroupSubRoute = /^\/groups\/[^/]+/.test(pathname)
  const isAthleteRoute = pathname.startsWith('/athlete')

  if (isGroupSubRoute || isAthleteRoute) {
    return <>{children}</>
  }

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-bg)',
      overflow: 'hidden',
    }}>
      {/* Header — fixed height, never overlaps content */}
      <header style={{
        flexShrink: 0,
        height: 'var(--header-height)',
        paddingTop: 'var(--safe-top)',
        zIndex: 40,
        position: 'relative',
      }}>
        <div className="glass-nav" style={{
          height: '100%',
          padding: '0 16px',
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
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 12,
              cursor: 'pointer',
            }}
            aria-label="Open menu"
          >
            <Menu size={18} color="#1E293B" strokeWidth={2.2} />
          </button>
          <RoleSwitcher />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0D7377', letterSpacing: '-0.02em' }}>
            DiveBuddy
          </span>
        </div>
      </header>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Content — scrolls freely, never hidden behind nav */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: 'var(--content-bottom)',
      }}>
        {children}
      </main>

      {/* Bottom Nav — part of flex flow, never overlaps */}
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
