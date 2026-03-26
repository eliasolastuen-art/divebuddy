'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { ArrowLeft, LayoutGrid, CalendarDays, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import Link from 'next/link'

interface Group {
  id: string
  name: string
  color: string | null
}

export default function GroupLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const { profile } = useUser()
  const groupId = params.id as string

  const [group, setGroup] = useState<Group | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('groups')
      .select('id, name, color')
      .eq('id', groupId)
      .single()
      .then(({ data }) => { if (data) setGroup(data) })
  }, [groupId])

  const groupColor = group?.color || '#0D7377'

  // For deep routes (e.g. athlete profile), render children only
  const isDeepRoute = /^\/groups\/[^/]+\/athletes\/[^/]+/.test(pathname)
  if (isDeepRoute) {
    return <>{children}</>
  }

  const tabs = [
    { href: `/groups/${groupId}`, label: 'Översikt', Icon: LayoutGrid },
    { href: `/groups/${groupId}/planning`, label: 'Planning', Icon: CalendarDays },
    { href: `/groups/${groupId}/athletes`, label: 'Atleter', Icon: Users },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface-bg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Group Header */}
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
          gap: 14,
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <button
            onClick={() => router.back()}
            style={{
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 12,
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="Gå tillbaka"
          >
            <ArrowLeft size={18} color="#1E293B" strokeWidth={2.5} />
          </button>

          {group ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <div style={{
                width: 36, height: 36,
                borderRadius: 11,
                background: `${groupColor}20`,
                border: `2px solid ${groupColor}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: groupColor }}>
                  {group.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h1 style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.03em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {group.name}
              </h1>
            </div>
          ) : (
            <div style={{ flex: 1 }} />
          )}
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
        {children}
      </main>

      {/* Group Bottom Nav */}
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
            const active = tab.href === `/groups/${groupId}`
              ? pathname === tab.href
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
                  minWidth: 72,
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  color={active ? groupColor : '#94A3B8'}
                />
                <span style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  color: active ? groupColor : '#94A3B8',
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
