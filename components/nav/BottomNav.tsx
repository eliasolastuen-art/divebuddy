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
                color={active ? '#0D7377' : '#94A3B8'}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  color: active ? '#0D7377' : '#94A3B8',
                }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}