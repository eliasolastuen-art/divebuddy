'use client'

import BottomNav from '@/components/nav/BottomNav'
import HamburgerMenu from '@/components/nav/HamburgerMenu'
import RoleSwitcher from '@/components/nav/RoleSwitcher'
import { UserProvider, useUser } from '@/lib/context/user'
import { ScheduleProvider } from '@/lib/schedule/store'
import { Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { activeRole, loading } = useUser()

  // Auto-navigate when role switches
  useEffect(() => {
    if (loading || !activeRole) return
    if (activeRole === 'athlete' && !pathname.startsWith('/athlete')) {
      router.replace('/athlete')
    } else if (activeRole !== 'athlete' && pathname.startsWith('/athlete')) {
      router.replace('/dashboard')
    }
  }, [activeRole])

  // Group sub-routes and athlete routes have their own layouts
  const isGroupSubRoute = /^\/groups\/[^/]+/.test(pathname)
  const isAthleteRoute = pathname.startsWith('/athlete')

  if (isGroupSubRoute || isAthleteRoute) {
    return <>{children}</>
  }

  return (
    <div className="app-shell" style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-bg)',
      overflow: 'hidden',
    }}>
      {/* Header — fixed height, never overlaps content */}
      <header className="app-chrome" style={{
        flexShrink: 0,
        height: 'var(--content-top)',
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
          borderBottom: '1px solid #E1E8F0',
        }}>
          <button
            onClick={() => setMenuOpen(true)}
            style={{
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#FFFFFF',
              border: '1px solid #E1E8F0',
              borderRadius: 12,
              cursor: 'pointer',
            }}
            aria-label="Open menu"
          >
            <Menu size={18} color="#1E2B42" strokeWidth={2.2} />
          </button>
          <RoleSwitcher />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#2B5C9E', letterSpacing: '-0.02em' }}>
            DiveBuddy
          </span>
        </div>
      </header>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Content — scrolls freely, never hidden behind nav */}
      <main
        key={pathname}
        className="page-enter app-main"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: 'var(--content-bottom)',
        }}
      >
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
      <ScheduleProvider>
        <AppShell>{children}</AppShell>
      </ScheduleProvider>
    </UserProvider>
  )
}
