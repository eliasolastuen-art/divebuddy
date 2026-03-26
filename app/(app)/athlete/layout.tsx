'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, BookOpen, Target, MessageCircle } from 'lucide-react'

const tabs = [
  { href: '/athlete', label: 'Hem', Icon: Home },
  { href: '/athlete/dagbok', label: 'Dagbok', Icon: BookOpen },
  { href: '/athlete/mal', label: 'Mål', Icon: Target },
  { href: '/athlete/meddelanden', label: 'Meddelanden', Icon: MessageCircle },
]

export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-bg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <header style={{
        flexShrink: 0,
        height: 'var(--header-height)',
        paddingTop: 'var(--safe-top)',
        zIndex: 40,
        position: 'relative',
      }}>
        <div className="glass-nav" style={{
          height: '100%',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0D7377', letterSpacing: '-0.02em' }}>
            DiveBuddy
          </span>
        </div>
      </header>

      {/* Content — scrolls freely */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: 'var(--content-bottom)',
      }}>
        {children}
      </main>

      {/* Athlete Bottom Nav — flex in flow, never overlaps */}
      <nav style={{
        flexShrink: 0,
        paddingBottom: 'var(--safe-bottom)',
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        zIndex: 40,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: 'var(--nav-height)',
          maxWidth: 500,
          margin: '0 auto',
          padding: '0 8px',
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
                  gap: 3,
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: 12,
                  minWidth: 60,
                  transition: 'opacity 0.15s',
                }}
              >
                <div style={{
                  width: 32, height: 32,
                  borderRadius: 10,
                  background: active ? 'rgba(13,115,119,0.12)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}>
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    color={active ? '#0D7377' : '#94A3B8'}
                  />
                </div>
                <span style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  color: active ? '#0D7377' : '#94A3B8',
                  letterSpacing: '0.01em',
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
