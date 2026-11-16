'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { useSchedule } from '@/lib/schedule/store'
import { addDays, DAY_LONG, DAY_SHORT, dateNum, daysBetween, mondayOf, rangeLabel, todayISO, weekdayIndex } from '@/lib/schedule/format'
import { pairPasses, pairStatus, pairTime, type PassPair } from '@/lib/schedule/pairing'
import { C, Empty, Hero, ListCard, Section } from '@/components/schedule/ui'

// Design screen 6 (athlete home): next pass, this week's passes, next
// competition and a shortcut to the diary. Nothing about coaches or attendance.

const nowHHMM = () => new Date().toTimeString().slice(0, 5)
const MONTH_FULL = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']

function when(date: string, today: string) {
  const d = daysBetween(today, date)
  if (d === 0) return Number(nowHHMM().slice(0, 2)) >= 15 ? 'ikväll' : 'idag'
  if (d === 1) return 'imorgon'
  return DAY_LONG[weekdayIndex(date)].toLowerCase()
}

function inDays(n: number) {
  if (n <= 0) return 'idag'
  if (n === 1) return 'imorgon'
  return `om ${n} dagar`
}

// "4–6 december"
const longRange = (a: string, b: string) => rangeLabel(a, b).replace(/ (\w{3})$/, (_, m) => ` ${MONTH_FULL.find(x => x.startsWith(m)) ?? m}`)

export default function AthletePage() {
  const router = useRouter()
  const { profile, activeRole, loading } = useUser()
  const { data, loading: scheduleLoading } = useSchedule()
  const [groupId, setGroupId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!loading && activeRole !== 'athlete') router.replace('/dashboard')
  }, [activeRole, loading, router])

  useEffect(() => {
    if (!profile?.id) return
    createClient().from('athletes').select('group_id').eq('profile_id', profile.id).maybeSingle()
      .then(({ data: a }) => setGroupId(a?.group_id ?? null))
  }, [profile?.id])

  const today = todayISO()
  const now = nowHHMM()
  const pairs = useMemo(() => (groupId ? pairPasses(data.passes).filter(p => p.groupIds.includes(groupId)) : []), [data.passes, groupId])

  const isLater = (p: PassPair) => p.date > today || (p.date === today && (p.end || p.start || '23:59') > now)
  const next = pairs.find(p => !p.cancelled && isLater(p))
  const monday = mondayOf(today)
  const week = pairs.filter(p => p.date >= monday && p.date <= addDays(monday, 6))
  const lastDone = [...pairs].reverse().find(p => !p.cancelled && !isLater(p) && daysBetween(p.date, today) <= 7)

  const comp = data.events
    .filter(e => e.type === 'comp' && e.endsOn >= today && (e.groupIds.length === 0 || (groupId && e.groupIds.includes(groupId))))
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0]

  const partsText = (p: PassPair) => p.parts.map((x, i) => {
    const place = i === 0 ? x.place : x.place.toLowerCase()
    return x.start ? `${place} ${x.start}` : place
  }).join(', ')

  if (groupId === null) {
    return <div style={{ padding: 16 }}><ListCard><Empty>Du är inte med i någon grupp än. Be din tränare lägga till dig.</Empty></ListCard></div>
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 24, color: C.text }}>
      {next ? (
        <Hero>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Nästa pass · {when(next.date, today)}</span>
          <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{pairTime(next)}</span>
          <span style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{partsText(next)}</span>
          {next.training && <span style={{ fontSize: 15, fontWeight: 600 }}>Fokus: {next.training.title}</span>}
        </Hero>
      ) : (
        <Hero><span style={{ fontSize: 15, fontWeight: 600 }}>{scheduleLoading || groupId === undefined ? 'Hämtar dina pass …' : 'Inga fler pass inplanerade.'}</span></Hero>
      )}

      <Section title="Veckans pass">
        <ListCard>
          {week.length === 0 && <Empty>Inga pass den här veckan.</Empty>}
          {week.map((p, i) => {
            const isToday = p.date === today
            const status = p.cancelled ? 'Inställt' : isToday ? 'Idag' : pairStatus(p) === 'done' || !isLater(p) ? 'Klart' : ''
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < week.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                <span style={{ width: 52, fontSize: 14, fontWeight: 700, color: isToday ? C.primary : C.muted }}>{DAY_SHORT[weekdayIndex(p.date)]} {dateNum(p.date)}</span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', textDecoration: p.cancelled ? 'line-through' : 'none' }}>{pairTime(p)}</span>
                {status && <span style={{ fontSize: 13.5, fontWeight: isToday ? 700 : 600, color: isToday ? C.primary : C.muted }}>{status}</span>}
              </div>
            )
          })}
        </ListCard>
      </Section>

      {comp && (
        <Section title="Nästa tävling">
          <div style={{ borderRadius: 18, background: '#fff', border: `1px solid ${C.line}`, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{comp.title}</div>
              <div style={{ fontSize: 13.5, color: C.muted, fontWeight: 500, marginTop: 2 }}>{longRange(comp.startsOn, comp.endsOn)}</div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.primary }}>{inDays(daysBetween(today, comp.startsOn))}</span>
          </div>
        </Section>
      )}

      {lastDone && (
        <Link href="/athlete/dagbok" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: 14, border: `1.5px solid ${C.primary}`, background: '#fff', fontSize: 15, fontWeight: 700, color: C.primary, textDecoration: 'none' }}>
          Skriv om {lastDone.date === today ? 'dagens' : `${DAY_LONG[weekdayIndex(lastDone.date)].toLowerCase()}ens`} pass
        </Link>
      )}
    </div>
  )
}
