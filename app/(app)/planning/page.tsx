'use client'

import { Suspense, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import { addDays, DAY_LONG, mondayOf, shortDate, todayISO, weekNumber, weekRangeLabel, weekdayIndex } from '@/lib/schedule/format'
import { hasMe, pairGroups, pairPasses, type PassPair } from '@/lib/schedule/pairing'
import { TRAINING_STATUS_LABEL } from '@/lib/schedule/types'
import OldPassSheet from './schedule/PassSheet'
import PassSheet from '@/components/schedule/PassSheet'
import PlanStartSheet from '@/components/planning/PlanStartSheet'
import { Segmented } from '@/components/library/GroupTiles'
import { C, Empty, ListCard } from '@/components/schedule/ui'

type Scope = 'mina' | 'alla'

// Design screen 3: one week of scheduled passes, "Mina pass" / "Alla pass".
// A pass with content opens /planning/[id]; without content "Planera pass".
function PlanningContent() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { data, loading } = useSchedule()
  const { me } = useViewer()
  const today = todayISO()

  const weekParam = params.get('week')
  const monday = mondayOf(weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : today)
  const [picked, setScope] = useState<Scope | null>(null)
  const scope: Scope = picked ?? (me ? 'mina' : 'alla')
  const [openId, setOpenId] = useState<string | null>(params.get('edit') ? null : params.get('pass'))
  const [planId, setPlanId] = useState<string | null>(null)
  const editId = params.get('edit') ? params.get('pass') : null

  const setWeek = (m: string) => router.replace(`${pathname}?week=${m}`, { scroll: false })

  const pairs = useMemo(() => pairPasses(data.passes), [data.passes])
  const week = pairs.filter(p => p.date >= monday && p.date <= addDays(monday, 6))
  const shown = scope === 'mina' && me ? week.filter(p => hasMe(p, me.id)) : week
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
    .map(d => ({ date: d, items: shown.filter(p => p.date === d) }))
    .filter(d => d.items.length)

  const find = (id: string | null) => (id ? pairs.find(p => p.id === id || p.parts.some(x => x.id === id)) ?? null : null)
  const open = find(openId)
  const planning = find(planId)

  // With content → the pass page; cancelled → pass sheet as before; empty → "Planera pass"
  const tap = (p: PassPair) => {
    if (p.cancelled) setOpenId(p.id)
    else if (p.trainingId) router.push(`/planning/${p.trainingId}`)
    else setPlanId(p.id)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 20, color: C.text }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>Vecka {weekNumber(monday)}</h1>
            <div style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>{weekRangeLabel(monday).replace(/ (\w+)$/, (_, m) => ` ${MONTH_FULL[m] ?? m}`)}</div>
          </div>
          <button type="button" aria-label="Föregående vecka" onClick={() => setWeek(addDays(monday, -7))} style={arrowStyle}>‹</button>
          <button type="button" aria-label="Nästa vecka" onClick={() => setWeek(addDays(monday, 7))} style={arrowStyle}>›</button>
        </div>
        <Segmented label="Vilka pass" options={[['mina', 'Mina pass'], ['alla', 'Alla pass']]} value={scope} onChange={setScope} />
      </div>

      {loading && <ListCard><Empty>Hämtar veckan …</Empty></ListCard>}
      {!loading && days.length === 0 && (
        <ListCard><Empty>{scope === 'mina' ? 'Du har inga pass den här veckan.' : 'Inga pass den här veckan.'}</Empty></ListCard>
      )}

      {days.map(d => (
        <section key={d.date} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: d.date === today ? C.primary : C.text }}>
            {DAY_LONG[weekdayIndex(d.date)]} {shortDate(d.date)}
          </h2>
          <ListCard>
            {d.items.map((p, i) => (
              <button key={p.id} type="button" onClick={() => tap(p)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', minHeight: 48,
                background: 'none', border: 'none', borderBottom: i < d.items.length - 1 ? `1px solid ${C.line}` : 'none',
                textAlign: 'left', fontFamily: 'inherit', color: C.text, cursor: 'pointer',
              }}>
                <span style={{ width: 48, flex: 'none', fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', textDecoration: p.cancelled ? 'line-through' : 'none', color: p.cancelled ? C.muted : C.text }}>{p.start || '–'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, textDecoration: p.cancelled ? 'line-through' : 'none', color: p.cancelled ? C.muted : C.text }}>{pairGroups(data, p)}</div>
                  <div style={{ fontSize: 13.5, marginTop: 2, ...(p.cancelled || p.training ? { color: C.muted, fontWeight: 500 } : { color: C.primary, fontWeight: 700 }) }}>
                    {p.cancelled ? 'Inställt' : p.training?.title ?? 'Planera innehåll'}
                  </div>
                </div>
                {!p.cancelled && p.training && (
                  <span style={{ fontSize: 13, ...(p.training.status === 'draft' ? { color: C.primary, fontWeight: 800 } : { color: C.muted, fontWeight: 600 }) }}>
                    {TRAINING_STATUS_LABEL[p.training.status]}
                  </span>
                )}
                <span aria-hidden style={{ fontSize: 20, color: '#8A96A8', lineHeight: 1 }}>›</span>
              </button>
            ))}
          </ListCard>
        </section>
      ))}

      {open && <PassSheet pair={open} onClose={() => setOpenId(null)} />}
      {planning && <PlanStartSheet pair={planning} onClose={() => setPlanId(null)} />}
      {editId && <OldPassSheet passId={editId} variant="schema" onClose={() => router.replace(`${pathname}?week=${monday}`, { scroll: false })} />}
    </div>
  )
}

const MONTH_FULL: Record<string, string> = {
  jan: 'januari', feb: 'februari', mar: 'mars', apr: 'april', maj: 'maj', jun: 'juni',
  jul: 'juli', aug: 'augusti', sep: 'september', okt: 'oktober', nov: 'november', dec: 'december',
}

const arrowStyle: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.line}`, background: '#fff',
  fontSize: 20, fontWeight: 700, color: C.text, cursor: 'pointer', fontFamily: 'inherit',
}

export default function PlanningPage() {
  return (
    <Suspense fallback={null}>
      <PlanningContent />
    </Suspense>
  )
}
