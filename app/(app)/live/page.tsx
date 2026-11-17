'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import { addDays, DAY_LONG, mondayOf, MONTHS_FULL, parseISO, shortDate, todayISO, weekNumber, weekdayIndex } from '@/lib/schedule/format'
import { toDateString } from '@/lib/utils/week'
import { hasMe, pairGroups, pairLayout, pairPasses, pairTime, type PassPair } from '@/lib/schedule/pairing'
import { activeSessions, runningLabel, type ActiveSession } from '@/lib/live/queries'
import { useStartLive } from '@/components/schedule/useStartLive'
import { Segmented } from '@/components/library/GroupTiles'
import LiveCard from '@/components/live/LiveCard'
import { C, TextLink } from '@/components/schedule/ui'

type Scope = 'mina' | 'alla'

// Design Live.dc.html: the week like Planning, but only published passes, as
// blue boxes to start or continue. Sessions left open sit under "Inte avslutat".
export default function LivePage() {
  const router = useRouter()
  const { profile } = useUser()
  const { data, loading, reload } = useSchedule()
  const { me } = useViewer()
  const today = todayISO()

  const [day, setDay] = useState(today)
  const [picked, setScope] = useState<Scope | null>(null)
  const scope: Scope = picked ?? (me ? 'mina' : 'alla')
  const [active, setActive] = useState<ActiveSession[]>([])
  const [startingId, setStartingId] = useState<string | null>(null)
  const { start, error } = useStartLive()
  const [, tick] = useState(0)

  useEffect(() => { reload() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 60000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (!profile?.club_id) return
    activeSessions(createClient(), profile.club_id).then(setActive).catch(() => setActive([]))
  }, [profile?.club_id])

  const pairs = useMemo(() => pairPasses(data.passes), [data.passes])
  const pairOf = (scheduleSessionId: string | null) =>
    scheduleSessionId ? pairs.find(p => p.parts.some(x => x.id === scheduleSessionId)) ?? null : null
  const running = (p: PassPair) => p.parts.find(x => x.live?.status === 'active')?.live ?? null
  const mine = (p: PassPair) => scope === 'alla' || !me || hasMe(p, me.id)

  // "Inte avslutat": started before today, or not from the schedule
  const open = active
    .map(s => ({ s, pair: pairOf(s.scheduleSessionId) }))
    .filter(({ s, pair }) => !pair || toDateString(new Date(s.startedAt)) < today)
    .filter(({ s, pair }) => scope === 'alla' || s.coachId === profile?.id || (!!pair && !!me && hasMe(pair, me.id)))
  const openPairIds = new Set(open.map(o => o.pair?.id).filter(Boolean))

  // Published passes, or passes running now (also "Kör igen" on a finished pass)
  const showsInLive = (p: PassPair) => !p.cancelled && !openPairIds.has(p.id) && (p.training?.status === 'published' || !!running(p))
  const onDay = (d: string) => pairs.filter(p => p.date === d && showsInLive(p) && mine(p))
  const todays = onDay(day)

  const monday = mondayOf(day)
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const setWeek = (m: string) => setDay(m === mondayOf(today) ? today : m)
  const dayDate = parseISO(day)

  const startPair = async (p: PassPair) => {
    const live = running(p)
    if (live) { router.push(`/live/session/${live.id}`); return }
    setStartingId(p.id)
    await start(p)
    setStartingId(null)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 20, color: C.text }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              {day === today ? 'Idag' : DAY_LONG[weekdayIndex(day)]}
            </h1>
            <div style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>
              {DAY_LONG[weekdayIndex(day)]} {dayDate.getDate()} {MONTHS_FULL[dayDate.getMonth()].toLowerCase()} · vecka {weekNumber(day)}
            </div>
          </div>
          <button type="button" aria-label="Föregående vecka" onClick={() => setWeek(addDays(monday, -7))} style={arrowStyle}>‹</button>
          <button type="button" aria-label="Nästa vecka" onClick={() => setWeek(addDays(monday, 7))} style={arrowStyle}>›</button>
        </div>
        <Segmented label="Vilka pass" options={[['mina', 'Mina pass'], ['alla', 'Alla pass']]} value={scope} onChange={setScope} />
        <div style={{ display: 'flex', gap: 4 }}>
          {week.map(d => {
            const on = d === day
            const has = onDay(d).length > 0
            return (
              <button key={d} type="button" onClick={() => setDay(d)} aria-pressed={on}
                aria-label={`${DAY_LONG[weekdayIndex(d)]} ${shortDate(d)}${has ? ', har pass' : ''}`}
                style={{
                  flex: 1, minHeight: 60, padding: '6px 0', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  fontFamily: 'inherit', cursor: 'pointer', background: on ? C.primary : '#fff', color: on ? '#fff' : C.text,
                  border: `1px solid ${on ? C.primary : C.line}`,
                }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{DAY_LONG[weekdayIndex(d)][0]}</span>
                <span style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{parseISO(d).getDate()}</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: has ? (on ? '#fff' : C.primary) : 'transparent' }} />
              </button>
            )
          })}
        </div>
      </div>

      {open.map(({ s, pair }) => {
        const date = pair?.date ?? toDateString(new Date(s.startedAt))
        return (
          <LiveCard key={s.id} heading="Inte avslutat"
            top={`${DAY_LONG[weekdayIndex(date)]} ${shortDate(date)} · ${s.checked} av ${s.total} övningar klara`}
            group={pair ? pairGroups(data, pair) : s.groupName ?? 'Pass utan grupp'}
            title={s.title ?? 'Fritt pass'}
            sub={pair ? pairLayout(data, pair) : ''}
            button="Fortsätt passet" onPress={() => router.push(`/live/session/${s.id}`)} />
        )
      })}

      {todays.map(p => {
        const live = running(p)
        return (
          <LiveCard key={p.id} heading={day === today ? 'Idag' : DAY_LONG[weekdayIndex(day)]}
            top={`${pairTime(p)}${live ? ` · ${runningLabel(live.startedAt)}` : ''}`}
            group={pairGroups(data, p)}
            title={p.training?.title ?? ''}
            sub={pairLayout(data, p)}
            button={live ? 'Fortsätt passet' : 'Starta passet'}
            busy={startingId === p.id}
            onPress={() => startPair(p)} />
        )
      })}

      {!loading && todays.length === 0 && (
        <div style={{ borderRadius: 18, background: '#fff', border: `1px solid ${C.line}`, padding: '0 16px' }}>
          <p style={{ margin: 0, padding: '14px 0', fontSize: 15, color: C.muted, fontWeight: 500 }}>
            Inga publicerade pass den här dagen. Utkast publicerar du i{' '}
            <Link href={`/planning?week=${monday}`} style={{ color: C.primary, fontWeight: 700, textDecoration: 'none' }}>Planning</Link>.
          </p>
        </div>
      )}
      {loading && <p style={{ margin: 0, fontSize: 15, color: C.muted, fontWeight: 500 }}>Hämtar veckan …</p>}
      {error && <p role="alert" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{error}</p>}

      <div style={{ textAlign: 'center' }}>
        <TextLink href="/live/vecka">Pass utan schema</TextLink>
      </div>
    </div>
  )
}

const arrowStyle: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.line}`, background: '#fff',
  fontSize: 20, fontWeight: 700, color: C.text, cursor: 'pointer', fontFamily: 'inherit',
}
