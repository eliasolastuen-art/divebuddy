'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Copy, Repeat, Save } from 'lucide-react'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import {
  addDays, cardStyle, DAY_SHORT, EVENT_STYLE, mondayOf, passStatus, rangeLabel, todayISO, UI,
  weekdayIndex, weekNumber, weekRangeLabel, dateNum,
} from '@/lib/schedule/format'
import { passesBetween, planningSummary } from '@/lib/schedule/select'
import PassSheet from './PassSheet'
import { PassTile, WeekFocusEditor } from './planningUi'
import { RepeatWeekSheet, SaveTemplateSheet } from './WeekTools'

const toolButton: React.CSSProperties = {
  minHeight: 44, padding: '0 14px', borderRadius: 12, border: '1px solid #E1E8F0', background: '#fff',
  display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
  color: UI.primary, cursor: 'pointer',
}

// Planning → Vecka: my groups × the days they train, what each pass contains
export default function WeekView({ initialWeek, initialPass }: { initialWeek?: string | null; initialPass?: string | null }) {
  const { data, copyPreviousWeek } = useSchedule()
  const { groupIds: myGroupIds } = useViewer()
  const [selected, setSelected] = useState<string[]>([]) // [] = alla mina grupper
  const activeSelection = selected.filter(id => myGroupIds.includes(id))
  const groupIds = activeSelection.length ? activeSelection : myGroupIds
  const toggleGroup = (id: string) =>
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s.filter(x => myGroupIds.includes(x)), id]))
  const today = todayISO()
  const thisMonday = mondayOf(today)
  const [monday, setMonday] = useState(() =>
    initialWeek && /^\d{4}-\d{2}-\d{2}$/.test(initialWeek) ? mondayOf(initialWeek) : thisMonday)
  const [openPass, setOpenPass] = useState<string | null>(initialPass ?? null)
  const [tool, setTool] = useState<'repeat' | 'template' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const sunday = addDays(monday, 6)
  const groups = data.groups.filter(g => groupIds.includes(g.id))
  const passes = passesBetween(data, monday, sunday).filter(p => p.groupIds.some(g => groupIds.includes(g)))
  const summary = planningSummary(data, monday, today, groupIds)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter(d => passes.some(p => p.date === d))

  const weekEvents = data.events
    .filter(e => e.startsOn <= sunday && e.endsOn >= monday)
    .filter(e => e.groupIds.length === 0 || e.groupIds.some(g => groupIds.includes(g)))

  const relative = monday === thisMonday ? 'Denna vecka'
    : monday === addDays(thisMonday, 7) ? 'Nästa vecka'
    : monday === addDays(thisMonday, -7) ? 'Förra veckan' : null

  const copyWeek = () => {
    const n = copyPreviousWeek(monday, groupIds)
    setMessage(n ? `${n} pass fylldes med innehåll från tidigare veckor (som utkast).`
      : 'Hittade inga tidigare planerade pass att kopiera. Planera ett pass först, så kan det återanvändas.')
  }

  const groupProgress = (gid: string) => {
    const gp = passes.filter(p => p.groupIds.includes(gid))
    const s = gp.map(p => passStatus(p, today))
    const plannable = s.filter(x => x === 'unplanned' || x === 'draft' || x === 'planned').length
    return { planned: s.filter(x => x === 'planned').length, plannable }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Veckonavigering */}
      <div style={{ ...cardStyle, padding: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <NavButton label="Föregående vecka" onClick={() => setMonday(addDays(monday, -7))}><ChevronLeft size={20} /></NavButton>
        <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: UI.text }}>Vecka {weekNumber(monday)}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: relative ? UI.primary : UI.muted }}>{relative ? `${relative} · ` : ''}{weekRangeLabel(monday)}</div>
        </div>
        {monday !== thisMonday && (
          <button onClick={() => setMonday(thisMonday)} style={{ minHeight: 44, padding: '0 12px', borderRadius: 12, border: '1px solid #E1E8F0', background: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: UI.text, cursor: 'pointer' }}>Idag</button>
        )}
        <NavButton label="Nästa vecka" onClick={() => setMonday(addDays(monday, 7))}><ChevronRight size={20} /></NavButton>
      </div>

      {/* Gruppfilter: Alla först, sedan en eller flera grupper */}
      {myGroupIds.length > 1 && (
        <div role="group" aria-label="Visa grupper" className="no-print" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          <GroupChip label="Alla" color={UI.primary} on={activeSelection.length === 0} onClick={() => setSelected([])} />
          {data.groups.filter(g => myGroupIds.includes(g.id)).map(g => (
            <GroupChip key={g.id} label={g.name} color={g.color} on={activeSelection.includes(g.id)} onClick={() => toggleGroup(g.id)} />
          ))}
        </div>
      )}

      {/* Läge för veckan */}
      {summary.plannable > 0 && (
        <div style={{ ...cardStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, background: summary.open ? '#FFFBEB' : '#F0FDF4', border: `1px solid ${summary.open ? '#FDE68A' : '#BBF7D0'}` }}>
          {summary.open ? <AlertCircle size={22} color="#B45309" style={{ flexShrink: 0 }} /> : <CheckCircle2 size={22} color="#15803D" style={{ flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: summary.open ? '#78350F' : '#14532D' }}>
              {summary.open ? `${summary.open} av ${summary.plannable} pass att planera` : `Alla ${summary.plannable} pass är planerade`}
            </div>
            {summary.open > 0 && (
              <div style={{ fontSize: 12.5, color: '#92400E', marginTop: 2 }}>
                {summary.counts.unplanned} oplanerade · {summary.counts.draft} utkast · {summary.counts.planned} {summary.counts.planned === 1 ? 'klart' : 'klara'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verktyg */}
      <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={copyWeek} style={toolButton}><Copy size={16} />Kopiera förra veckan</button>
        <button onClick={() => setTool('repeat')} style={toolButton}><Repeat size={16} />Kör igen om …</button>
        <button onClick={() => setTool('template')} style={toolButton}><Save size={16} />Spara som mall</button>
      </div>
      {message && (
        <div role="status" style={{ ...cardStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: UI.text }}>
          <span style={{ flex: 1 }}>{message}</span>
          <button onClick={() => setMessage(null)} aria-label="Stäng meddelandet" style={{ border: 'none', background: 'none', color: UI.muted, cursor: 'pointer', fontSize: 13, fontWeight: 700, minHeight: 32 }}>OK</button>
        </div>
      )}

      {/* Händelser */}
      {weekEvents.map(e => {
        const st = EVENT_STYLE[e.type]
        return (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, background: st.bg }}>
            <span aria-hidden style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: st.dot }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: st.fg }}>{st.label} · {rangeLabel(e.startsOn, e.endsOn)}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: UI.text }}>{e.title}{e.note && <span style={{ fontWeight: 500, color: UI.muted }}> · {e.note}</span>}</div>
            </div>
          </div>
        )
      })}

      {groups.length === 0 || days.length === 0 ? (
        <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: UI.muted, fontSize: 14 }}>Inga pass för dina grupper den här veckan.</div>
      ) : (
        <>
          {/* Desktop: grupper × dagar */}
          <div className="wk-grid" role="table" aria-label={`Vecka ${weekNumber(monday)}`} style={{ ...cardStyle, padding: 12, gridTemplateColumns: `180px repeat(${days.length}, minmax(0, 1fr))` }}>
            <div role="row" style={{ display: 'contents' }}>
              <div role="columnheader" />
              {days.map(d => (
                <div key={d} role="columnheader" style={{ padding: '2px 4px 6px', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: d === today ? UI.primary : UI.muted }}>
                  {DAY_SHORT[weekdayIndex(d)]} {dateNum(d)}{d === today ? ' · idag' : ''}
                </div>
              ))}
            </div>
            {groups.map(g => {
              const prog = groupProgress(g.id)
              return (
                <div key={g.id} role="row" style={{ display: 'contents' }}>
                  <div role="rowheader" style={{ padding: '10px 8px 10px 10px', borderTop: `1px solid ${UI.line}`, borderLeft: `4px solid ${g.color}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 800, color: UI.text }}>{g.name}</span>
                    {prog.plannable > 0 && <span style={{ fontSize: 12, color: UI.muted }}>{prog.planned}/{prog.plannable} planerade</span>}
                    <WeekFocusEditor groupId={g.id} monday={monday} compact />
                  </div>
                  {days.map(d => {
                    const cell = passes.filter(p => p.date === d && p.groupIds.includes(g.id))
                    return (
                      <div key={d} role="cell" style={{ padding: 6, borderTop: `1px solid ${UI.line}`, display: 'flex', flexDirection: 'column', gap: 6, background: d === today ? 'rgba(43,92,158,0.03)' : 'transparent' }}>
                        {cell.map(p => <PassTile key={p.id} pass={p} onOpen={() => setOpenPass(p.id)} />)}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Mobil: en sektion per grupp */}
          <div className="wk-list">
            {groups.map(g => {
              const gp = passes.filter(p => p.groupIds.includes(g.id))
              if (!gp.length) return null
              const prog = groupProgress(g.id)
              return (
                <section key={g.id} style={{ ...cardStyle, padding: 12, borderTop: `4px solid ${g.color}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: UI.text }}>{g.name}</h3>
                    {prog.plannable > 0 && <span style={{ fontSize: 12.5, color: UI.muted }}>{prog.planned}/{prog.plannable} planerade</span>}
                  </div>
                  <WeekFocusEditor groupId={g.id} monday={monday} />
                  {gp.map(p => <PassTile key={p.id} pass={p} showDate onOpen={() => setOpenPass(p.id)} />)}
                </section>
              )
            })}
          </div>
        </>
      )}

      <PassSheet passId={openPass} onClose={() => setOpenPass(null)} />
      {tool === 'repeat' && <RepeatWeekSheet monday={monday} groupIds={groupIds} onClose={() => setTool(null)} onDone={setMessage} />}
      {tool === 'template' && <SaveTemplateSheet monday={monday} groupIds={groupIds} onClose={() => setTool(null)} onDone={setMessage} />}

      <style>{`
        .wk-grid { display: none; }
        .wk-list { display: flex; flex-direction: column; gap: 12px; }
        @media (min-width: 900px) {
          .wk-grid { display: grid; }
          .wk-list { display: none; }
        }
      `}</style>
    </div>
  )
}

function GroupChip({ label, color, on, onClick }: { label: string; color: string; on: boolean; onClick: () => void }) {
  return (
    <button aria-pressed={on} onClick={onClick} style={{
      flexShrink: 0, minHeight: 36, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
      border: `1.5px solid ${on ? color : 'rgba(0,0,0,0.1)'}`, background: on ? color : '#fff', color: on ? '#fff' : UI.text,
    }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: on ? '#fff' : color }} />{label}
    </button>
  )
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, border: '1px solid #E1E8F0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: UI.text }}>
      {children}
    </button>
  )
}
