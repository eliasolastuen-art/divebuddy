'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, PencilLine, Plus, RotateCcw } from "lucide-react"
import { useViewer } from "@/lib/schedule/viewer"
import { useSchedule } from '@/lib/schedule/store'
import {
  addDays, cardStyle, DAY_LONG, DAY_SHORT, EVENT_STYLE, eventsOnDate, mondayOf, MONTHS_FULL, parseISO, passStatus,
  rangeLabel, shortDate, STATUS_STYLE, timeText, todayISO, UI, weekdayIndex, weekNumber, weekRangeLabel,
} from '@/lib/schedule/format'
import {
  activePasses, comparePasses, groupLabel, groupMap, groupRhythm, groupTimesText,
  passCountByGroup, staffNames,
} from '@/lib/schedule/select'
import type { ClubEvent, SchedulePass } from '@/lib/schedule/types'
import PassSheet from './PassSheet'
import PassForm from './PassForm'
import EventForm from './EventForm'
import { DateBadge, PlaceTag, Pills, SectionTitle, StatusTag } from "./ui"

type Sub = 'oversikt' | 'grupp' | 'kalender'

export type TermSub = Sub

// Schedule views (used on /schema). Editing is for admins only.
export default function TermView({ sub, onSubChange }: { sub: Sub; onSubChange: (s: Sub) => void }) {
  const { data } = useSchedule()
  const { canEditSchedule: canEdit } = useViewer()
  const setSub = onSubChange
  const [group, setGroup] = useState(data.groups[0]?.id ?? '')
  const [openPass, setOpenPass] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<string | null>(null) // event id or 'new'
  const [addingExtra, setAddingExtra] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="print-only" style={{ display: 'none', fontSize: 22, fontWeight: 900 }}>Träningsschema {data.term.name}</div>

      {message && (
        <div role="status" style={{ ...cardStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
          <span style={{ flex: 1 }}>{message}</span>
          <button onClick={() => setMessage(null)} aria-label="Stäng meddelandet" style={{ border: 'none', background: 'none', color: UI.muted, cursor: 'pointer', fontSize: 13, fontWeight: 700, minHeight: 32 }}>OK</button>
        </div>
      )}

      {sub === 'oversikt' && (
        <Overview canEdit={canEdit} onPickGroup={id => { setGroup(id); setSub('grupp') }}
          onEditEvent={id => setEditingEvent(id)} />
      )}
      {sub === 'grupp' && (
        <GroupSchedule groupId={group} onPickGroup={setGroup} onOpen={setOpenPass}
          canEdit={canEdit} onAddExtra={() => setAddingExtra(true)} />
      )}
      {sub === 'kalender' && <MonthCalendar onOpen={setOpenPass} />}

      <PassSheet variant="schema" passId={openPass} onClose={() => setOpenPass(null)} />
      {editingEvent && (
        <EventForm eventId={editingEvent === 'new' ? undefined : editingEvent}
          onClose={() => setEditingEvent(null)} onDone={setMessage} />
      )}
      {addingExtra && (
        <PassForm defaultGroupId={group} defaultDate={todayISO()} onClose={() => setAddingExtra(false)} onSaved={setOpenPass} />
      )}
    </div>
  )
}

// ═══════════════════════ Översikt ═══════════════════════

function Overview({ onPickGroup, canEdit, onEditEvent }: {
  onPickGroup: (id: string) => void
  canEdit: boolean
  onEditEvent: (id: string) => void
}) {
  const { data } = useSchedule()
  const counts = passCountByGroup(data)

  // Veckorytm: per weekday, which groups train when
  const rhythm = useMemo(() => {
    const days = new Map<number, { groupId: string; time: string }[]>()
    for (const g of data.groups) {
      for (const r of groupRhythm(data, g.id)) {
        const list = days.get(r.weekday) ?? []
        list.push({ groupId: g.id, time: r.time })
        days.set(r.weekday, list)
      }
    }
    return Array.from(days.entries()).sort((a, b) => a[0] - b[0])
      .map(([wd, items]) => ({ day: DAY_LONG[wd], items: items.sort((a, b) => (a.time < b.time ? -1 : 1)) }))
  }, [data])

  const gm = groupMap(data)
  const events = [...data.events].sort((a, b) => (a.startsOn < b.startsOn ? -1 : 1))
  const today = todayISO()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="sch-two">
        <div style={{ ...cardStyle, padding: '18px 18px 6px' }}>
          <SectionTitle aside={<span style={{ fontSize: 12.5, color: UI.muted }}>ordinarie tider</span>}>Veckorytm</SectionTitle>
          {rhythm.map(r => (
            <div key={r.day} style={{ display: 'flex', gap: 14, padding: '12px 0', borderTop: `1px solid ${UI.line}` }}>
              <div style={{ width: 70, flexShrink: 0, fontWeight: 800, fontSize: 14, color: UI.text }}>{r.day}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                {r.items.map(it => (
                  <div key={it.groupId} style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: gm[it.groupId]?.color }} />
                    <span style={{ fontWeight: 700, fontSize: 14, minWidth: 110 }}>{gm[it.groupId]?.name}</span>
                    <span style={{ fontSize: 13.5, color: UI.muted, fontVariantNumeric: 'tabular-nums' }}>{it.time}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, padding: 16 }}>
          <SectionTitle>Grupperna</SectionTitle>
          {data.groups.map(g => (
            <button key={g.id} onClick={() => onPickGroup(g.id)} style={{ width: '100%', minHeight: 48, display: 'flex', alignItems: 'center', gap: 11, padding: '6px 8px', border: 'none', borderRadius: 12, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              <span aria-hidden style={{ width: 12, height: 12, borderRadius: 4, background: g.color, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5, color: UI.text }}>{g.name}</span>
                <span style={{ display: 'block', fontSize: 12, color: UI.muted }}>{groupTimesText(data, g.id) || 'Inga ordinarie tider'}</span>
              </span>
              <span style={{ fontSize: 12.5, color: UI.muted, fontVariantNumeric: 'tabular-nums' }}>{counts[g.id]} pass</span>
              <ChevronRight size={16} color={UI.faint} />
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 18 }}>
        <SectionTitle aside={canEdit && (
          <button className="no-print" onClick={() => onEditEvent('new')} style={{ minHeight: 40, padding: '0 12px', borderRadius: 11, border: `1.5px dashed ${UI.teal}`, background: '#fff', color: UI.tealDark, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Plus size={14} />Lägg till datum
          </button>
        )}>Viktiga datum</SectionTitle>
        {events.length === 0 && <p style={{ margin: 0, fontSize: 14, color: UI.muted }}>Inga datum tillagda än.</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {events.map(e => (
            <EventCard key={e.id} event={e} past={e.endsOn < today} onEdit={canEdit ? () => onEditEvent(e.id) : undefined} />
          ))}
        </div>
      </div>
      <style>{`
        .sch-two { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); align-items: start; }
        @media (min-width: 900px) { .sch-two { grid-template-columns: 1.4fr 1fr; } }
      `}</style>
    </div>
  )
}

function EventCard({ event: e, past, onEdit }: { event: ClubEvent; past?: boolean; onEdit?: () => void }) {
  const { data } = useSchedule()
  const gm = groupMap(data)
  const st = EVENT_STYLE[e.type]
  return (
    <div style={{ display: 'flex', gap: 11, padding: '12px 13px', borderRadius: 14, background: st.bg, opacity: past ? 0.6 : 1 }}>
      <span aria-hidden style={{ width: 4, borderRadius: 4, background: st.dot, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: st.fg }}>{rangeLabel(e.startsOn, e.endsOn)} · {st.label}</div>
        <div style={{ fontWeight: 800, fontSize: 14.5, marginTop: 2, color: UI.text }}>{e.title}</div>
        {e.note && <div style={{ fontSize: 12.5, color: UI.muted, marginTop: 1 }}>{e.note}</div>}
        {e.groupIds.length > 0 && <div style={{ fontSize: 12, color: UI.muted, marginTop: 3 }}>{e.groupIds.map(id => gm[id]?.name).join(', ')}</div>}
      </div>
      {onEdit && (
        <button className="no-print" onClick={onEdit} aria-label={`Ändra ${e.title}`} style={{ width: 36, height: 36, flexShrink: 0, alignSelf: 'flex-start', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.7)', color: UI.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <PencilLine size={15} />
        </button>
      )}
    </div>
  )
}

// ═══════════════════════ Per grupp ═══════════════════════

function GroupSchedule({ groupId, onPickGroup, onOpen, canEdit, onAddExtra }: {
  groupId: string
  onPickGroup: (id: string) => void
  onOpen: (id: string) => void
  canEdit: boolean
  onAddExtra: () => void
}) {
  const { data, restorePass } = useSchedule()
  const g = data.groups.find(x => x.id === groupId) ?? data.groups[0]
  const counts = passCountByGroup(data)
  const today = todayISO()

  const weeks = useMemo(() => {
    const passes = activePasses(data).filter(p => p.groupIds.includes(g.id)).sort(comparePasses)
    const events = data.events.filter(e => e.groupIds.includes(g.id))
    const map = new Map<string, { monday: string; passes: SchedulePass[]; events: ClubEvent[] }>()
    const ensure = (date: string) => {
      const m = mondayOf(date)
      if (!map.has(m)) map.set(m, { monday: m, passes: [], events: [] })
      return map.get(m)!
    }
    passes.forEach(p => ensure(p.date).passes.push(p))
    events.forEach(e => ensure(e.startsOn).events.push(e))
    return Array.from(map.values()).sort((a, b) => (a.monday < b.monday ? -1 : 1))
  }, [data, g.id])

  const thisMonday = mondayOf(today)
  const removed = data.passes.filter(p => p.removed && p.groupIds.includes(g.id)).sort(comparePasses)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Pills label="Grupp" value={g.id} onChange={onPickGroup}
        options={data.groups.map(x => ({ id: x.id, name: x.name, color: x.color, count: counts[x.id] }))} />

      {canEdit && (
        <button className="no-print" onClick={onAddExtra} style={{ alignSelf: 'flex-start', minHeight: 44, padding: '0 14px', borderRadius: 12, border: `1.5px dashed ${UI.teal}`, background: '#fff', color: UI.tealDark, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} />Extrapass för {g.name}
        </button>
      )}

      <div style={{ ...cardStyle, padding: 18, borderTop: `4px solid ${g.color}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', color: UI.text }}>{g.name}</h2>
            <p style={{ margin: '6px 0 0', fontSize: 13.5, color: UI.muted, fontWeight: 500 }}>{groupTimesText(data, g.id)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: g.color, lineHeight: 1, letterSpacing: '-0.03em' }}>{counts[g.id]}</div>
            <div style={{ fontSize: 11.5, color: UI.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>pass i {data.term.name}</div>
          </div>
        </div>
      </div>

      {weeks.map(w => (
        <section key={w.monday} className="week-card">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '4px 0 8px' }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: w.monday === thisMonday ? UI.teal : UI.text }}>Vecka {weekNumber(w.monday)}</span>
            <span style={{ fontSize: 12.5, color: UI.muted }}>{weekRangeLabel(w.monday)}{w.monday === thisMonday ? ' · denna vecka' : ''}</span>
            <span aria-hidden style={{ flex: 1, height: 1, background: UI.line }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {w.events.map(e => {
              const st = EVENT_STYLE[e.type]
              return (
                <div key={e.id} className="sess-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: st.bg, border: `1px dashed ${st.dot}55` }}>
                  <DateBadge date={e.startsOn} color={st.fg} small />
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: st.fg }}>{e.title}</span>
                    <span style={{ fontSize: 12.5, color: UI.muted, marginLeft: 8 }}>{rangeLabel(e.startsOn, e.endsOn)}{e.note ? ` · ${e.note}` : ''}</span>
                  </div>
                </div>
              )
            })}
            {w.passes.map(p => <PassRow key={p.id} pass={p} onOpen={() => onOpen(p.id)} />)}
          </div>
        </section>
      ))}

      {removed.length > 0 && (
        <section className="no-print" style={{ marginTop: 8, paddingTop: 14, borderTop: `1px dashed rgba(0,0,0,0.12)` }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: UI.muted }}>Borttagna pass</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {removed.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.03)' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: UI.muted, textDecoration: 'line-through' }}>
                  {shortDate(p.date)} · {timeText(p)} · {p.place || 'Ingen plats'}
                </span>
                {canEdit && (
                  <button onClick={() => restorePass(p.id)} style={{ minHeight: 38, padding: '0 12px', borderRadius: 10, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#166534', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <RotateCcw size={14} />Återställ
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function PassRow({ pass: p, onOpen }: { pass: SchedulePass; onOpen: () => void }) {
  const { data } = useSchedule()
  const status = passStatus(p)
  const st = STATUS_STYLE[status]
  const shared = p.groupIds.length > 1 ? groupLabel(data, p) : ''
  return (
    <button onClick={onOpen} className="sess-row" style={{
      width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14,
      background: '#fff', border: `1px ${st.dashed ? 'dashed' : 'solid'} ${status === 'unplanned' ? '#CBD5E1' : 'rgba(0,0,0,0.06)'}`,
      opacity: status === 'past' ? 0.7 : 1,
    }}>
      <DateBadge date={p.date} small />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: UI.text, textDecoration: st.strike ? 'line-through' : 'none' }}>{timeText(p)}</span>
          <PlaceTag place={p.place} />
          {status === "cancelled" && <StatusTag status={status} />}
        </div>
        <div style={{ fontSize: 12.5, color: UI.muted }}>
          {p.staffIds.length ? staffNames(data, p.staffIds) : 'Ingen tränare'}{shared ? ` · ${shared}` : ''}
        </div>
      </div>
      <ChevronRight className="no-print" size={18} color={UI.faint} style={{ flexShrink: 0 }} />
    </button>
  )
}

// ═══════════════════════ Kalender ═══════════════════════

function MonthCalendar({ onOpen }: { onOpen: (id: string) => void }) {
  const { data } = useSchedule()
  const today = todayISO()
  const gm = groupMap(data)

  const months = useMemo(() => {
    const out: { y: number; m: number }[] = []
    const s = parseISO(data.term.startsOn)
    const e = parseISO(data.term.endsOn)
    for (let d = new Date(s.getFullYear(), s.getMonth(), 1); d <= e; d.setMonth(d.getMonth() + 1)) {
      out.push({ y: d.getFullYear(), m: d.getMonth() })
    }
    return out
  }, [data.term])

  const initial = Math.max(0, months.findIndex(x => x.y === parseISO(today).getFullYear() && x.m === parseISO(today).getMonth()))
  const [idx, setIdx] = useState(initial)
  const [selected, setSelected] = useState<string | null>(null)
  const { y, m } = months[idx] ?? months[0]

  const first = `${y}-${String(m + 1).padStart(2, '0')}-01`
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const lead = weekdayIndex(first)
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i)),
  ]
  while (cells.length % 7) cells.push(null)

  const passesByDate = useMemo(() => {
    const map = new Map<string, SchedulePass[]>()
    activePasses(data).sort(comparePasses).forEach(p => {
      const list = map.get(p.date) ?? []
      list.push(p)
      map.set(p.date, list)
    })
    return map
  }, [data])

  const selectedPasses = selected ? passesByDate.get(selected) ?? [] : []
  const selectedEvents = selected ? eventsOnDate(data.events, selected) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="no-print" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {months.map((mm, i) => (
          <button key={`${mm.y}-${mm.m}`} onClick={() => { setIdx(i); setSelected(null) }} aria-pressed={i === idx} style={{
            flexShrink: 0, minHeight: 40, padding: '0 14px', borderRadius: 999, fontFamily: 'inherit', cursor: 'pointer',
            border: `1.5px solid ${i === idx ? UI.teal : 'rgba(0,0,0,0.08)'}`, background: i === idx ? UI.teal : '#fff',
            color: i === idx ? '#fff' : UI.text, fontSize: 13.5, fontWeight: 600,
          }}>{MONTHS_FULL[mm.m]}</button>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 12 }}>
        <h2 style={{ margin: '2px 4px 10px', fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>{MONTHS_FULL[m]} {y}</h2>
        <div className="cal-grid">
          {DAY_SHORT.map(d => <div key={d} className="cal-dow">{d}</div>)}
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="cal-cell cal-empty" />
            const passes = passesByDate.get(date) ?? []
            const evs = eventsOnDate(data.events, date)
            const isSel = date === selected
            return (
              <button key={date} onClick={() => setSelected(isSel ? null : date)} aria-pressed={isSel}
                aria-label={`${shortDate(date)}: ${passes.length} pass${evs.length ? `, ${evs.map(e => e.title).join(', ')}` : ''}`}
                className="cal-cell" style={{ outline: isSel ? `2px solid ${UI.teal}` : 'none', outlineOffset: -2 }}>
                <span className="cal-date" style={{ color: date === today ? '#fff' : UI.text, background: date === today ? UI.teal : 'transparent' }}>{parseISO(date).getDate()}</span>
                {evs.map(e => (
                  <span key={e.id} className="cal-ev" style={{ background: EVENT_STYLE[e.type].bg, color: EVENT_STYLE[e.type].fg }}>{e.title}</span>
                ))}
                <span className="cal-items">
                  {passes.slice(0, 4).map(p => {
                    const st = STATUS_STYLE[passStatus(p, today)]
                    return (
                      <span key={p.id} className="cal-item" style={{ textDecoration: st.strike ? 'line-through' : 'none' }}>
                        <span aria-hidden className="cal-dot" style={{ background: gm[p.groupIds[0]]?.color }} />
                        <span className="cal-txt">{p.start} {groupLabel(data, p)}</span>
                      </span>
                    )
                  })}
                  {passes.length > 4 && <span className="cal-more">+{passes.length - 4}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{DAY_LONG[weekdayIndex(selected)]} {shortDate(selected)}</h3>
          {selectedEvents.map(e => <EventCard key={e.id} event={e} />)}
          {selectedPasses.length === 0 && selectedEvents.length === 0 && (
            <div style={{ ...cardStyle, padding: 16, color: UI.muted, fontSize: 14 }}>Inga pass den här dagen.</div>
          )}
          {selectedPasses.map(p => <PassRow key={p.id} pass={p} onOpen={() => onOpen(p.id)} />)}
        </div>
      )}

      <style>{`
        .cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
        .cal-dow { text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: ${UI.muted}; padding: 4px 0 6px; }
        .cal-cell { min-height: 92px; min-width: 0; border: 1px solid rgba(0,0,0,0.05); border-radius: 10px; background: #fff; padding: 4px; display: flex; flex-direction: column; gap: 2px; text-align: left; font-family: inherit; cursor: pointer; overflow: hidden; }
        .cal-empty { background: rgba(0,0,0,0.02); border-color: transparent; cursor: default; }
        .cal-date { align-self: flex-start; font-size: 12px; font-weight: 800; min-width: 20px; height: 20px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; padding: 0 4px; }
        .cal-ev { font-size: 9.5px; font-weight: 700; border-radius: 4px; padding: 1px 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-items { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .cal-item { display: flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 600; color: ${UI.text}; min-width: 0; }
        .cal-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .cal-txt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-more { font-size: 9px; font-weight: 700; color: ${UI.muted}; }
        @media (max-width: 600px) {
          .cal-cell { min-height: 56px; padding: 3px; }
          .cal-ev { font-size: 0; height: 4px; padding: 0; }
          .cal-items { flex-direction: row; flex-wrap: wrap; gap: 2px; }
          .cal-txt, .cal-more { display: none; }
        }
      `}</style>
    </div>
  )
}
