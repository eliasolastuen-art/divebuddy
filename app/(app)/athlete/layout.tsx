'use client'

import { usePathname } from 'next/navigation'
import { useUser } from '@/lib/context/user'
import Link from 'next/link'
import { Home, BookOpen, Target, MessageCircle } from 'lucide-react'

const BRAND = '#0D7377'

const tabs = [
  { href: '/athlete', label: 'Hem', Icon: Home },
  { href: '/athlete/dagbok', label: 'Dagbok', Icon: BookOpen },
  { href: '/athlete/mal', label: 'Mål', Icon: Target },
  { href: '/athlete/meddelanden', label: 'Meddelanden', Icon: MessageCircle },
]

export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile } = useUser()

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
          padding: '0 20px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: BRAND }}>
            DiveBuddy
          </span>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
        {children}
      </main>

      {/* Athlete Bottom Nav */}
      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 990,
        display: 'flex',
        justifyContent: 'center',
        padding: `8px 16px calc(env(safe-area-inset-bottom, 0px) + 8px)`,
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          width: '100%',
          maxWidth: 500,
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          borderRadius: 20,
          padding: '6px 10px',
          pointerEvents: 'all',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}>
          {tabs.map((tab) => {
            const active = tab.href === '/athlete'
              ? pathname === '/athlete'
              : pathname.startsWith(tab.href)
            const { Icon } = tab
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  textDecoration: 'none',
                  padding: '6px 10px',
                  borderRadius: 12,
                  minWidth: 60,
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  color={active ? BRAND : '#94A3B8'}
                />
                <span style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  color: active ? BRAND : '#94A3B8',
                }}>
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
