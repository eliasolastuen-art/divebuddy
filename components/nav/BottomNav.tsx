'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Radio, CalendarDays, BookOpen } from 'lucide-react'

const tabs = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/live',      label: 'Live',       Icon: Radio },
  { href: '/planning',  label: 'Planning',   Icon: CalendarDays },
  { href: '/library',   label: 'Library',    Icon: BookOpen },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
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
          const active = pathname.startsWith(tab.href)
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
                minWidth: 64,
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
  )
}
