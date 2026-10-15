'use client'

import { useEffect, useMemo, useState } from 'react'
import { Schibsted_Grotesk, Hanken_Grotesk } from 'next/font/google'
import { Waves, Printer, RotateCcw, Pencil, ChevronRight } from 'lucide-react'
import {
  CLUB_NAME, TERM, OVERRIDES_KEY, GROUPS, GROUP_MAP, COACHES, PLACES, RHYTHM,
  TERM_EVENTS, EVENT_STYLES, GROUP_DATES, BASE_SCHEDULE, MONTHS_FULL, DAY_SHORT,
  applyOverrides, placeColors, toDate, isoWeek, weekRange, timeText, dateNum, tint,
  type GroupKey, type Override, type Session,
} from '@/lib/schema/ht2026'

const display = Schibsted_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })
const body = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const C = {
  bg: 'oklch(0.96 0.013 232)',
  text: 'oklch(0.30 0.03 248)',
  muted: 'oklch(0.52 0.02 248)',
  faint: 'oklch(0.55 0.02 248)',
  line: 'oklch(0.94 0.008 240)',
  cardBorder: 'oklch(0.91 0.014 235)',
  pillBorder: 'oklch(0.90 0.012 240)',
  active: 'oklch(0.45 0.10 250)',
  pillText: 'oklch(0.40 0.03 248)',
}

const card: React.CSSProperties = {
  background: '#fff',
  border: `1px solid ${C.cardBorder}`,
  borderRadius: 18,
  boxShadow: '0 10px 30px -26px oklch(0.4 0.06 250)',
}

const h2: React.CSSProperties = { fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }

type Tab = 'oversikt' | 'grupper' | 'tranare'

interface Draft { start: string; end: string; place: string; coaches: string }

