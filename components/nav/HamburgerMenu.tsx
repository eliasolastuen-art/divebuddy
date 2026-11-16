'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, ChevronRight, BookOpen, Users, LogOut, Shield, Waves, CalendarRange, ClipboardCheck } from 'lucide-react'
import { signOut } from '@/lib/auth'
import { useUser } from '@/lib/context/user'

interface Props {
  open: boolean
  onClose: () => void
}

interface Group {
  id: string
  name: string
  color: string | null
}

export default function HamburgerMenu({ open, onClose }: Props) {
  const router = useRouter()
  const { roles, activeRole, profile } = useUser()
  const [groups, setGroups] = useState<Group[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(true)
      if (profile?.club_id) {
        createClient()
          .from('groups')
          .select('*')
          .eq('club_id', profile.club_id)
          .order('name')
          .then(({ data }) => { if (data) setGroups(data) })
      }
    } else {
      const t = setTimeout(() => setVisible(false), 280)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!visible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(30,43,66,0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Sidebar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 101,
        width: 290,
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'rgba(240, 244, 248, 0.96)',
        boxShadow: '8px 0 40px rgba(0,0,0,0.18)',
        borderRight: '1px solid rgba(255,255,255,0.6)',
      }}>

        {/* Teal gradient accent at top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 200,
          background: 'linear-gradient(180deg, rgba(43,92,158,0.08) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #E1E8F0',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: 'var(--gradient-hero)',
              borderRadius: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'none',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M8 6C8 4.9 8.9 4 10 4h4c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2V6zM3 9a1 1 0 0 1 1-1h2v8H4a1 1 0 0 1-1-1V9zm14-1h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2V8z" fill="white"/>
              </svg>
            </div>
            <span style={{
              fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em',
              background: 'var(--gradient-hero)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>DiveBuddy</span>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: '#FFFFFF',
              border: '1px solid #E1E8F0',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Close menu"
          >
            <X size={16} color="#56637A" strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 12px', position: 'relative' }}>

          {/* Atlet-vy: förenklad meny */}
          {activeRole === 'athlete' ? (
            <div className="glass-card" style={{ padding: 6 }}>
              {[
                { href: '/athlete', label: 'Min sida', Icon: Waves },
              ].map((item, i, arr) => {
                const { Icon } = item
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 10px', borderRadius: 14, textDecoration: 'none',
                      borderBottom: i < arr.length - 1 ? '1px solid #E1E8F0' : 'none',
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 11,
                      background: 'rgba(43,92,158,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={16} color="#2B5C9E" strokeWidth={2} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#1E2B42', flex: 1 }}>
                      {item.label}
                    </span>
                    <ChevronRight size={14} color="#E1E8F0" strokeWidth={2.5} />
                  </Link>
                )
              })}
            </div>
          ) : (
            <>
              {/* Groups section */}
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#56637A',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '0 10px', marginBottom: 8,
              }}>
                Grupper
              </div>

              {groups.length === 0 ? (
                <div style={{ padding: '14px 10px', color: '#56637A', fontSize: 13 }}>
                  Inga grupper ännu
                </div>
              ) : (
                <div className="glass-card" style={{ padding: 6, marginBottom: 16 }}>
                  {groups.map((group, i) => (
                    <Link
                      key={group.id}
                      href={`/groups/${group.id}`}
                      onClick={onClose}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 10px', borderRadius: 14, textDecoration: 'none',
                        borderBottom: i < groups.length - 1 ? '1px solid #E1E8F0' : 'none',
                      }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 11,
                        background: `${group.color || '#2B5C9E'}18`,
                        border: `1.5px solid ${group.color || '#2B5C9E'}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: group.color || '#2B5C9E' }}>
                          {group.name.charAt(0)}
                        </span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#1E2B42', flex: 1 }}>
                        {group.name}
                      </span>
                      <ChevronRight size={14} color="#E1E8F0" strokeWidth={2.5} />
                    </Link>
                  ))}
                </div>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '4px 10px 16px' }} />

              {/* Other links */}
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#56637A',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '0 10px', marginBottom: 8,
              }}>
                Övrigt
              </div>

              <div className="glass-card" style={{ padding: 6 }}>
                {[
                  { href: '/schema', label: 'Schema', Icon: CalendarRange },
                  ...(roles.includes('coach') || roles.includes('admin') ? [{ href: '/narvaro', label: 'Närvaro', Icon: ClipboardCheck }] : []),
                  { href: '/library', label: 'Bibliotek', Icon: BookOpen },
                  { href: '/groups', label: 'Alla grupper & atleter', Icon: Users },
                  ...(roles.includes('admin') ? [{ href: '/admin', label: 'Admin', Icon: Shield }] : []),
                ].map((item, i, arr) => {
                  const { Icon } = item
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 10px', borderRadius: 14, textDecoration: 'none',
                        borderBottom: i < arr.length - 1 ? '1px solid #E1E8F0' : 'none',
                      }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 11,
                        background: 'rgba(43,92,158,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Icon size={16} color="#2B5C9E" strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#1E2B42', flex: 1 }}>
                        {item.label}
                      </span>
                      <ChevronRight size={14} color="#E1E8F0" strokeWidth={2.5} />
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Sign out */}
        <div style={{
          padding: '12px 12px',
          borderTop: '1px solid #E1E8F0',
        }}>
          <button
            onClick={async () => {
              await signOut()
              onClose()
              router.push('/login')
            }}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 10px', borderRadius: 14,
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.12)',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 11,
              background: 'rgba(239,68,68,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <LogOut size={16} color="#DC2626" strokeWidth={2} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#DC2626' }}>
              Sign out
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
