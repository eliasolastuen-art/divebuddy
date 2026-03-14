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
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 999,
      display: 'flex',
      justifyContent: 'center',
      padding: `8px 20px calc(env(safe-area-inset-bottom, 0px) + 8px)`,
      pointerEvents: 'none',
    }}>
      {/* Floating pill container */}
      <div className="glass-nav" style={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: 32,
        padding: '6px 8px',
        gap: 2,
        pointerEvents: 'all',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
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
                justifyContent: 'center',
                gap: 3,
                textDecoration: 'none',
                padding: '8px 18px',
                borderRadius: 24,
                background: active
                  ? 'linear-gradient(135deg, #0D7377 0%, #0a5c60 100%)'
                  : 'transparent',
                boxShadow: active
                  ? '0 2px 12px rgba(13,115,119,0.35), inset 0 1px 0 rgba(255,255,255,0.2)'
                  : 'none',
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                minWidth: 64,
              }}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.8}
                color={active ? 'white' : '#94A3B8'}
                style={{ transition: 'all 0.2s ease' }}
              />
              <span style={{
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                color: active ? 'rgba(255,255,255,0.9)' : '#94A3B8',
                letterSpacing: '0.02em',
                transition: 'all 0.2s ease',
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
