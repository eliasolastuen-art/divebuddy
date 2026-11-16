'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import { DAY_LONG, todayISO, weekdayIndex } from '@/lib/schedule/format'
import { hasMe, longDate, pairGroups, pairPasses, pairStatus, PAIR_STATUS_LABEL, type PassPair } from '@/lib/schedule/pairing'
import PassSheet from '@/components/schedule/PassSheet'
import { C, Empty, Hero, ListCard, Row, Screen, Section, TextLink } from '@/components/schedule/ui'

interface ActiveLive {
  id: string
  started_at: string
  schedule_session_id: string | null
  trainings: { title: string } | null
  groups: { name: string } | null
}

const nowHHMM = () => new Date().toTimeString().slice(0, 5)
const minutesSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))

// "Pågår nu · 52 min", or the start date for a session left open since an earlier day
function runningLabel(iso: string) {
  const min = minutesSince(iso)
  if (min < 12 * 60) return `Pågår nu · ${min} min`
  const d = new Date(iso)
  return `Ej avslutat · startat ${d.getDate()} ${['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][d.getMonth()]}`
}

// Design screen 4: what is running now, today's passes, my next pass
export default function LivePage() {
  const { profile } = useUser()
  const { data, loading, reload } = useSchedule()
  const { me, groupIds } = useViewer()
  const [active, setActive] = useState<ActiveLive | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [, tick] = useState(0)

  useEffect(() => { reload() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!profile?.id) return
    createClient().from('live_sessions')
      .select('id, started_at, schedule_session_id, trainings(title), groups(name)')
      .eq('coach_id', profile.id).eq('status', 'active')
      .order('started_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data: row }) => setActive(row as unknown as ActiveLive | null))
  }, [profile?.id])

  const today = todayISO()
  const pairs = useMemo(() => pairPasses(data.passes), [data.passes])
  const inScope = (p: PassPair) => p.groupIds.some(g => groupIds.includes(g))
  const todays = pairs.filter(p => p.date === today && inScope(p))
  const isMine = (p: PassPair) => (me ? hasMe(p, me.id) : inScope(p))
  const now = nowHHMM()
  const next = pairs.find(p => isMine(p) && !p.cancelled && pairStatus(p) === 'planned' &&
    (p.date > today || (p.date === today && (p.start || '00:00') > now)))
  const open = openId ? pairs.find(p => p.id === openId) ?? null : null

  // Hero line: "TG + FG · vatten till 19:00" when the live session came from the schedule
  const activePair = active?.schedule_session_id ? pairs.find(p => p.parts.some(x => x.id === active.schedule_session_id)) : null
  const currentPart = activePair?.parts.filter(x => !x.start || x.start <= now).pop() ?? activePair?.parts[0]
  const heroSub = activePair
    ? `${pairGroups(data, activePair)} · ${(currentPart?.place ?? '').toLowerCase()}${activePair.end ? ` till ${activePair.end}` : ''}`
    : active?.groups?.name ?? ''

  return (
    <Screen>
      <div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>Live</h1>
        <div style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>{longDate(today)}</div>
      </div>

      {active && (
        <Hero>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{runningLabel(active.started_at)}</span>
          <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15 }}>{active.trainings?.title ?? 'Fritt pass'}</span>
          {heroSub && <span style={{ fontSize: 15, fontWeight: 600 }}>{heroSub}</span>}
          <Link href={`/live/session/${active.id}`} style={{
            marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: 14,
            background: '#fff', color: '#234E88', fontSize: 16, fontWeight: 800, textDecoration: 'none',
          }}>Fortsätt passet</Link>
        </Hero>
      )}

      <Section title="Idag">
        <ListCard>
          {loading && <Empty>Hämtar dagens pass …</Empty>}
          {!loading && todays.length === 0 && <Empty>Inga pass idag.</Empty>}
          {todays.map((p, i) => {
            const status = pairStatus(p)
            return (
              <Row key={p.id} onClick={() => setOpenId(p.id)} last={i === todays.length - 1}>
                <span style={{ width: 48, flex: 'none', fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', textDecoration: status === 'cancelled' ? 'line-through' : 'none' }}>{p.start || '–'}</span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{pairGroups(data, p)}</span>
                <span style={{ fontSize: 13.5, fontWeight: status === 'running' ? 700 : 600, color: status === 'running' ? C.primary : C.muted }}>{PAIR_STATUS_LABEL[status]}</span>
              </Row>
            )
          })}
        </ListCard>
      </Section>

      <Section title="Ditt nästa pass">
        {next ? (
          <button type="button" onClick={() => setOpenId(next.id)} style={{
            textAlign: 'left', fontFamily: 'inherit', color: 'inherit', cursor: 'pointer', width: '100%', minHeight: 48,
            borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, padding: 16, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {next.date === today ? 'Idag' : DAY_LONG[weekdayIndex(next.date)]} {next.start} · {pairGroups(data, next)}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: next.training ? C.muted : C.primary, marginTop: 2 }}>
                {next.training?.title ?? 'Planera innehåll'}
              </div>
            </div>
            <span aria-hidden style={{ fontSize: 20, color: '#8A96A8', lineHeight: 1 }}>›</span>
          </button>
        ) : (
          <ListCard><Empty>{loading ? 'Hämtar …' : 'Inga fler pass inplanerade för dig.'}</Empty></ListCard>
        )}
      </Section>

      <div style={{ textAlign: 'center' }}>
        <TextLink href="/live/vecka">Pass utan schema</TextLink>
      </div>

      {open && <PassSheet pair={open} onClose={() => setOpenId(null)} />}
    </Screen>
  )
}
