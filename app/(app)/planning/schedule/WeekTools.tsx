'use client'

import { useEffect, useState } from 'react'
import { useSchedule } from '@/lib/schedule/store'
import { addDays, mondayOf, UI, weekNumber, weekRangeLabel } from '@/lib/schedule/format'
import { fetchPeriodTemplates } from '@/lib/schedule/library'
import type { PlanTemplate } from '@/lib/schedule/types'
import Sheet, { Button, Chips, Field, FieldLabel, inputStyle, toggleIn } from './Sheet'

// "Den här veckan var bra – kör den igen om N veckor"
export function RepeatWeekSheet({ monday, groupIds, onClose, onDone }: {
  monday: string
  groupIds: string[]
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const { data, repeatWeek } = useSchedule()
  const [weeks, setWeeks] = useState(3)
  const [groups, setGroups] = useState(groupIds)
  const target = addDays(monday, weeks * 7)
  const options = data.groups.filter(g => groupIds.includes(g.id))

  const run = () => {
    const n = repeatWeek(monday, weeks, groups)
    onDone(n
      ? `${n} pass i vecka ${weekNumber(target)} fick innehållet från vecka ${weekNumber(monday)} (som utkast).`
      : `Inget kopierades. Antingen är vecka ${weekNumber(monday)} inte planerad än, eller så är passen i vecka ${weekNumber(target)} redan planerade.`)
    onClose()
  }

  return (
    <Sheet title="Kör veckan igen" subtitle={`Vecka ${weekNumber(monday)} · ${weekRangeLabel(monday)}`} onClose={onClose} zIndex={110}
      footer={<><Button grow onClick={onClose}>Avbryt</Button><Button grow variant="primary" onClick={run} disabled={!groups.length}>Kopiera</Button></>}>
      <div style={{ display: 'grid', gap: 16 }}>
        <p style={{ margin: 0, fontSize: 14, color: UI.muted, lineHeight: 1.5 }}>
          Veckans planerade pass kopieras till samma dag, tid och plats längre fram. Pass som redan är planerade där lämnas orörda.
        </p>
        <Field label="Om hur många veckor?">
          <select value={weeks} onChange={e => setWeeks(Number(e.target.value))} style={inputStyle}>
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
              <option key={n} value={n}>{n} {n === 1 ? 'vecka' : 'veckor'} → vecka {weekNumber(addDays(monday, n * 7))} ({weekRangeLabel(addDays(monday, n * 7))})</option>
            ))}
          </select>
        </Field>
        <div>
          <FieldLabel>Grupper</FieldLabel>
          <Chips label="Grupper" options={options} selected={groups} onToggle={id => setGroups(toggleIn(groups, id))} />
        </div>
      </div>
    </Sheet>
  )
}

