'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, LayoutTemplate, Trophy } from 'lucide-react'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import {
  addDays, cardStyle, DAY_SHORT, daysBetween, EVENT_STYLE, mondayOf, passStatus, STATUS_STYLE,
  todayISO, UI, weekdayIndex, weekNumber, weekRangeLabel,
} from '@/lib/schedule/format'
import { activePasses, comparePasses, nextCompetition } from '@/lib/schedule/select'
import { CATEGORY_BY_ID, hasContent } from '@/lib/schedule/content'
import type { SchedulePass } from '@/lib/schedule/types'
import PassSheet from './PassSheet'
import { Pills } from './ui'
import { ReviewMark, WeekFocusEditor } from './planningUi'
import { ApplyTemplateSheet, CopyWeekSheet } from './WeekTools'

// Planning → Period: the whole term for one group, weeks × training days,
// like the period template but on the real passes.
export default function PeriodView() {
  const { data } = useSchedule()
  const { groupIds } = useViewer()
  const groups = data.groups.filter(g => groupIds.includes(g.id))
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '')
  const g = groups.find(x => x.id === groupId) ?? groups[0]
  const [openPass, setOpenPass] = useState<string | null>(null)
  const [copyFrom, setCopyFrom] = useState<string | null>(null)
  const [applying, setApplying] = useState<string | null>(null) // start monday
  const [message, setMessage] = useState<string | null>(null)
  const today = todayISO()
  const thisMonday = mondayOf(today)
  const currentRow = useRef<HTMLDivElement>(null)

  useEffect(() => { currentRow.current?.scrollIntoView({ block: 'center' }) }, [groupId])

  const { weeks, weekdays } = useMemo(() => {
    if (!g) return { weeks: [], weekdays: [] }
    const passes = activePasses(data).filter(p => p.groupIds.includes(g.id)).sort(comparePasses)
    const wd = Array.from(new Set(passes.map(p => weekdayIndex(p.date)))).sort((a, b) => a - b)
    const out: { monday: string; passes: SchedulePass[] }[] = []
    for (let m = mondayOf(data.term.startsOn); m <= data.term.endsOn; m = addDays(m, 7)) {
      const sunday = addDays(m, 6)
      out.push({ monday: m, passes: passes.filter(p => p.date >= m && p.date <= sunday) })
    }
    return { weeks: out, weekdays: wd }
  }, [data, g])

  if (!g) return <div style={{ ...cardStyle, padding: 24, color: UI.muted }}>Du har inga grupper kopplade än.</div>

  const events = data.events.filter(e => e.groupIds.length === 0 || e.groupIds.includes(g.id))
  const nextComp = nextCompetition(data, today, [g.id])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Pills label="Grupp" value={g.id} onChange={setGroupId} options={groups} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setApplying(thisMonday)} style={tool}><LayoutTemplate size={16} />Lägg in mall</button>
        {nextComp && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 44, padding: '0 14px', borderRadius: 12, background: '#FEF3C7', color: '#92400E', fontSize: 13.5, fontWeight: 700 }}>
            <Trophy size={16} />{nextComp.title} om {Math.ceil(daysBetween(today, nextComp.startsOn) / 7)} v
          </span>
        )}
      </div>
      {message && (
        <div role="status" style={{ ...cardStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
          <span style={{ flex: 1 }}>{message}</span>
          <button onClick={() => setMessage(null)} aria-label="Stäng meddelandet" style={{ border: 'none', background: 'none', color: UI.muted, cursor: 'pointer', fontSize: 13, fontWeight: 700, minHeight: 32 }}>OK</button>
        </div>
      )}

      <div style={{ ...cardStyle, padding: 10, overflowX: 'auto' }}>
        <div role="table" aria-label={`Period ${g.name}`} style={{ display: 'grid', gridTemplateColumns: `minmax(150px, 1.3fr) repeat(${weekdays.length}, minmax(64px, 1fr)) 56px`, gap: 4, minWidth: 150 + weekdays.length * 70 + 60 }}>
          <div role="row" style={{ display: 'contents' }}>
            <div role="columnheader" style={head}>Vecka</div>
            {weekdays.map(wd => <div key={wd} role="columnheader" style={{ ...head, textAlign: 'center' }}>{DAY_SHORT[wd]}</div>)}
            <div role="columnheader" style={{ ...head, textAlign: 'center' }}>Klart</div>
          </div>

          {weeks.map(w => {
            const sunday = addDays(w.monday, 6)
            const wEvents = events.filter(e => e.startsOn <= sunday && e.endsOn >= w.monday)
            const st = w.passes.map(p => passStatus(p, today))
            const plannable = st.filter(s => s === 'unplanned' || s === 'draft' || s === 'planned').length
            const planned = st.filter(s => s === 'planned').length
            const isNow = w.monday === thisMonday
            const isPast = sunday < today
            return (
              <div key={w.monday} role="row" ref={isNow ? currentRow : undefined} style={{ display: 'contents' }}>
                <div role="rowheader" style={{ padding: '8px 8px', borderRadius: 10, background: isNow ? UI.primarySoft : 'rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: 5, opacity: isPast ? 0.75 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 900, color: isNow ? UI.primary : UI.text }}>v.{weekNumber(w.monday)}</span>
                    <span style={{ fontSize: 11.5, color: UI.muted }}>{weekRangeLabel(w.monday)}</span>
                  </div>
                  {wEvents.map(e => (
                    <span key={e.id} style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: EVENT_STYLE[e.type].bg, color: EVENT_STYLE[e.type].fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                  ))}
                  <WeekFocusEditor groupId={g.id} monday={w.monday} compact />
                  {w.passes.some(p => hasContent(p.content)) && (
                    <button onClick={() => setCopyFrom(w.monday)} style={{ alignSelf: 'flex-start', minHeight: 30, padding: '0 8px', borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.05)', color: UI.muted, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Copy size={12} />Kopiera
                    </button>
                  )}
                </div>
                {weekdays.map(wd => {
                  const cell = w.passes.filter(p => weekdayIndex(p.date) === wd)
                  return (
                    <div key={wd} role="cell" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {cell.map(p => <PeriodCell key={p.id} pass={p} onOpen={() => setOpenPass(p.id)} />)}
                    </div>
                  )
                })}
                <div role="cell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 800, color: plannable === 0 ? UI.faint : planned === plannable ? '#15803D' : '#B45309' }}>
                  {plannable === 0 ? '–' : `${planned}/${plannable}`}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 12.5, color: UI.muted, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {(['unplanned', 'draft', 'planned', 'cancelled'] as const).map(s => (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span aria-hidden style={{ width: 12, height: 12, borderRadius: 4, background: STATUS_STYLE[s].bg, border: `1px ${STATUS_STYLE[s].dashed ? 'dashed' : 'solid'} ${STATUS_STYLE[s].border}` }} />
            {STATUS_STYLE[s].label}
          </span>
        ))}
      </p>

      <PassSheet passId={openPass} onClose={() => setOpenPass(null)} />
      {copyFrom && <CopyWeekSheet fromMonday={copyFrom} groupIds={[g.id]} onClose={() => setCopyFrom(null)} onDone={setMessage} />}
      {applying && <ApplyTemplateSheet groupIds={groupIds} defaultGroupId={g.id} defaultMonday={applying} onClose={() => setApplying(null)} onDone={setMessage} />}
    </div>
  )
}

function PeriodCell({ pass, onOpen }: { pass: SchedulePass; onOpen: () => void }) {
  const status = passStatus(pass)
  const st = STATUS_STYLE[status]
  const cats = hasContent(pass.content) ? Array.from(new Set(pass.content!.blocks.map(b => b.category))) : []
  return (
    <button onClick={onOpen} aria-label={`${pass.start} ${pass.place}, ${st.label}`} title={pass.content?.blocks.map(b => b.name).join(' · ') || st.label} style={{
      width: '100%', minHeight: 44, padding: '5px 6px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      background: st.bg, borderStyle: st.dashed ? 'dashed' : 'solid', borderWidth: 1, borderColor: st.border,
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 800, color: UI.text, textDecoration: st.strike ? 'line-through' : 'none' }}>
        {pass.start || '–'}<span style={{ fontWeight: 600, color: UI.muted }}>{pass.place === 'Vatten' ? 'V' : pass.place === 'Land' ? 'L' : pass.place.slice(0, 3)}</span>
        <ReviewMark pass={pass} />
      </span>
      {cats.length > 0 && (
        <span style={{ display: 'flex', gap: 2 }} aria-hidden>
          {cats.map(c => <span key={c} style={{ width: 8, height: 8, borderRadius: 3, background: CATEGORY_BY_ID[c].color }} />)}
        </span>
      )}
    </button>
  )
}

const head: React.CSSProperties = { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: UI.muted, padding: '4px 6px' }
const tool: React.CSSProperties = {
  minHeight: 44, padding: '0 14px', borderRadius: 12, border: '1px solid #E1E8F0', background: '#fff',
  display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: UI.primary, cursor: 'pointer',
}
