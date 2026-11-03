'use client'

import { useState } from 'react'
import { useSchedule, type NewPass } from '@/lib/schedule/store'
import { PLACES, UI } from '@/lib/schedule/format'
import Sheet, { Button, Chips, Field, FieldLabel, inputStyle, toggleIn } from './Sheet'

// Edit a scheduled pass (passId) or add an extra pass (no passId)
export default function PassForm({ passId, defaultDate, defaultGroupId, onClose, onSaved }: {
  passId?: string
  defaultDate?: string
  defaultGroupId?: string
  onClose: () => void
  onSaved?: (id: string) => void
}) {
  const { data, updatePass, addExtraPass } = useSchedule()
  const existing = passId ? data.passes.find(p => p.id === passId) : undefined

  const [form, setForm] = useState<NewPass>(() => existing
    ? { date: existing.date, start: existing.start, end: existing.end, place: existing.place, groupIds: existing.groupIds, staffIds: existing.staffIds }
    : { date: defaultDate ?? '', start: '17:00', end: '18:00', place: 'Vatten', groupIds: defaultGroupId ? [defaultGroupId] : [], staffIds: [] })

  const set = <K extends keyof NewPass>(k: K, v: NewPass[K]) => setForm(f => ({ ...f, [k]: v }))
  const valid = !!form.date && form.groupIds.length > 0 && (!form.start || !form.end || form.start < form.end)

  const save = () => {
    if (!valid) return
    if (existing) {
      updatePass(existing.id, form)
      onSaved?.(existing.id)
    } else {
      onSaved?.(addExtraPass(form))
    }
    onClose()
  }

  return (
    <Sheet title={existing ? 'Ändra pass' : 'Nytt extrapass'} onClose={onClose} zIndex={110}
      footer={<>
        <Button grow onClick={onClose}>Avbryt</Button>
        <Button grow variant="primary" onClick={save} disabled={!valid}>{existing ? 'Spara' : 'Lägg till'}</Button>
      </>}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Field label="Datum" grow>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} disabled={!!existing}
              min={data.term.startsOn} max={data.term.endsOn} style={{ ...inputStyle, opacity: existing ? 0.6 : 1 }} />
          </Field>
          <Field label="Start">
            <input type="time" value={form.start} onChange={e => set('start', e.target.value)} style={{ ...inputStyle, width: 120 }} />
          </Field>
          <Field label="Slut">
            <input type="time" value={form.end} onChange={e => set('end', e.target.value)} style={{ ...inputStyle, width: 120 }} />
          </Field>
        </div>
        {form.start && form.end && form.start >= form.end && (
          <p role="alert" style={{ margin: '-8px 0 0', fontSize: 13, color: '#B91C1C' }}>Sluttiden måste vara efter starttiden.</p>
        )}

        <Field label="Plats">
          <select value={form.place} onChange={e => set('place', e.target.value)} style={inputStyle}>
            {PLACES.map(p => <option key={p} value={p}>{p}</option>)}
            <option value="">Ingen plats</option>
          </select>
        </Field>

        <div>
          <FieldLabel>Grupper (välj en eller flera)</FieldLabel>
          <Chips label="Grupper" options={data.groups} selected={form.groupIds} onToggle={id => set('groupIds', toggleIn(form.groupIds, id))} />
        </div>

        <div>
          <FieldLabel>Tränare</FieldLabel>
          <Chips label="Tränare" options={data.staff} selected={form.staffIds} onToggle={id => set('staffIds', toggleIn(form.staffIds, id))} />
        </div>

        {existing && (
          <p style={{ margin: 0, fontSize: 12.5, color: UI.muted }}>Datumet ändras inte. Ställ in passet och lägg till ett extrapass om det ska flyttas.</p>
        )}
      </div>
    </Sheet>
  )
}
