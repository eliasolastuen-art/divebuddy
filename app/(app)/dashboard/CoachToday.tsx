'use client'

import Link from 'next/link'
import { ClipboardList, Lightbulb, Trophy, ChevronRight } from 'lucide-react'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import {
  addDays, cardStyle, dayShort, daysBetween, mondayOf, passStatus, rangeLabel, shortDate,
  STATUS_STYLE, timeText, todayISO, UI, weekNumber,
} from '@/lib/schedule/format'
import { activePasses, comparePasses, groupLabel, groupMap, nextCompetition, passesBetween, passesUntil } from '@/lib/schedule/select'
import { findPreviousPlanned, hasContent } from '@/lib/schedule/content'
import { PlaceTag } from '../planning/schedule/ui'
import { ContentChips, ReviewMark } from '../planning/schedule/planningUi'

const passLink = (id: string, date: string) => `/planning?view=vecka&week=${mondayOf(date)}&pass=${id}`

// Dashboard for a coach: what's on today, what needs planning, how ready next week is
export default function CoachToday() {
  const { data } = useSchedule()
  const { groupIds, me } = useViewer()
  const today = todayISO()
  const gm = groupMap(data)
  const mine = activePasses(data).filter(p => p.groupIds.some(g => groupIds.includes(g)) && p.cancelledReason === null)

  const todays = mine.filter(p => p.date === today).sort(comparePasses)
  const toPlan = mine.filter(p => p.date >= today && passStatus(p, today) === 'unplanned').sort(comparePasses).slice(0, 5)
  const recent = mine.filter(p => p.date < today && p.date >= addDays(today, -3) && hasContent(p.content)).sort(comparePasses).reverse()

  const nextMonday = addDays(mondayOf(today), 7)
  const nextWeek = data.groups.filter(g => groupIds.includes(g.id)).map(g => {
    const ps = passesBetween(data, nextMonday, addDays(nextMonday, 6)).filter(p => p.groupIds.includes(g.id) && p.cancelledReason === null)
    return { g, total: ps.length, planned: ps.filter(p => p.contentStatus === 'planned').length, draft: ps.filter(p => p.contentStatus === 'draft').length }
  }).filter(x => x.total > 0)

  const comp = nextCompetition(data, today, groupIds)

  // Inspiration for the next unplanned pass: a pass marked "kör igen" for the same group, else last time's
  const nextOpen = toPlan[0]
  const suggestion = nextOpen
    ? (mine.filter(p => p.date < nextOpen.date && p.review?.repeat && p.groupIds.some(g => nextOpen.groupIds.includes(g)) && hasContent(p.content))
        .sort(comparePasses).reverse()[0] ?? findPreviousPlanned(data, nextOpen))
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Idag */}
      <section>
        <Heading href="/planning?view=vecka" link="Veckan →">{me ? `Idag, ${me.name}` : 'Idag'}</Heading>
        {todays.length === 0 ? (
          <div style={{ ...cardStyle, padding: '14px 16px', fontSize: 14, color: UI.muted }}>Inga pass för dina grupper idag.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todays.map(p => {
              const planned = hasContent(p.content)
              return (
                <Link key={p.id} href={passLink(p.id, p.date)} style={{ ...cardStyle, textDecoration: 'none', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: `4px solid ${gm[p.groupIds[0]]?.color}` }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: UI.text, fontVariantNumeric: 'tabular-nums' }}>{timeText(p)}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: gm[p.groupIds[0]]?.color }}>{groupLabel(data, p)}</span>
                      <PlaceTag place={p.place} />
                    </div>
                    {planned
                      ? <span style={{ fontSize: 13, color: UI.text, fontWeight: 600 }}>{p.content!.blocks.map(b => b.name).join(' · ')}</span>
                      : <span style={{ fontSize: 13, color: '#92400E', fontWeight: 700 }}>Inte planerat än</span>}
                    <ContentChips pass={p} />
                  </div>
                  <span style={{ flexShrink: 0, minHeight: 36, padding: '0 12px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: 800, background: planned ? UI.tealLight : UI.teal, color: planned ? UI.tealDark : '#fff' }}>
                    {planned ? 'Visa passet' : 'Planera nu'}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Att planera */}
      {toPlan.length > 0 && (
        <section>
          <Heading href="/planning?view=period" link="Perioden →">Att planera</Heading>
          <div style={{ ...cardStyle, padding: 6 }}>
            {toPlan.map(p => (
              <Link key={p.id} href={passLink(p.id, p.date)} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 52, padding: '6px 10px', borderRadius: 12, textDecoration: 'none' }}>
                <ClipboardList size={18} color="#B45309" aria-hidden />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: UI.text }}>{dayShort(p.date)} {shortDate(p.date)} · {p.start}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: UI.muted }}>{groupLabel(data, p)} · {p.place}</span>
                </span>
                <ChevronRight size={18} color={UI.faint} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Nästa vecka per grupp */}
      {nextWeek.length > 0 && (
        <section>
          <Heading href={`/planning?view=vecka&week=${nextMonday}`} link="Planera →">Nästa vecka · v.{weekNumber(nextMonday)}</Heading>
          <div style={{ ...cardStyle, padding: 14, display: 'grid', gap: 10 }}>
            {nextWeek.map(({ g, total, planned, draft }) => (
              <div key={g.id} style={{ display: 'grid', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                  <span style={{ fontWeight: 800, color: UI.text }}>{g.name}</span>
                  <span style={{ color: planned === total ? '#15803D' : UI.muted, fontWeight: 700 }}>{planned}/{total} planerade{draft ? ` · ${draft} utkast` : ''}</span>
                </div>
                <div aria-hidden style={{ display: 'flex', height: 8, borderRadius: 8, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <span style={{ width: `${(planned / total) * 100}%`, background: STATUS_STYLE.planned.border }} />
                  <span style={{ width: `${(draft / total) * 100}%`, background: STATUS_STYLE.draft.border }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Inspiration */}
      {nextOpen && suggestion?.content && (
        <Link href={passLink(nextOpen.id, nextOpen.date)} style={{ ...cardStyle, textDecoration: 'none', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ width: 44, height: 44, borderRadius: 13, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Lightbulb size={20} color="#6D28D9" /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: UI.text }}>Förslag till {dayShort(nextOpen.date)} {shortDate(nextOpen.date)} ({groupLabel(data, nextOpen)})</span>
            <span style={{ display: 'block', fontSize: 12.5, color: UI.muted, marginTop: 2 }}>
              Kör {suggestion.content.blocks.map(b => b.name).join(' · ')} från {shortDate(suggestion.date)}{suggestion.review?.repeat ? ' (markerat kör igen)' : ''}
            </span>
          </span>
          <ChevronRight size={18} color={UI.faint} />
        </Link>
      )}

      {/* Senaste passen */}
      {recent.length > 0 && (
        <section>
          <Heading>Senaste passen</Heading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.map(p => (
              <Link key={p.id} href={passLink(p.id, p.date)} style={{ ...cardStyle, textDecoration: 'none', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: UI.muted }}>
                    <strong style={{ color: UI.text }}>{dayShort(p.date)} {shortDate(p.date)}</strong>{groupLabel(data, p)}<ReviewMark pass={p} />
                  </span>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: UI.text, marginTop: 2 }}>{p.content!.blocks.map(b => b.name).join(' · ')}</span>
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: UI.tealDark, flexShrink: 0 }}>{p.review ? 'Ändra' : 'Så gick det?'}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Nästa tävling */}
      {comp && (
        <div style={{ ...cardStyle, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trophy size={20} color="#B45309" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: UI.text }}>{comp.title}</div>
            <div style={{ fontSize: 12.5, color: UI.muted, marginTop: 2 }}>
              {rangeLabel(comp.startsOn, comp.endsOn)}
              {comp.groupIds.length > 0 && ` · ${comp.groupIds.filter(id => groupIds.includes(id)).map(id => gm[id]?.name).join(', ')}`}
              {` · ${passesUntil(data, comp, today).filter(p => p.groupIds.some(g => groupIds.includes(g))).length} pass kvar`}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#B45309', lineHeight: 1, letterSpacing: '-0.03em' }}>{daysBetween(today, comp.startsOn)}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: UI.muted }}>dagar</div>
          </div>
        </div>
      )}
    </div>
  )
}

function Heading({ children, href, link }: { children: React.ReactNode; href?: string; link?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 14, fontWeight: 800, color: UI.text, letterSpacing: '-0.02em' }}>{children}</span>
      {href && link && <Link href={href} style={{ fontSize: 13, fontWeight: 600, color: UI.muted, textDecoration: 'none' }}>{link}</Link>}
    </div>
  )
}
