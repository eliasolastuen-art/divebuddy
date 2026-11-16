'use client'

import { useMemo, useState } from 'react'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import { addDays, MONTHS_FULL, mondayOf, PLACES, todayISO } from '@/lib/schedule/format'
import { attendanceCsv, byWeek, myRows, teamReport } from '@/lib/schedule/attendance'
import { Segmented } from '@/components/library/GroupTiles'
import BottomSheet, { fieldLabel, pill, textInput } from '@/components/planning/BottomSheet'
import { C, Empty, ListCard, primaryButton } from '@/components/schedule/ui'

type Tab = 'mina' | 'laget'

// Design screen 5 "Närvaro": my passes this month with a check each, and
// (admin) completed passes per coach for the term with an Excel export.
export default function AttendancePage() {
  const { data, loading, setAttendance } = useSchedule()
  const { me, isAdmin } = useViewer()
  const [tab, setTab] = useState<Tab>('mina')
  const [adding, setAdding] = useState(false)

  const today = todayISO()
  const monthPrefix = today.slice(0, 7)
  const lastShown = addDays(mondayOf(today), 6)
  const rows = useMemo(() => (me ? myRows(data, me.id) : []), [data, me])
  const month = rows.filter(r => r.date.startsWith(monthPrefix) && r.date <= lastShown)
  const done = month.filter(r => r.present)
  const hours = (Math.round(done.reduce((s, r) => s + r.minutes, 0) / 6) / 10).toString().replace('.', ',')
  const monthName = MONTHS_FULL[Number(monthPrefix.slice(5, 7)) - 1].toLowerCase()

  const report = useMemo(() => (isAdmin ? teamReport(data) : []), [data, isAdmin])
  const max = Math.max(1, ...report.map(r => r.n))

  const exportCsv = () => {
    const blob = new Blob([attendanceCsv(data)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `narvaro-${data.term.name || 'termin'}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 20, color: C.text }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>Närvaro</h1>
      {isAdmin && <Segmented label="Vems närvaro" value={tab} onChange={setTab} options={[['mina', 'Mina pass'], ['laget', 'Hela laget']]} />}

      {tab === 'mina' && (
        !me ? (
          <ListCard><Empty>{loading ? 'Hämtar …' : 'Ditt konto är inte kopplat till en tränare i schemat än. Be en admin koppla det.'}</Empty></ListCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ borderRadius: 18, background: '#fff', border: `1px solid ${C.line}`, padding: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', color: C.primary }}>{done.length}</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>pass i {monthName} · {hours} timmar</span>
            </div>

            {month.length === 0 && !loading && <ListCard><Empty>Inga pass för dig i {monthName} än.</Empty></ListCard>}
            {byWeek(month).map(w => (
              <section key={w.monday} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{w.label}</h2>
                <div style={{ borderRadius: 18, background: '#fff', border: `1px solid ${C.line}`, padding: '0 12px 0 16px' }}>
                  {w.rows.map((r, i) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < w.rows.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                      <span style={{ width: 52, flex: 'none', fontSize: 14, fontWeight: 700, color: C.muted }}>{r.day}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{r.group}</div>
                        <div style={{ fontSize: 13.5, color: C.muted, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{r.time}</div>
                      </div>
                      <button type="button" aria-pressed={r.present}
                        aria-label={`${r.group} ${r.day}: ${r.present ? 'närvarande' : 'markera närvarande'}`}
                        onClick={() => setAttendance(r.partIds, me.id, r.present ? null : 'narvarande')}
                        style={{
                          width: 44, height: 44, flex: 'none', borderRadius: 12, fontSize: 20, fontWeight: 800, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', color: '#fff',
                          background: r.present ? C.primary : '#fff', border: `2px solid ${r.present ? C.primary : '#B9C6D8'}`,
                        }}>✓</button>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <button type="button" onClick={() => setAdding(true)} style={{ minHeight: 50, borderRadius: 14, border: `1.5px solid ${C.primary}`, background: '#fff', color: C.primary, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              Lägg till ett pass
            </button>
          </div>
        )
      )}

      {tab === 'laget' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 14, color: C.muted, fontWeight: 500 }}>Genomförda pass per tränare, {data.term.name.startsWith('HT') ? 'hösten' : 'våren'} {data.term.name.slice(2)}.</p>
          <ListCard>
            {report.map((r, i) => (
              <div key={r.staff.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < report.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                <span style={{ width: 56, fontSize: 15, fontWeight: 700 }}>{r.staff.name}</span>
                <div style={{ flex: 1, height: 10, borderRadius: 6, background: C.bg, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round((r.n / max) * 100)}%`, background: C.primary, borderRadius: 6 }} />
                </div>
                <span style={{ width: 28, textAlign: 'right', fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{r.n}</span>
              </div>
            ))}
          </ListCard>
          <button type="button" onClick={exportCsv} style={{ ...primaryButton, minHeight: 50, fontSize: 15 }}>Exportera till Excel</button>
        </div>
      )}

      {adding && me && <AddPassSheet staffId={me.id} onClose={() => setAdding(false)} />}
    </div>
  )
}

// An extra pass I held (not in the schedule), saved as present
function AddPassSheet({ staffId, onClose }: { staffId: string; onClose: () => void }) {
  const { data, addExtraPass } = useSchedule()
  const [date, setDate] = useState(todayISO())
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [place, setPlace] = useState(PLACES[0])
  const [groupIds, setGroupIds] = useState<string[]>([])
  const ok = !!date && !!start && !!end && end > start && groupIds.length > 0

  const save = () => {
    if (!ok) return
    addExtraPass({ date, start, end, place, groupIds, staffIds: [staffId] }, staffId)
    onClose()
  }
  const toggle = (id: string) => setGroupIds(g => (g.includes(id) ? g.filter(x => x !== id) : [...g, id]))

  return (
    <BottomSheet title="Lägg till ett pass" onClose={onClose}
      footer={<button type="button" disabled={!ok} onClick={save} style={{ ...primaryButton, opacity: ok ? 1 : 0.5 }}>Spara passet</button>}>
      <label style={fieldLabel}>Datum<input type="date" value={date} onChange={e => setDate(e.target.value)} style={textInput} /></label>
      <div style={{ display: 'flex', gap: 10 }}>
        <label style={{ ...fieldLabel, flex: 1 }}>Start<input type="time" value={start} onChange={e => setStart(e.target.value)} style={textInput} /></label>
        <label style={{ ...fieldLabel, flex: 1 }}>Slut<input type="time" value={end} onChange={e => setEnd(e.target.value)} style={textInput} /></label>
      </div>
      <div style={fieldLabel}>
        Grupp
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {data.groups.map(g => <button key={g.id} type="button" aria-pressed={groupIds.includes(g.id)} onClick={() => toggle(g.id)} style={pill(groupIds.includes(g.id))}>{g.name}</button>)}
        </div>
      </div>
      <div style={fieldLabel}>
        Plats
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PLACES.map(p => <button key={p} type="button" aria-pressed={place === p} onClick={() => setPlace(p)} style={pill(place === p)}>{p}</button>)}
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 13.5, color: C.muted }}>Passet sparas som extrapass med dig som närvarande.</p>
    </BottomSheet>
  )
}
