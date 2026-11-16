'use client'

import { useState } from 'react'
import { useSchedule, type EventInput } from '@/lib/schedule/store'
import { useUser } from '@/lib/context/user'
import { EVENT_STYLE, rangeLabel, todayISO } from '@/lib/schedule/format'
import { groupMap } from '@/lib/schedule/select'
import type { ClubEvent, EventType } from '@/lib/schedule/types'
import BottomSheet, { fieldLabel, linkButton, pill, textInput } from '@/components/planning/BottomSheet'
import { C, Empty, ListCard, primaryButton } from '@/components/schedule/ui'

// Viktiga datum: competitions, camps, days without training … as rows in
// the same style as "Kommande" on the dashboard. Coaches create and edit.

const TYPES: EventType[] = ['comp', 'camp', 'cancelled', 'tryout', 'edu', 'event']

export default function ImportantDatesPage() {
  const { data, loading } = useSchedule()
  const { roles } = useUser()
  const [open, setOpen] = useState<ClubEvent | 'new' | null>(null)
  const today = todayISO()
  const gm = groupMap(data)
  const trainingGroups = data.groups.filter(g => g.name !== 'Vuxen').length
  const upcoming = data.events.filter(e => e.endsOn >= today)
  const past = data.events.filter(e => e.endsOn < today).reverse()
  const canEdit = roles.includes('coach') || roles.includes('admin')

  const sub = (e: ClubEvent) => {
    const all = e.groupIds.length === 0 || e.groupIds.length >= trainingGroups
    return `${EVENT_STYLE[e.type].label} · ${all ? 'Alla grupper' : e.groupIds.map(id => gm[id]?.name).filter(Boolean).join(', ')}`
  }

  const list = (events: ClubEvent[], muted = false) => (
    <ListCard>
      {events.map((e, i) => (
        <button key={e.id} type="button" disabled={!canEdit} onClick={() => setOpen(e)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', minHeight: 56, background: 'none', border: 'none',
          borderBottom: i < events.length - 1 ? `1px solid ${C.line}` : 'none', textAlign: 'left', fontFamily: 'inherit', color: C.text,
          cursor: canEdit ? 'pointer' : 'default',
        }}>
          <span style={{ width: 64, flex: 'none', fontSize: 14, fontWeight: 800, color: muted ? C.muted : C.primary }}>{rangeLabel(e.startsOn, e.endsOn)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{e.title}</div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{sub(e)}</div>
          </div>
        </button>
      ))}
    </ListCard>
  )

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 20, color: C.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0, flex: 1, fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>Viktiga datum</h1>
        {canEdit && (
          <button type="button" onClick={() => setOpen('new')} style={{ display: 'flex', alignItems: 'center', minHeight: 44, padding: '0 18px', borderRadius: 14, border: 'none', background: C.primary, color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
            + Nytt datum
          </button>
        )}
      </div>

      {loading && <ListCard><Empty>Hämtar …</Empty></ListCard>}
      {!loading && upcoming.length === 0 && <ListCard><Empty>Inga viktiga datum framåt.</Empty></ListCard>}
      {upcoming.length > 0 && list(upcoming)}

      {past.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.muted }}>Tidigare</h2>
          {list(past, true)}
        </section>
      )}

      {open && <EventSheet event={open === 'new' ? null : open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function EventSheet({ event, onClose }: { event: ClubEvent | null; onClose: () => void }) {
  const { data, addEvent, updateEvent, deleteEvent, cancelPassesFor } = useSchedule()
  const [form, setForm] = useState<EventInput>(() => event
    ? { startsOn: event.startsOn, endsOn: event.endsOn, title: event.title, type: event.type, note: event.note, groupIds: event.groupIds, staffIds: event.staffIds }
    : { startsOn: todayISO(), endsOn: todayISO(), title: '', type: 'comp', note: '', groupIds: [], staffIds: [] })
  const [cancelPasses, setCancelPasses] = useState(false)
  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setForm(f => ({ ...f, [k]: v }))
  const ok = form.title.trim() && form.startsOn && form.endsOn >= form.startsOn

  const save = () => {
    if (!ok) return
    const e = { ...form, title: form.title.trim() }
    if (event) updateEvent(event.id, e)
    else addEvent(e)
    if (form.type === 'cancelled' && cancelPasses) cancelPassesFor(e)
    onClose()
  }
  const toggleGroup = (id: string) => set('groupIds', form.groupIds.includes(id) ? form.groupIds.filter(x => x !== id) : [...form.groupIds, id])

  return (
    <BottomSheet title={event ? 'Ändra datum' : 'Nytt datum'} onClose={onClose}
      footer={<>
        <button type="button" disabled={!ok} onClick={save} style={{ ...primaryButton, opacity: ok ? 1 : 0.5 }}>Spara</button>
        {event && <button type="button" onClick={() => { deleteEvent(event.id); onClose() }} style={{ ...linkButton, textAlign: 'center' }}>Ta bort</button>}
      </>}>
      <label style={fieldLabel}>Namn<input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="T.ex. Julklappshoppet" style={{ ...textInput, fontWeight: 700 }} /></label>
      <div style={fieldLabel}>
        Typ
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TYPES.map(t => <button key={t} type="button" aria-pressed={form.type === t} onClick={() => set('type', t)} style={pill(form.type === t)}>{EVENT_STYLE[t].label}</button>)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <label style={{ ...fieldLabel, flex: 1 }}>Från<input type="date" value={form.startsOn} onChange={e => { set('startsOn', e.target.value); if (form.endsOn < e.target.value) set('endsOn', e.target.value) }} style={textInput} /></label>
        <label style={{ ...fieldLabel, flex: 1 }}>Till<input type="date" value={form.endsOn} min={form.startsOn} onChange={e => set('endsOn', e.target.value)} style={textInput} /></label>
      </div>
      <div style={fieldLabel}>
        Grupper <span style={{ fontWeight: 500 }}>(ingen vald = alla)</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {data.groups.map(g => <button key={g.id} type="button" aria-pressed={form.groupIds.includes(g.id)} onClick={() => toggleGroup(g.id)} style={pill(form.groupIds.includes(g.id))}>{g.name}</button>)}
        </div>
      </div>
      <label style={fieldLabel}>Anteckning<input type="text" value={form.note} onChange={e => set('note', e.target.value)} style={textInput} /></label>
      {form.type === 'cancelled' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, fontSize: 15, fontWeight: 600 }}>
          <input type="checkbox" checked={cancelPasses} onChange={e => setCancelPasses(e.target.checked)} style={{ width: 22, height: 22 }} />
          Ställ in grupperna pass under perioden
        </label>
      )}
    </BottomSheet>
  )
}
