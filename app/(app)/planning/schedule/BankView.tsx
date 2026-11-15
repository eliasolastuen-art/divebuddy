'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, CalendarRange, Archive, LayoutTemplate, Repeat, Search, Trash2 } from 'lucide-react'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import { cardStyle, mondayOf, shortDate, timeText, todayISO, UI, dayShort } from '@/lib/schedule/format'
import { comparePasses, groupLabel, groupMap } from '@/lib/schedule/select'
import { CATEGORY_BY_ID, cloneContent, hasContent } from '@/lib/schedule/content'
import { fetchTemplates, type TemplateOption } from '@/lib/schedule/library'
import type { PassContent } from '@/lib/schedule/types'
import PlanningListView from '../PlanningListView'
import PeriodBuilder from '../PeriodBuilder'
import Sheet, { Button, inputStyle } from './Sheet'
import { Pills, SectionTitle } from './ui'
import { ReviewMark } from './planningUi'
import { ApplyTemplateSheet } from './WeekTools'

// Planning → Bank: inspiration and reuse — saved weeks, passes we've run, club templates
export default function BankView() {
  const { data, deleteTemplate } = useSchedule()
  const { groupIds } = useViewer()
  const today = todayISO()
  const gm = groupMap(data)
  const [group, setGroup] = useState('all')
  const [onlyRepeat, setOnlyRepeat] = useState(false)
  const [q, setQ] = useState('')
  const [using, setUsing] = useState<{ content: PassContent; groupIds: string[]; label: string } | null>(null)
  const [applying, setApplying] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [clubTemplates, setClubTemplates] = useState<TemplateOption[] | null>(null)
  const [showPeriods, setShowPeriods] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  useEffect(() => {
    let alive = true
    fetchTemplates().then(t => { if (alive) setClubTemplates(t) })
    return () => { alive = false }
  }, [])

  const ran = useMemo(() => {
    const s = q.trim().toLowerCase()
    return data.passes
      .filter(p => !p.removed && p.cancelledReason === null && p.date < today && hasContent(p.content))
      .filter(p => p.groupIds.some(g => groupIds.includes(g)))
      .filter(p => group === 'all' || p.groupIds.includes(group))
      .filter(p => !onlyRepeat || p.review?.repeat)
      .filter(p => !s || p.content!.blocks.some(b => b.name.toLowerCase().includes(s) || b.items.some(i => i.name.toLowerCase().includes(s))) || p.content!.notes.toLowerCase().includes(s))
      .sort(comparePasses).reverse()
  }, [data, today, groupIds, group, onlyRepeat, q])

  const myGroups = data.groups.filter(g => groupIds.includes(g.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {message && (
        <div role="status" style={{ ...cardStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
          <span style={{ flex: 1 }}>{message}</span>
          <button onClick={() => setMessage(null)} aria-label="Stäng meddelandet" style={{ border: 'none', background: 'none', color: UI.muted, cursor: 'pointer', fontSize: 13, fontWeight: 700, minHeight: 32 }}>OK</button>
        </div>
      )}

      {/* Sparade veckor */}
      <section style={{ ...cardStyle, padding: 16 }}>
        <SectionTitle aside={<button onClick={() => setApplying('')} style={smallButton}><LayoutTemplate size={14} />Lägg in mall</button>}>Sparade veckor</SectionTitle>
        {data.templates.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13.5, color: UI.muted }}>När en vecka blev bra: tryck <strong>Spara som mall</strong> under Vecka, så hamnar den här och kan läggas på vilken vecka som helst.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {data.templates.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.03)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800 }}>{t.name}</div>
                  <div style={{ fontSize: 12.5, color: UI.muted }}>{t.entries.length} pass · {t.entries.map(e => ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'][e.dayOfWeek]).join(', ')}</div>
                </div>
                <button onClick={() => setApplying(t.id)} style={smallButton}>Lägg in</button>
                <button onClick={() => deleteTemplate(t.id)} aria-label={`Ta bort ${t.name}`} style={{ ...smallButton, color: '#B91C1C' }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pass vi kört */}
      <section style={{ ...cardStyle, padding: 16, display: 'grid', gap: 10 }}>
        <SectionTitle aside={<span style={{ fontSize: 12.5, color: UI.muted }}>{ran.length} pass</span>}>Pass vi kört</SectionTitle>
        <Pills label="Grupp" value={group} onChange={setGroup} options={[{ id: 'all', name: 'Mina grupper', color: UI.primary }, ...myGroups]} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={16} color={UI.faint} style={{ position: 'absolute', left: 12, top: 14 }} aria-hidden />
            <input type="search" aria-label="Sök övning eller block" value={q} onChange={e => setQ(e.target.value)} placeholder="Sök övning eller block" style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>
          <button aria-pressed={onlyRepeat} onClick={() => setOnlyRepeat(v => !v)} style={{ ...smallButton, minHeight: 44, background: onlyRepeat ? UI.primarySoft : '#fff' }}>
            <Repeat size={14} />Markerade &quot;kör igen&quot;
          </button>
        </div>
        {ran.length === 0 && (
          <p style={{ margin: 0, fontSize: 13.5, color: UI.muted }}>
            Inga genomförda planerade pass än. Pass som har planerats och passerat dyker upp här, med kommentaren från &quot;Så gick det&quot;.
          </p>
        )}
        {ran.slice(0, 30).map(p => (
          <div key={p.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #E1E8F0', borderLeft: `4px solid ${gm[p.groupIds[0]]?.color}` }}>
            <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: UI.muted }}>
                <strong style={{ color: UI.text }}>{dayShort(p.date)} {shortDate(p.date)}</strong>{timeText(p)} · {groupLabel(data, p)} · {p.place}<ReviewMark pass={p} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{p.content!.blocks.map(b => b.name).join(' · ') || 'Anteckningar'}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Array.from(new Set(p.content!.blocks.map(b => b.category))).map(c => (
                  <span key={c} style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: `${CATEGORY_BY_ID[c].color}18`, color: CATEGORY_BY_ID[c].color }}>{CATEGORY_BY_ID[c].label}</span>
                ))}
              </div>
              {p.review?.note && <div style={{ fontSize: 12.5, color: UI.text, fontStyle: 'italic' }}>”{p.review.note}”</div>}
            </div>
            <button onClick={() => setUsing({ content: p.content!, groupIds: p.groupIds, label: `${shortDate(p.date)} ${groupLabel(data, p)}` })} style={{ ...smallButton, alignSelf: 'center' }}>Använd</button>
          </div>
        ))}
      </section>

      {/* Klubbens träningsmallar */}
      <section style={{ ...cardStyle, padding: 16, display: 'grid', gap: 8 }}>
        <SectionTitle>Klubbens träningsmallar</SectionTitle>
        {clubTemplates === null && <p style={{ margin: 0, fontSize: 13.5, color: UI.muted }}>Hämtar…</p>}
        {clubTemplates?.length === 0 && <p style={{ margin: 0, fontSize: 13.5, color: UI.muted }}>Inga sparade träningsmallar än.</p>}
        {clubTemplates?.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.03)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>{t.name}</div>
              <div style={{ fontSize: 12.5, color: UI.muted }}>{t.content.blocks.map(b => b.name).join(' · ')}</div>
            </div>
            <button onClick={() => setUsing({ content: t.content, groupIds: myGroups.map(g => g.id), label: t.name })} style={smallButton}>Använd</button>
          </div>
        ))}
      </section>

      {/* Fler källor */}
      <section style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        <button onClick={() => setShowPeriods(true)} style={linkCard}><CalendarRange size={20} />Periodmallar<span style={linkSub}>Bygg flerveckorsmallar (veckor × dagar)</span></button>
        <Link href="/library" style={linkCard}><BookOpen size={20} />Biblioteket<span style={linkSub}>Övningar, block och hopp</span></Link>
        <button onClick={() => setShowArchive(v => !v)} style={linkCard}><Archive size={20} />{showArchive ? 'Dölj arkivet' : 'Arkiv: alla pass'}<span style={linkSub}>Den tidigare passlistan</span></button>
      </section>
      {showArchive && <div style={{ margin: '0 -16px' }}><PlanningListView /></div>}

      {showPeriods && <PeriodBuilder onClose={() => setShowPeriods(false)} />}
      {applying !== null && (
        <ApplyTemplateSheet groupIds={groupIds} defaultMonday={mondayOf(today)} defaultTemplateId={applying || undefined}
          onClose={() => setApplying(null)} onDone={setMessage} />
      )}
      {using && <UseOnPassSheet source={using} onClose={() => setUsing(null)} onDone={setMessage} />}
    </div>
  )
}

