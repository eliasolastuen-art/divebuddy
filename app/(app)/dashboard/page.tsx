'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/context/user'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import { addDays, DAY_SHORT, dateNum, mondayOf, rangeLabel, todayISO, weekNumber, EVENT_STYLE } from '@/lib/schedule/format'
import { groupMap } from '@/lib/schedule/select'
import { hasMe, longDate, pairGroups, pairPasses, pairStatus, pairSummary, pairTime, PAIR_STATUS_LABEL, type PassPair } from '@/lib/schedule/pairing'
import PassSheet from '@/components/schedule/PassSheet'
import { C, Empty, Hero, ListCard, Screen, Section, TextLink } from '@/components/schedule/ui'

// Design screen 1: greeting, my passes today, my week, the next two important dates
export default function DashboardPage() {
  const router = useRouter()
  const { profile, activeRole, loading } = useUser()
  const { data, loading: scheduleLoading, reload } = useSchedule()
  const { me, groupIds } = useViewer()
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && activeRole === 'athlete') router.replace('/athlete')
  }, [activeRole, loading, router])

  // Live status changes elsewhere; refresh when coming back here
  useEffect(() => { reload() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const today = todayISO()
  const monday = mondayOf(today)
  const pairs = useMemo(() => pairPasses(data.passes), [data.passes])
  const isMine = (p: PassPair) => (me ? hasMe(p, me.id) : p.groupIds.some(g => groupIds.includes(g)))
  const mine = pairs.filter(isMine)
  const todays = mine.filter(p => p.date === today && !p.cancelled)
  const open = openId ? pairs.find(p => p.id === openId) ?? null : null

  const gm = groupMap(data)
  const trainingGroups = data.groups.filter(g => g.name !== 'Vuxen').length
  const upcoming = data.events.filter(e => e.endsOn >= today).slice(0, 2)

  const firstName = me?.name ?? profile?.full_name?.split(' ')[0] ?? ''
  const sentence = scheduleLoading ? 'Hämtar dagens pass …'
    : todays.length === 0 ? 'Du har inga pass idag.'
    : todays.length === 1 ? `Du har ett pass idag, kl ${todays[0].start}.`
    : `Du har ${todays.length} pass idag, första kl ${todays[0].start}.`

  return (
    <Screen>
      <Hero>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600 }}>{longDate(today)} · vecka {weekNumber(today)}</p>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>Hej{firstName ? ` ${firstName}` : ''}</h1>
        <p style={{ margin: '10px 0 0', fontSize: 15, fontWeight: 600 }}>{sentence}</p>
      </Hero>

      <Section title="Idag">
        {todays.length === 0 && !scheduleLoading && <ListCard><Empty>Inga pass för dig idag.</Empty></ListCard>}
        {todays.map(p => {
          const status = pairStatus(p)
          return (
            <button key={p.id} type="button" onClick={() => setOpenId(p.id)} style={{
              textAlign: 'left', fontFamily: 'inherit', color: 'inherit', cursor: 'pointer', width: '100%',
              borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{pairTime(p)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: status === 'done' ? C.muted : C.primary }}>{PAIR_STATUS_LABEL[status]}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{pairGroups(data, p)}</div>
              <div style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>{pairSummary(data, p, me?.id ?? null)}</div>
              <div style={{ marginTop: 8, paddingTop: 12, borderTop: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: C.primary, width: '100%' }}>
                <span>{p.training?.title ?? 'Planera innehåll'}</span><span aria-hidden style={{ fontSize: 20, lineHeight: 1 }}>›</span>
              </div>
            </button>
          )
        })}
      </Section>

      <Section title="Min vecka" action={<TextLink href="/planning">Visa veckan</TextLink>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(monday, i)
            const isToday = d === today
            const hasPass = mine.some(p => p.date === d && !p.cancelled)
            return (
              <div key={d} aria-label={`${DAY_SHORT[i]} ${dateNum(d)}${hasPass ? ', du har pass' : ''}`} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '9px 0 8px', borderRadius: 14,
                background: isToday ? C.primary : C.card, border: `1px solid ${isToday ? C.primary : C.line}`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isToday ? '#fff' : C.muted }}>{DAY_SHORT[i]}</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: isToday ? '#fff' : C.text }}>{dateNum(d)}</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: !hasPass ? 'transparent' : isToday ? '#fff' : C.primary }} />
              </div>
            )
          })}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: C.muted, fontWeight: 500 }}>Prick = du har pass den dagen.</p>
      </Section>

      <Section title="Kommande">
        <ListCard>
          {upcoming.length === 0 && <Empty>Inga viktiga datum framåt.</Empty>}
          {upcoming.map((e, i) => {
            const all = e.groupIds.length === 0 || e.groupIds.length >= trainingGroups
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < upcoming.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                <span style={{ width: 64, flex: 'none', fontSize: 14, fontWeight: 800, color: C.primary }}>{rangeLabel(e.startsOn, e.endsOn)}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{e.title}</div>
                  <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
                    {all ? 'Alla grupper' : `${EVENT_STYLE[e.type].label} · ${e.groupIds.map(id => gm[id]?.name).filter(Boolean).join(', ')}`}
                  </div>
                </div>
              </div>
            )
          })}
        </ListCard>
      </Section>

      {open && <PassSheet pair={open} onClose={() => setOpenId(null)} />}
    </Screen>
  )
}
