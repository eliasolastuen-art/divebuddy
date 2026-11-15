'use client'

import { useMemo, useState } from 'react'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import { cardStyle, MONTHS_FULL, parseISO, passStatus, STATUS_STYLE, timeText, UI, weekNumber } from '@/lib/schedule/format'
import { activePasses, comparePasses, groupLabel, groupMap, passCountByStaff, staffMinutes, staffNames } from '@/lib/schedule/select'
import PassSheet from './PassSheet'
import { Bar, DateBadge, PlaceTag, Pills, SectionTitle } from './ui'

const hours = (min: number) => `${(min / 60).toLocaleString('sv-SE', { maximumFractionDigits: 1 })} h`

export default function StaffView() {
  const { data } = useSchedule()
  const { me } = useViewer()
  const [staffId, setStaffId] = useState(me?.id ?? data.staff[0]?.id ?? '')
  const [openPass, setOpenPass] = useState<string | null>(null)
  const s = data.staff.find(x => x.id === staffId) ?? data.staff[0]
  const counts = passCountByStaff(data)
  const max = Math.max(1, ...Object.values(counts))
  const gm = groupMap(data)

  const { passes, weeks, minutes, byGroup, months } = useMemo(() => {
    const passes = activePasses(data)
      .filter(p => p.staffIds.includes(s.id) && p.cancelledReason === null)
      .sort(comparePasses)
    const weeks = new Set(passes.map(p => weekNumber(p.date))).size

    const gCount: Record<string, number> = {}
    passes.forEach(p => p.groupIds.forEach(g => { gCount[g] = (gCount[g] ?? 0) + 1 }))
    const gMax = Math.max(1, ...Object.values(gCount))
    const byGroup = data.groups.filter(g => gCount[g.id]).map(g => ({ ...g, count: gCount[g.id], pct: gCount[g.id] / gMax }))

    const monthMap = new Map<number, typeof passes>()
    passes.forEach(p => {
      const m = parseISO(p.date).getMonth()
      monthMap.set(m, [...(monthMap.get(m) ?? []), p])
    })
    const months = Array.from(monthMap.entries()).sort((a, b) => a[0] - b[0])
      .map(([m, list]) => ({ name: MONTHS_FULL[m], list, minutes: staffMinutes(list) }))

    return { passes, weeks, minutes: staffMinutes(passes), byGroup, months }
  }, [data, s.id])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Pills label="Tränare" value={s.id} onChange={setStaffId}
        options={data.staff.map(x => ({ id: x.id, name: x.name, color: x.color, count: counts[x.id] }))} />

      <div className="sch-staff">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...cardStyle, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span aria-hidden style={{ width: 44, height: 44, borderRadius: 14, background: s.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 19 }}>{s.name[0]}</span>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em' }}>{s.id === me?.id ? `Mitt schema · ${s.name}` : s.name}</h2>
                <div style={{ fontSize: 12.5, color: UI.muted }}>{s.profileId ? 'Har konto i appen' : 'Inget konto kopplat än'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 16 }}>
              <Stat value={String(passes.length)} label="pass" color={s.color} />
              <Stat value={hours(minutes)} label="planerad tid" color={UI.text} />
              <Stat value={String(weeks)} label="aktiva veckor" color={UI.text} />
            </div>
            {byGroup.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: UI.muted, marginBottom: 8 }}>Pass per grupp</div>
                {byGroup.map(g => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, width: 116, flexShrink: 0 }}>{g.name}</span>
                    <Bar pct={g.pct} color={g.color} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: UI.muted, width: 24, textAlign: 'right' }}>{g.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...cardStyle, padding: 18 }}>
            <SectionTitle>Arbetsbörda i laget</SectionTitle>
            {data.staff.map(x => (
              <button key={x.id} onClick={() => setStaffId(x.id)} style={{ width: '100%', minHeight: 32, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, padding: '3px 0', fontFamily: 'inherit' }}>
                <span style={{ fontSize: 13, fontWeight: x.id === s.id ? 800 : 600, width: 56, textAlign: 'left', color: x.id === s.id ? x.color : UI.text }}>{x.name}</span>
                <Bar pct={counts[x.id] / max} color={x.color} height={12} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: UI.muted, width: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{counts[x.id]}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 18 }}>
          <SectionTitle aside={<span style={{ fontSize: 12.5, color: UI.muted }}>kronologiskt</span>}>Alla {s.name}s pass</SectionTitle>
          {months.map(mo => (
            <div key={mo.name} className="week-card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0 8px' }}>
                <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: UI.text }}>{mo.name}</span>
                <span style={{ fontSize: 12, color: UI.muted }}>{mo.list.length} pass · {hours(mo.minutes)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mo.list.map(p => {
                  const others = p.staffIds.filter(id => id !== s.id)
                  const st = STATUS_STYLE[passStatus(p)]
                  return (
                    <button key={p.id} onClick={() => setOpenPass(p.id)} className="sess-row" style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: '#fff', border: '1px solid #E1E8F0', borderLeft: `4px solid ${gm[p.groupIds[0]]?.color}` }}>
                      <DateBadge date={p.date} small />
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', textDecoration: st.strike ? 'line-through' : 'none' }}>{timeText(p)}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: gm[p.groupIds[0]]?.color }}>{groupLabel(data, p)}</span>
                          <PlaceTag place={p.place} />
                        </div>
                        <div style={{ fontSize: 12, color: UI.muted }}>{others.length ? `med ${staffNames(data, others)}` : 'ensam'}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PassSheet variant="schema" passId={openPass} onClose={() => setOpenPass(null)} />
      <style>{`
        .sch-staff { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr); align-items: start; }
        @media (min-width: 900px) { .sch-staff { grid-template-columns: 1fr 1.5fr; } }
      `}</style>
    </div>
  )
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: '10px 11px' }}>
      <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: UI.muted, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  )
}
