'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import Portal from '@/components/Portal'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import { mondayOf } from '@/lib/schedule/format'
import { staffNames } from '@/lib/schedule/select'
import { longDate, pairGroups, pairStatus, pairTime, type PassPair } from '@/lib/schedule/pairing'
import { C, primaryButton } from './ui'
import { useStartLive } from './useStartLive'

// Design screen 2: one scheduled pass (land + vatten together) as a bottom sheet
export default function PassSheet({ pair, onClose }: { pair: PassPair; onClose: () => void }) {
  const { data, setAttendance } = useSchedule()
  const { me } = useViewer()
  const { start, starting, error } = useStartLive()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const status = pairStatus(pair)
  const myParts = me ? pair.parts.filter(p => p.staffIds.includes(me.id)) : []
  const here = myParts.length > 0 && myParts.every(p => p.attendance?.[me!.id] === 'narvarande')
  const toggleHere = () => me && setAttendance(myParts.map(p => p.id), me.id, here ? null : 'narvarande')

  const planHref = `/planning?view=vecka&week=${mondayOf(pair.date)}&pass=${pair.id}`
  const contentHref = pair.trainingId ? `/planning/${pair.trainingId}` : planHref

  return (
    <Portal>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(30,43,66,0.45)' }} />
      <div role="dialog" aria-modal="true" aria-label={`Pass ${longDate(pair.date)} ${pairTime(pair)}`} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201, maxWidth: 560, margin: '0 auto',
        maxHeight: 'min(690px, 92dvh)', background: '#fff', borderRadius: '24px 24px 0 0',
        display: 'flex', flexDirection: 'column', color: C.text,
      }}>
        <div style={{ flex: 'none', display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <span style={{ width: 40, height: 5, borderRadius: 3, background: '#D5DEE9' }} />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>{longDate(pair.date)}</div>
              <h1 style={{ margin: '2px 0 0', fontSize: 30, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', textDecoration: status === 'cancelled' ? 'line-through' : 'none' }}>{pairTime(pair)}</h1>
              <div style={{ marginTop: 4, fontSize: 16, fontWeight: 700 }}>
                {pairGroups(data, pair)}{status === 'cancelled' && <span style={{ color: C.muted, fontWeight: 600 }}> · Inställt</span>}
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Stäng" style={{ width: 44, height: 44, borderRadius: 12, background: C.bg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <X size={18} color={C.text} strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.muted }}>Upplägg</h2>
            <div style={{ borderRadius: 16, border: `1px solid ${C.line}`, padding: '0 16px' }}>
              {pair.parts.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < pair.parts.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                  <span style={{ width: 48, fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{p.start || '–'}</span>
                  <span style={{ minWidth: 60, fontSize: 15, fontWeight: 700 }}>{p.place || '–'}</span>
                  <span style={{ flex: 1, fontSize: 14, color: C.muted, fontWeight: 500, textAlign: 'right' }}>{staffNames(data, p.staffIds) || 'Ingen tränare'}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.muted }}>Innehåll</h2>
            <Link href={contentHref} onClick={onClose} style={{ textDecoration: 'none', color: 'inherit', borderRadius: 16, border: `1px solid ${C.line}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 48 }}>
              <div style={{ flex: 1 }}>
                {pair.training ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{pair.training.title}</div>
                    <div style={{ fontSize: 13, color: C.muted, fontWeight: 500, marginTop: 2 }}>
                      {pair.training.blocks} block · {pair.training.items} övningar
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.primary }}>Planera innehåll</div>
                )}
              </div>
              <span aria-hidden style={{ fontSize: 22, color: C.primary, lineHeight: 1 }}>›</span>
            </Link>
          </section>

          {myParts.length > 0 && status !== 'cancelled' && (
            <section style={{ borderRadius: 16, background: C.bg, padding: '12px 12px 12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>Jag är på plats</span>
              <button type="button" onClick={toggleHere} aria-pressed={here}
                aria-label={here ? 'Närvarande – tryck för att ångra' : 'Markera närvarande'}
                style={{
                  width: 44, height: 44, borderRadius: 12, fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: 0, cursor: 'pointer', color: '#fff',
                  background: here ? C.primary : '#fff', border: `2px solid ${here ? C.primary : '#B9C6D8'}`,
                }}>✓</button>
            </section>
          )}
          {error && <p role="alert" style={{ margin: 0, fontSize: 14, color: C.text, fontWeight: 600 }}>{error}</p>}
        </div>

        <div style={{ flex: 'none', padding: '12px 20px calc(22px + var(--safe-bottom))', borderTop: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {status !== 'cancelled' && (
            <button type="button" onClick={() => start(pair)} disabled={starting} style={{ ...primaryButton, opacity: starting ? 0.7 : 1 }}>
              {status === 'running' ? 'Fortsätt passet' : starting ? 'Startar …' : 'Starta live'}
            </button>
          )}
          <Link href={planHref} onClick={onClose} style={{ minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.primary, textDecoration: 'none' }}>
            Ändra tid, tränare eller ställ in
          </Link>
        </div>
      </div>
    </Portal>
  )
}