export default function SchemaPage() {
  const [tab, setTab] = useState<Tab>('oversikt')
  const [group, setGroup] = useState<GroupKey>('N2')
  const [coach, setCoach] = useState('Maria')
  const [overrides, setOverrides] = useState<Record<string, Override>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({ start: '', end: '', place: '', coaches: '' })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OVERRIDES_KEY)
      if (raw) setOverrides(JSON.parse(raw))
    } catch {}
  }, [])

  const all = useMemo(() => applyOverrides(overrides), [overrides])

  const groupCount = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(GROUPS.map(g => [g.key, 0]))
    all.forEach(s => { if (!s.isEvent) s.groups.forEach(k => { if (k in counts) counts[k]++ }) })
    return counts
  }, [all])

  const coachCount = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(COACHES.map(c => [c.name, 0]))
    all.forEach(s => s.coaches.forEach(n => { if (n in counts) counts[n]++ }))
    return counts
  }, [all])

  function selectTab(t: Tab) { setTab(t); setEditingId(null) }
  function selectGroup(g: GroupKey) { setGroup(g); setEditingId(null) }

  function startEdit(s: Session) {
    setEditingId(s.id)
    setDraft({ start: s.start, end: s.end, place: s.place, coaches: s.coaches.join(', ') })
  }

  function saveEdit() {
    if (!editingId) return
    const next = {
      ...overrides,
      [editingId]: {
        start: draft.start, end: draft.end, place: draft.place,
        coaches: draft.coaches.split(/[,+]/).map(s => s.trim()).filter(Boolean),
      },
    }
    try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next)) } catch {}
    setOverrides(next)
    setEditingId(null)
  }

  function resetEdits() {
    try { localStorage.removeItem(OVERRIDES_KEY) } catch {}
    setOverrides({})
    setEditingId(null)
  }

  const tabs: [Tab, string][] = [['oversikt', 'Översikt'], ['grupper', 'Per grupp'], ['tranare', 'Tränare']]

  return (
    <div className={`${body.className} sch-root`} style={{ background: C.bg, color: C.text, minHeight: '100%' }}>
      <style>{CSS}</style>
      <div className="sch-wrap">

        {/* ── Hero ── */}
        <div className="sch-hero" style={{
          background: 'linear-gradient(135deg, oklch(0.52 0.10 232), oklch(0.42 0.10 256))',
          borderRadius: 22, color: '#fff', position: 'relative', overflow: 'hidden',
          boxShadow: '0 18px 40px -22px oklch(0.42 0.10 256)',
        }}>
          <div aria-hidden style={{ position: 'absolute', right: -60, top: -40, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, oklch(0.70 0.10 220 / 0.35), transparent 70%)' }} />
          <div aria-hidden style={{ position: 'absolute', right: -20, bottom: -120, width: 340, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, oklch(0.60 0.09 250 / 0.30), transparent 70%)' }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 9 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Waves size={18} color="#fff" strokeWidth={2.2} />
                </div>
                <span style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, opacity: 0.85 }}>Simhopp</span>
              </div>
              <h1 className={display.className} style={{ fontWeight: 800, fontSize: 'clamp(28px, 6vw, 38px)', lineHeight: 1.02, margin: 0, letterSpacing: '-0.02em' }}>{CLUB_NAME}</h1>
              <p style={{ margin: '8px 0 0', fontSize: 17, fontWeight: 500, opacity: 0.92 }}>{TERM} · träningsschema</p>
            </div>
            <button className="no-print" onClick={() => window.print()} style={{
              background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.30)', color: '#fff',
              padding: '10px 18px', borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', minHeight: 44,
            }}>
              <Printer size={16} /> Skriv ut
            </button>
          </div>
        </div>

        {/* ── Flikar ── */}
        <div className="no-print" style={{ display: 'flex', gap: 8, margin: '18px 0 6px', flexWrap: 'wrap' }}>
          {tabs.map(([k, label]) => {
            const active = tab === k
            return (
              <button key={k} onClick={() => selectTab(k)} style={{
                border: `1px solid ${active ? C.active : C.pillBorder}`, background: active ? C.active : '#fff',
                color: active ? '#fff' : C.pillText, padding: '11px 20px', borderRadius: 12,
                fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
              }}>{label}</button>
            )
          })}
          <div style={{ flex: 1 }} />
          {Object.keys(overrides).length > 0 && (
            <button onClick={resetEdits} style={{
              border: '1px solid oklch(0.85 0.06 25)', background: 'oklch(0.96 0.03 25)', color: 'oklch(0.50 0.13 25)',
              padding: '11px 16px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <RotateCcw size={14} /> Återställ ändringar
            </button>
          )}
        </div>

        {tab === 'oversikt' && <Oversikt groupCount={groupCount} onPickGroup={k => { setGroup(k); selectTab('grupper') }} />}

        {tab === 'grupper' && (
          <PerGrupp
            all={all} groupKey={group} groupCount={groupCount[group]} onPickGroup={selectGroup}
            editingId={editingId} draft={draft} setDraft={setDraft}
            onEdit={startEdit} onSave={saveEdit} onCancel={() => setEditingId(null)}
          />
        )}

        {tab === 'tranare' && <Tranare all={all} coach={coach} coachCount={coachCount} onPickCoach={setCoach} />}

        <p className="no-print" style={{ textAlign: 'center', fontSize: 12.5, color: 'oklch(0.55 0.015 248)', marginTop: 34 }}>
          Klicka på pennan för att ändra tid, plats eller tränare — ändringar sparas i din webbläsare. Skriv ut för en ren version att dela med föräldrar.
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════ Översikt ═══════════════════════

function Oversikt({ groupCount, onPickGroup }: { groupCount: Record<string, number>; onPickGroup: (k: GroupKey) => void }) {
  return (
    <div className="sheet" style={{ marginTop: 14 }}>
      <div className="sch-grid-overview">
        <div style={{ ...card, padding: '22px 22px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4, gap: 12 }}>
            <h2 className={display.className} style={h2}>Veckorytm</h2>
            <span style={{ fontSize: 13, color: C.faint }}>ordinarie tider</span>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 13.5, color: C.muted }}>
            Så ser en vanlig träningsvecka ut. Helger med tävling är inställda — se viktiga datum.
          </p>
          {RHYTHM.map(r => (
            <div key={r.day} style={{ display: 'flex', gap: 16, padding: '13px 0', borderTop: `1px solid ${C.line}` }}>
              <div style={{ width: 74, flex: 'none', fontWeight: 700, fontSize: 15, color: 'oklch(0.38 0.04 250)', paddingTop: 2 }}>{r.day}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                {r.items.map(([k, time]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: GROUP_MAP[k].color, flex: 'none' }} />
                    <span style={{ fontWeight: 600, fontSize: 14, minWidth: 96, flex: 'none' }}>{GROUP_MAP[k].name}</span>
                    <span style={{ fontSize: 13.5, color: 'oklch(0.50 0.02 248)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{time}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ height: 14 }} />
        </div>

        <div style={{ ...card, padding: 20 }}>
          <h2 className={display.className} style={{ ...h2, fontSize: 18, marginBottom: 13 }}>Grupperna</h2>
          {GROUPS.map(g => (
            <button key={g.key} className="sch-hover" onClick={() => onPickGroup(g.key)} style={{
              width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 11,
              padding: '9px 10px', minHeight: 44, border: 'none', borderRadius: 10, cursor: 'pointer', color: C.text,
            }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: g.color, flex: 'none' }} />
              <span style={{ fontWeight: 600, fontSize: 14.5, flex: 1 }}>{g.name}</span>
              <span style={{ fontSize: 12.5, color: C.faint, fontVariantNumeric: 'tabular-nums' }}>{groupCount[g.key]} pass</span>
              <ChevronRight size={16} color="oklch(0.65 0.02 248)" />
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...card, padding: 22, marginTop: 18 }}>
        <h2 className={display.className} style={{ ...h2, marginBottom: 4 }}>Viktiga datum</h2>
        <p style={{ margin: '0 0 18px', fontSize: 13.5, color: C.muted }}>Tävlingar, läger och inställda helger under terminen.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 11 }}>
          {TERM_EVENTS.map(ev => {
            const st = EVENT_STYLES[ev.type]
            return (
              <div key={ev.when + ev.title} style={{ display: 'flex', gap: 12, padding: '13px 14px', borderRadius: 13, background: st.bg, border: `1px solid ${st.border}` }}>
                <div style={{ width: 5, borderRadius: 4, background: st.dot, flex: 'none' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: st.dot }}>{ev.when}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2, color: C.text }}>{ev.title}</div>
                  {ev.note && <div style={{ fontSize: 13, color: 'oklch(0.50 0.02 248)', marginTop: 1 }}>{ev.note}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════ Per grupp ═══════════════════════

type GroupItem =
  | { kind: 'marker'; key: string; date: string; sortT: string; day: string; title: string; note: string; bg: string; border: string; fg: string }
  | { kind: 'training'; key: string; date: string; sortT: string; session: Session }

function PerGrupp(props: {
  all: Session[]; groupKey: GroupKey; groupCount: number; onPickGroup: (k: GroupKey) => void
  editingId: string | null; draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>
  onEdit: (s: Session) => void; onSave: () => void; onCancel: () => void
}) {
  const { all, groupKey, editingId, draft, setDraft } = props
  const g = GROUP_MAP[groupKey]

  const weeks = useMemo(() => {
    const items: GroupItem[] = []
    all.forEach(s => {
      if (!s.groups.includes(groupKey)) return
      if (s.isEvent) {
        const st = EVENT_STYLES.event
        items.push({ kind: 'marker', key: s.id, date: s.date, sortT: s.start || '00:00', day: s.day, title: s.label, note: s.place, ...st, fg: st.dot })
      } else {
        items.push({ kind: 'training', key: s.id, date: s.date, sortT: s.start || '00:00', session: s })
      }
    })
    BASE_SCHEDULE.markers.forEach(m => {
      if (!g.days.includes(m.day)) return
      const st = EVENT_STYLES.cancelled
      items.push({ kind: 'marker', key: `x-${m.date}`, date: m.date, sortT: '00:00', day: m.day, title: m.title, note: m.note, ...st, fg: st.dot })
    })
    items.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.sortT < b.sortT ? -1 : 1)

    const map = new Map<number, { wk: number; range: string; items: GroupItem[] }>()
    items.forEach(it => {
      const d = toDate(it.date)
      const w = isoWeek(d)
      if (!map.has(w)) map.set(w, { wk: w, range: weekRange(d), items: [] })
      map.get(w)!.items.push(it)
    })
    return Array.from(map.values())
  }, [all, groupKey, g.days])

  const dates = GROUP_DATES[groupKey]

  return (
    <div style={{ marginTop: 14 }}>
      <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {GROUPS.map(x => {
          const active = x.key === groupKey
          return (
            <button key={x.key} onClick={() => props.onPickGroup(x.key)} style={{
              border: `1.5px solid ${active ? x.color : C.pillBorder}`, background: active ? x.color : '#fff',
              color: active ? '#fff' : C.pillText, padding: '9px 16px', borderRadius: 11, fontSize: 14,
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: active ? '#fff' : x.color }} />{x.name}
            </button>
          )
        })}
      </div>

      <div className="sheet sch-sheet" style={{ ...card, boxShadow: '0 12px 36px -28px oklch(0.4 0.06 250)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: `2px solid ${g.color}`, paddingBottom: 16, marginBottom: 4 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ width: 16, height: 16, borderRadius: 5, background: g.color }} />
              <h2 className={display.className} style={{ fontSize: 27, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{g.name}</h2>
            </div>
            <p style={{ margin: '9px 0 0', fontSize: 14.5, color: 'oklch(0.45 0.02 248)', fontWeight: 500 }}>{g.times}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className={display.className} style={{ fontSize: 30, fontWeight: 800, color: g.color, lineHeight: 1 }}>{props.groupCount}</div>
            <div style={{ fontSize: 12.5, color: C.faint, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>pass i höst</div>
          </div>
        </div>

        {dates.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0 6px' }}>
            {dates.map(([label, kind]) => {
              const st = EVENT_STYLES[kind === 'e' ? 'event' : 'comp']
              return <span key={label} style={{ fontSize: 12.5, fontWeight: 600, padding: '5px 11px', borderRadius: 8, background: st.bg, color: st.dot }}>{label}</span>
            })}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 18 }}>
          {weeks.map(wk => (
            <div key={wk.wk} className="week-card">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                <span className={display.className} style={{ fontWeight: 700, fontSize: 14, color: 'oklch(0.45 0.03 248)' }}>Vecka {wk.wk}</span>
                <span style={{ fontSize: 13, color: 'oklch(0.62 0.02 248)' }}>{wk.range}</span>
                <div style={{ flex: 1, height: 1, background: 'oklch(0.93 0.008 240)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {wk.items.map(it => {
                  if (it.kind === 'marker') {
                    return (
                      <div key={it.key} className="sess-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 15px', borderRadius: 12, background: it.bg, border: `1px dashed ${it.border}` }}>
                        <DateBadge day={it.day} date={it.date} color={it.fg} numColor={it.fg} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 700, fontSize: 14.5, color: it.fg }}>{it.title}</span>
                          <span style={{ fontSize: 13, color: 'oklch(0.50 0.02 248)', marginLeft: 8 }}>{it.note}</span>
                        </div>
                      </div>
                    )
                  }
                  const s = it.session
                  if (s.id === editingId) {
                    return (
                      <EditRow key={it.key} session={s} color={g.color} draft={draft} setDraft={setDraft} onSave={props.onSave} onCancel={props.onCancel} />
                    )
                  }
                  return <TrainingRow key={it.key} session={s} onEdit={() => props.onEdit(s)} />
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DateBadge({ day, date, color = C.faint, numColor = 'oklch(0.32 0.03 248)', small = false }: {
  day: string; date: string; color?: string; numColor?: string; small?: boolean
}) {
  return (
    <div style={{ width: small ? 52 : 58, flex: 'none', textAlign: 'center' }}>
      <div style={{ fontSize: small ? 11 : 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{DAY_SHORT[day]}</div>
      <div className={display.className} style={{ fontSize: small ? 16 : 18, fontWeight: 700, color: numColor, lineHeight: 1 }}>{dateNum(date)}</div>
    </div>
  )
}

function TrainingRow({ session: s, onEdit }: { session: Session; onEdit: () => void }) {
  const pc = placeColors(s.place)
  const shared = s.label.includes('+') ? s.label : s.label === 'Alla' ? 'Gemensamt (alla grupper)' : ''
  return (
    <div className="sess-row sch-row" style={{ background: '#fff', border: '1px solid oklch(0.93 0.01 240)' }}>
      <DateBadge day={s.day} date={s.date} />
      <div className="sch-row-time" style={{ fontWeight: 600, fontSize: 14.5, fontVariantNumeric: 'tabular-nums', color: 'oklch(0.34 0.03 248)' }}>{timeText(s)}</div>
      <span style={{ flex: 'none', fontSize: 12.5, fontWeight: 600, padding: '4px 10px', borderRadius: 7, background: pc.bg, color: pc.fg }}>{s.place || '—'}</span>
      <div className="sch-row-coaches">
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'oklch(0.40 0.03 248)' }}>
          {s.coaches.join(', ') || '—'}
          {s.edited && <EditedBadge className="sch-mobile-only" style={{ marginLeft: 8 }} />}
        </div>
        {shared && <div style={{ fontSize: 12, color: 'oklch(0.55 0.02 248)' }}>{shared}</div>}
      </div>
      {s.edited && <EditedBadge className="sch-desktop-only" />}
      <button className="no-print sch-hover sch-row-edit" onClick={onEdit} aria-label="Ändra pass" style={{
        flex: 'none', border: '1px solid oklch(0.90 0.012 240)', background: '#fff', color: 'oklch(0.48 0.03 248)',
        width: 36, height: 36, borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Pencil size={14} />
      </button>
    </div>
  )
}

function EditedBadge({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <span className={className} style={{ fontSize: 11, fontWeight: 700, color: 'oklch(0.55 0.12 250)', background: 'oklch(0.94 0.03 250)', padding: '2px 7px', borderRadius: 6, flex: 'none', ...style }}>ändrad</span>
  )
}

function EditRow({ session: s, color, draft, setDraft, onSave, onCancel }: {
  session: Session; color: string; draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>
  onSave: () => void; onCancel: () => void
}) {
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'oklch(0.50 0.02 248)', display: 'flex', flexDirection: 'column', gap: 3 }
  const input: React.CSSProperties = { border: '1px solid oklch(0.86 0.012 240)', borderRadius: 8, padding: '7px 9px', fontSize: 14, fontFamily: 'inherit', background: '#fff', color: C.text }
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.value
    setDraft(d => ({ ...d, [k]: v }))
  }
  return (
    <div className="sess-row no-print" style={{ padding: '14px 15px', borderRadius: 12, background: 'oklch(0.97 0.015 235)', border: `1.5px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <DateBadge day={s.day} date={s.date} />
        <label style={label}>Start<input type="time" value={draft.start} onChange={set('start')} style={{ ...input, width: 120 }} /></label>
        <label style={label}>Slut<input type="time" value={draft.end} onChange={set('end')} style={{ ...input, width: 120 }} /></label>
        <label style={label}>Plats
          <select value={draft.place} onChange={set('place')} style={input}>
            {PLACES.map(p => <option key={p} value={p}>{p}</option>)}
            <option value="">—</option>
          </select>
        </label>
        <label style={{ ...label, flex: 1, minWidth: 160 }}>Tränare
          <input type="text" value={draft.coaches} onChange={set('coaches')} placeholder="Ville, Leo" style={input} />
        </label>
        <div style={{ display: 'flex', gap: 7 }}>
          <button onClick={onSave} style={{ background: color, border: 'none', color: '#fff', padding: '9px 16px', borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Spara</button>
          <button onClick={onCancel} style={{ background: '#fff', border: '1px solid oklch(0.88 0.012 240)', color: 'oklch(0.45 0.02 248)', padding: '9px 14px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Avbryt</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════ Tränare ═══════════════════════

function Tranare({ all, coach, coachCount, onPickCoach }: {
  all: Session[]; coach: string; coachCount: Record<string, number>; onPickCoach: (c: string) => void
}) {
  const cc = COACHES.find(c => c.name === coach)!
  const maxCount = Math.max(1, ...Object.values(coachCount))

  const { sessions, weeks, byGroup, months } = useMemo(() => {
    const sessions = all
      .filter(s => s.coaches.includes(coach))
      .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.start || '') < (b.start || '') ? -1 : 1)
    const weeks = new Set(sessions.map(s => isoWeek(toDate(s.date)))).size

    const cg: Record<string, number> = Object.fromEntries(GROUPS.map(g => [g.key, 0]))
    sessions.forEach(s => s.groups.forEach(k => { if (k in cg) cg[k]++ }))
    const cgMax = Math.max(1, ...Object.values(cg))
    const byGroup = GROUPS.filter(g => cg[g.key] > 0).map(g => ({ ...g, count: cg[g.key], pct: `${Math.round(cg[g.key] / cgMax * 100)}%` }))

    const monthMap = new Map<number, { month: string; items: Session[] }>()
    sessions.forEach(s => {
      const m = parseInt(s.date.split('-')[1], 10)
      if (!monthMap.has(m)) monthMap.set(m, { month: MONTHS_FULL[m - 1], items: [] })
      monthMap.get(m)!.items.push(s)
    })
    return { sessions, weeks, byGroup, months: Array.from(monthMap.values()) }
  }, [all, coach])

  const smallLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.faint }

  return (
    <div style={{ marginTop: 14 }}>
      <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {COACHES.map(c => {
          const active = c.name === coach
          return (
            <button key={c.name} onClick={() => onPickCoach(c.name)} style={{
              border: `1.5px solid ${active ? c.color : C.pillBorder}`, background: active ? c.color : '#fff',
              color: active ? '#fff' : C.pillText, padding: '9px 16px', borderRadius: 11, fontSize: 14,
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: active ? '#fff' : c.color }} />
              {c.name}<span style={{ opacity: 0.75, fontWeight: 500 }}>· {coachCount[c.name]}</span>
            </button>
          )
        })}
      </div>

      <div className="sheet sch-grid-coach">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span className={display.className} style={{ width: 42, height: 42, borderRadius: 13, background: cc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 19 }}>{cc.name[0]}</span>
              <div>
                <h2 className={display.className} style={{ fontSize: 23, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{cc.name}</h2>
                <div style={{ fontSize: 13, color: C.faint }}>tränare</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <Stat value={sessions.length} label="pass i höst" color={cc.color} />
              <Stat value={weeks} label="aktiva veckor" color="oklch(0.45 0.03 248)" />
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ ...smallLabel, marginBottom: 9 }}>Pass per grupp</div>
              {byGroup.map(g => (
                <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 110, flex: 'none' }}>{g.name}</span>
                  <Bar pct={g.pct} color={g.color} height={8} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'oklch(0.50 0.02 248)', width: 22, textAlign: 'right' }}>{g.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: 22 }}>
            <div style={{ ...smallLabel, marginBottom: 13 }}>Arbetsbörda i laget</div>
            {COACHES.map(c => (
              <button key={c.name} onClick={() => onPickCoach(c.name)} style={{
                width: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 9, padding: '4px 0', minHeight: 28, fontFamily: 'inherit',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, width: 54, flex: 'none', textAlign: 'left', color: c.name === coach ? c.color : C.pillText }}>{c.name}</span>
                <Bar pct={`${Math.round(coachCount[c.name] / maxCount * 100)}%`} color={c.color} height={14} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'oklch(0.42 0.03 248)', width: 24, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{coachCount[c.name]}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...card, padding: 24 }}>
          <h3 className={display.className} style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Alla {cc.name}s pass</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: C.faint }}>Kronologiskt genom terminen.</p>
          {months.map(m => (
            <div key={m.month} className="week-card" style={{ marginBottom: 18 }}>
              <div className={display.className} style={{ fontSize: 14, fontWeight: 700, color: 'oklch(0.42 0.03 248)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 9 }}>{m.month}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {m.items.map(s => {
                  const pc = placeColors(s.place)
                  const primary = GROUP_MAP[s.groups.find(k => GROUP_MAP[k]) ?? s.groups[0]]
                  const others = s.coaches.filter(n => n !== coach)
                  return (
                    <div key={s.id} className="sess-row sch-row" style={{ gap: 12, padding: '9px 13px', borderRadius: 11, background: 'oklch(0.98 0.008 235)', border: `1px solid ${C.line}` }}>
                      <DateBadge day={s.day} date={s.date} small />
                      <div style={{ width: 100, flex: 'none', fontWeight: 600, fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: 'oklch(0.36 0.03 248)' }}>{timeText(s)}</div>
                      <span style={{ flex: 'none', fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: primary ? tint(primary.color) : 'oklch(0.95 0.01 240)', color: primary ? primary.color : 'oklch(0.45 0.03 248)' }}>{s.label}</span>
                      <span style={{ flex: 'none', fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 7, background: pc.bg, color: pc.fg }}>{s.place || '—'}</span>
                      <div className="sch-row-with" style={{ fontSize: 12.5, color: C.faint }}>{others.length ? `med ${others.join(', ')}` : 'ensam'}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ flex: 1, background: 'oklch(0.97 0.012 235)', borderRadius: 12, padding: '13px 14px' }}>
      <div className={display.className} style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 3 }}>{label}</div>
    </div>
  )
}

function Bar({ pct, color, height }: { pct: string; color: string; height: number }) {
  return (
    <div style={{ flex: 1, height, background: 'oklch(0.95 0.01 240)', borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ width: pct, height: '100%', background: color, borderRadius: height / 2 }} />
    </div>
  )
}

const CSS = `
.sch-root button, .sch-root input, .sch-root select { font-family: inherit; }
.sch-wrap { max-width: 1140px; margin: 0 auto; padding: 22px 20px 40px; }
.sch-hero { padding: 30px 32px; }
.sch-sheet { padding: 26px 26px 30px; }
.sch-grid-overview { display: grid; grid-template-columns: 1.45fr 1fr; gap: 18px; align-items: start; }
.sch-grid-coach { display: grid; grid-template-columns: 1fr 1.7fr; gap: 18px; align-items: start; }
.sch-row { display: flex; align-items: center; gap: 14px; padding: 11px 15px; border-radius: 12px; }
.sch-row-time { width: 108px; flex: none; }
.sch-row-coaches { flex: 1; min-width: 0; }
.sch-row-with { flex: 1; min-width: 0; text-align: right; }
.sch-mobile-only { display: none; }
.sch-hover { background: none; transition: background .12s; }
.sch-hover:hover { background: oklch(0.96 0.012 235); }

@media (max-width: 820px) {
  .sch-grid-overview, .sch-grid-coach { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 600px) {
  .sch-wrap { padding: 16px 16px 32px; }
  .sch-hero { padding: 24px 20px; }
  .sch-sheet { padding: 18px 14px 22px; }
  .sch-row { flex-wrap: wrap; gap: 8px 12px; }
  .sch-row-time { width: auto; }
  .sch-row-coaches { flex-basis: 100%; padding-left: 70px; order: 10; margin-top: -6px; }
  .sch-row-edit { margin-left: auto; }
  .sch-desktop-only { display: none; }
  .sch-mobile-only { display: inline; }
  .sch-row-with { flex-basis: 100%; text-align: left; padding-left: 64px; }
}

@media print {
  .app-chrome { display: none !important; }
  .app-shell, .app-main { height: auto !important; overflow: visible !important; padding: 0 !important; }
  .sch-root, body { background: #fff !important; }
  .no-print { display: none !important; }
  .sheet { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: none !important; }
  .week-card, .sess-row { break-inside: avoid; }
  @page { margin: 14mm; }
}
`