// Pick an upcoming, unplanned pass to put this content on
function UseOnPassSheet({ source, onClose, onDone }: {
  source: { content: PassContent; groupIds: string[]; label: string }
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const { data, saveContent } = useSchedule()
  const { groupIds } = useViewer()
  const today = todayISO()
  const targets = data.passes
    .filter(p => !p.removed && p.cancelledReason === null && p.date >= today && !hasContent(p.content))
    .filter(p => p.groupIds.some(g => groupIds.includes(g)))
    .sort((a, b) => {
      const aMatch = Number(a.groupIds.some(g => source.groupIds.includes(g)))
      const bMatch = Number(b.groupIds.some(g => source.groupIds.includes(g)))
      return bMatch - aMatch || comparePasses(a, b)
    })
    .slice(0, 12)

  return (
    <Sheet title="Använd på pass" subtitle={source.label} onClose={onClose} zIndex={110}>
      <div style={{ display: 'grid', gap: 8 }}>
        {targets.length === 0 && <p style={{ margin: 0, color: UI.muted }}>Inga kommande oplanerade pass.</p>}
        {targets.map(p => (
          <button key={p.id} onClick={() => {
            saveContent(p.id, cloneContent(source.content, `Från ${source.label}`), 'draft')
            onDone(`Innehållet lades på ${dayShort(p.date)} ${shortDate(p.date)} ${groupLabel(data, p)} (som utkast).`)
            onClose()
          }} style={{ width: '100%', textAlign: 'left', minHeight: 52, padding: '10px 14px', borderRadius: 14, border: '1px solid #E1E8F0', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800 }}>{dayShort(p.date)} {shortDate(p.date)} · {timeText(p)}</span>
            <span style={{ display: 'block', fontSize: 12.5, color: UI.muted }}>{groupLabel(data, p)} · {p.place}</span>
          </button>
        ))}
        <Button variant="ghost" onClick={onClose}>Avbryt</Button>
      </div>
    </Sheet>
  )
}

const smallButton: React.CSSProperties = {
  minHeight: 38, padding: '0 12px', borderRadius: 10, border: '1px solid #E1E8F0', background: '#fff',
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: UI.primary, cursor: 'pointer', flexShrink: 0,
}
const linkCard: React.CSSProperties = {
  ...cardStyle, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, textAlign: 'left',
  fontFamily: 'inherit', fontSize: 15, fontWeight: 800, color: UI.primary, textDecoration: 'none', cursor: 'pointer',
}
const linkSub: React.CSSProperties = { fontSize: 12.5, fontWeight: 500, color: UI.muted }
