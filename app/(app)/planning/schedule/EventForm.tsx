'use client'

import { useState } from 'react'
import { useSchedule, type EventInput } from '@/lib/schedule/store'
import { EVENT_STYLE, UI } from '@/lib/schedule/format'
import type { EventType } from '@/lib/schedule/types'
import Sheet, { Button, Chips, Field, FieldLabel, inputStyle, toggleIn } from './Sheet'

const TYPES = Object.entries(EVENT_STYLE) as [EventType, (typeof EVENT_STYLE)[EventType]][]

export default function EventForm({ eventId, onClose, onDone }: {
  eventId?: string
  onClose: () => void
  onDone?: (message: string) => void
}) {
  const { data, addEvent, updateEvent, deleteEvent, cancelPassesFor } = useSchedule()
  const existing = eventId ? data.events.find(e => e.id === eventId) : undefined

  const [form, setForm] = useState<EventInput>(() => existing
    ? { startsOn: existing.startsOn, endsOn: existing.endsOn, title: existing.title, type: existing.type, note: existing.note, groupIds: existing.groupIds, staffIds: existing.staffIds }
    : { startsOn: '', endsOn: '', title: '', type: 'comp', note: '', groupIds: [], staffIds: [] })
  const [cancelPasses, setCancelPasses] = useState(false)

  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setForm(f => ({ ...f, [k]: v }))
  const endsOn = form.endsOn || form.startsOn
  const valid = !!form.startsOn && !!form.title.trim() && endsOn >= form.startsOn

  const save = () => {
    if (!valid) return
    const e = { ...form, title: form.title.trim(), endsOn }
    if (existing) updateEvent(existing.id, e)
    else addEvent(e)
    const n = cancelPasses ? cancelPassesFor(e) : 0
    onDone?.(cancelPasses ? `${e.title} sparat · ${n} pass inställda` : `${e.title} sparat`)
    onClose()
  }

  return (
    <Sheet title={existing ? 'Ändra datum' : 'Nytt viktigt datum'} onClose={onClose} zIndex={110}
      footer={<>
        {existing && <Button variant="danger" onClick={() => { deleteEvent(existing.id); onDone?.(`${existing.title} borttaget`); onClose() }}>Ta bort</Button>}
        <Button grow onClick={onClose}>Avbryt</Button>
        <Button grow variant="primary" onClick={save} disabled={!valid}>Spara</Button>
      </>}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Field label="Namn">
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="t.ex. Triangel Tävling" style={inputStyle} />
        </Field>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Field label="Från" grow>
            <input type="date" value={form.startsOn} onChange={e => set('startsOn', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Till och med (valfritt)" grow>
            <input type="date" value={form.endsOn} min={form.startsOn} onChange={e => set('endsOn', e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <div>
          <FieldLabel>Typ</FieldLabel>
          <div role="radiogroup" aria-label="Typ" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TYPES.map(([k, st]) => {
              const on = form.type === k
              return (
                <button key={k} role="radio" aria-checked={on} onClick={() => set('type', k)} style={{
                  minHeight: 40, padding: '0 12px', borderRadius: 999, fontFamily: 'inherit', cursor: 'pointer', fontSize: 13.5, fontWeight: 700,
                  border: `1.5px solid ${on ? st.dot : 'rgba(0,0,0,0.1)'}`, background: on ? st.bg : '#fff', color: on ? st.fg : UI.text,
                }}>{st.label}</button>
              )
            })}
          </div>
        </div>

        <Field label="Notis (valfritt)">
          <input value={form.note} onChange={e => set('note', e.target.value)} placeholder="t.ex. JKPG · 09–17" style={inputStyle} />
        </Field>

        <div>
          <FieldLabel>Grupper som berörs (inga valda = hela klubben)</FieldLabel>
          <Chips label="Grupper" options={data.groups} selected={form.groupIds} onToggle={id => set('groupIds', toggleIn(form.groupIds, id))} />
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 14, background: '#FEF2F2', border: '1px solid #FECACA', cursor: 'pointer' }}>
          <input type="checkbox" checked={cancelPasses} onChange={e => setCancelPasses(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, accentColor: '#B91C1C' }} />
          <span>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#7F1D1D' }}>Ställ in passen de här dagarna</span>
            <span style={{ display: 'block', fontSize: 12.5, color: '#991B1B', marginTop: 2 }}>
              Gäller {form.groupIds.length ? 'de valda gruppernas' : 'alla'} pass. De kan återställas ett och ett.
            </span>
          </span>
        </label>
      </div>
    </Sheet>
  )
}
