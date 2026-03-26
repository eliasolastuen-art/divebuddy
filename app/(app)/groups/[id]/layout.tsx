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
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-bg)',
      overflow: 'hidden',
    }}>
      {/* Group Header */}
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
          gap: 14,
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <button
            onClick={() => router.back()}
            style={{
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.7)',
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

      {/* Content — scrolls freely */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: 'var(--content-bottom)',
      }}>
        {children}
      </main>

      {/* Group Bottom Nav — flex in flow, never overlaps */}
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
                  gap: 3,
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: 12,
                  minWidth: 72,
                  transition: 'opacity 0.15s',
                }}
              >
                <div style={{
                  width: 32, height: 32,
                  borderRadius: 10,
                  background: active ? `${groupColor}18` : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}>
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    color={active ? groupColor : '#94A3B8'}
                  />
                </div>
                <span style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  color: active ? groupColor : '#94A3B8',
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