// Save one group's week as a template (period_templates with weeks = 1 later)
export function SaveTemplateSheet({ monday, groupIds, onClose, onDone }: {
  monday: string
  groupIds: string[]
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const { data, saveWeekAsTemplate } = useSchedule()
  const options = data.groups.filter(g => groupIds.includes(g.id))
  const [group, setGroup] = useState(options[0]?.id ?? '')
  const gName = data.groups.find(g => g.id === group)?.name ?? ''
  const [name, setName] = useState('')

  const run = () => {
    const title = name.trim() || `${gName} v.${weekNumber(monday)}`
    const n = saveWeekAsTemplate(monday, group, title)
    onDone(n ? `”${title}” sparad med ${n} pass. Den finns under Bank.` : `${gName} har inga planerade pass vecka ${weekNumber(monday)} att spara.`)
    onClose()
  }

  return (
    <Sheet title="Spara veckan som mall" subtitle={`Vecka ${weekNumber(monday)} · ${weekRangeLabel(monday)}`} onClose={onClose} zIndex={110}
      footer={<><Button grow onClick={onClose}>Avbryt</Button><Button grow variant="primary" onClick={run} disabled={!group}>Spara</Button></>}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <FieldLabel>Grupp</FieldLabel>
          <div role="radiogroup" aria-label="Grupp" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {options.map(g => (
              <button key={g.id} role="radio" aria-checked={g.id === group} onClick={() => setGroup(g.id)} style={{
                minHeight: 40, padding: '0 12px', borderRadius: 999, fontFamily: 'inherit', cursor: 'pointer', fontSize: 13.5, fontWeight: 700,
                border: `1.5px solid ${g.id === group ? g.color : 'rgba(0,0,0,0.1)'}`, background: g.id === group ? g.color : '#fff', color: g.id === group ? '#fff' : UI.text,
              }}>{g.name}</button>
            ))}
          </div>
        </div>
        <Field label="Namn på mallen">
          <input value={name} onChange={e => setName(e.target.value)} placeholder={`${gName} v.${weekNumber(monday)}`} style={inputStyle} />
        </Field>
        <p style={{ margin: 0, fontSize: 13, color: UI.muted }}>Mallen kan sedan läggas på vilken vecka som helst för gruppen, under Period eller Bank.</p>
      </div>
    </Sheet>
  )
}

// Lay a saved week or a club period template onto a group's real passes
export function ApplyTemplateSheet({ groupIds, defaultGroupId, defaultMonday, defaultTemplateId, onClose, onDone }: {
  groupIds: string[]
  defaultGroupId?: string
  defaultMonday: string
  defaultTemplateId?: string
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const { data, applyTemplate } = useSchedule()
  const [club, setClub] = useState<PlanTemplate[] | null>(null)
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? '')
  const options = data.groups.filter(g => groupIds.includes(g.id))
  const [group, setGroup] = useState(defaultGroupId && groupIds.includes(defaultGroupId) ? defaultGroupId : options[0]?.id ?? '')
  const [monday, setMonday] = useState(defaultMonday)

  useEffect(() => {
    let alive = true
    fetchPeriodTemplates().then(t => { if (alive) setClub(t) })
    return () => { alive = false }
  }, [])

  const all = [...data.templates, ...(club ?? [])]
  const chosen = all.find(t => t.id === templateId) ?? all[0]
  const weeks: string[] = []
  for (let m = mondayOf(data.term.startsOn); m <= data.term.endsOn; m = addDays(m, 7)) weeks.push(m)

  const run = () => {
    if (!chosen) return
    const n = applyTemplate(chosen, group, monday)
    const g = data.groups.find(x => x.id === group)?.name
    onDone(n ? `”${chosen.name}” lades på ${n} pass för ${g} från vecka ${weekNumber(monday)} (som utkast).`
      : `Inga lediga pass för ${g} matchade mallens dagar. Redan planerade pass skrivs inte över.`)
    onClose()
  }

  return (
    <Sheet title="Lägg in mall" onClose={onClose} zIndex={110}
      footer={<><Button grow onClick={onClose}>Avbryt</Button><Button grow variant="primary" onClick={run} disabled={!chosen || !group}>Lägg in</Button></>}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Field label="Mall">
          <select value={chosen?.id ?? ''} onChange={e => setTemplateId(e.target.value)} style={inputStyle}>
            {data.templates.length > 0 && (
              <optgroup label="Sparade veckor">
                {data.templates.map(t => <option key={t.id} value={t.id}>{t.name} · {t.entries.length} pass</option>)}
              </optgroup>
            )}
            {club && club.length > 0 && (
              <optgroup label="Klubbens periodmallar">
                {club.map(t => <option key={t.id} value={t.id}>{t.name} · {t.weeks} v · {t.entries.length} pass</option>)}
              </optgroup>
            )}
          </select>
        </Field>
        {club === null && <p style={{ margin: '-8px 0 0', fontSize: 13, color: UI.muted }}>Hämtar klubbens periodmallar…</p>}
        {club !== null && all.length === 0 && (
          <p style={{ margin: 0, fontSize: 13.5, color: UI.muted }}>Det finns inga mallar än. Spara en planerad vecka som mall under Vecka, eller skapa en periodmall under Bank.</p>
        )}
        <div>
          <FieldLabel>Grupp</FieldLabel>
          <div role="radiogroup" aria-label="Grupp" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {options.map(g => (
              <button key={g.id} role="radio" aria-checked={g.id === group} onClick={() => setGroup(g.id)} style={{
                minHeight: 40, padding: '0 12px', borderRadius: 999, fontFamily: 'inherit', cursor: 'pointer', fontSize: 13.5, fontWeight: 700,
                border: `1.5px solid ${g.id === group ? g.color : 'rgba(0,0,0,0.1)'}`, background: g.id === group ? g.color : '#fff', color: g.id === group ? '#fff' : UI.text,
              }}>{g.name}</button>
            ))}
          </div>
        </div>
        <Field label="Börja vecka">
          <select value={monday} onChange={e => setMonday(e.target.value)} style={inputStyle}>
            {weeks.map(m => <option key={m} value={m}>Vecka {weekNumber(m)} · {weekRangeLabel(m)}</option>)}
          </select>
        </Field>
        {chosen && <p style={{ margin: 0, fontSize: 13, color: UI.muted }}>Fyller gruppens oplanerade pass vecka {weekNumber(monday)}–{weekNumber(addDays(monday, (chosen.weeks - 1) * 7))}. Redan planerade pass lämnas orörda.</p>}
      </div>
    </Sheet>
  )
}

// Copy one week's planned passes to another week
export function CopyWeekSheet({ fromMonday, groupIds, onClose, onDone }: {
  fromMonday: string
  groupIds: string[]
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const { data, copyWeekTo } = useSchedule()
  const weeks: string[] = []
  for (let m = mondayOf(data.term.startsOn); m <= data.term.endsOn; m = addDays(m, 7)) if (m !== fromMonday) weeks.push(m)
  const [to, setTo] = useState(weeks.find(m => m > fromMonday) ?? weeks[0])

  const run = () => {
    const n = copyWeekTo(fromMonday, to, groupIds)
    onDone(n ? `${n} pass kopierades till vecka ${weekNumber(to)} (som utkast).` : `Inget kopierades till vecka ${weekNumber(to)}.`)
    onClose()
  }

  return (
    <Sheet title={`Kopiera vecka ${weekNumber(fromMonday)}`} onClose={onClose} zIndex={110}
      footer={<><Button grow onClick={onClose}>Avbryt</Button><Button grow variant="primary" onClick={run}>Kopiera</Button></>}>
      <Field label="Till vecka">
        <select value={to} onChange={e => setTo(e.target.value)} style={inputStyle}>
          {weeks.map(m => <option key={m} value={m}>Vecka {weekNumber(m)} · {weekRangeLabel(m)}</option>)}
        </select>
      </Field>
    </Sheet>
  )
}
