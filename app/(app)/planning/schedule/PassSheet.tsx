'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Clock, MapPin, Users, UserRound, CalendarX, PencilLine, Ban, RotateCcw, Trash2, ArrowRight,
} from 'lucide-react'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import { DAY_LONG, eventsOnDate, EVENT_STYLE, mondayOf, passStatus, shortDate, timeText, UI, weekdayIndex } from '@/lib/schedule/format'
import { groupMap, staffMap } from '@/lib/schedule/select'
import type { SchedulePass } from '@/lib/schedule/types'
import Sheet, { Button, inputStyle } from './Sheet'
import PassForm from './PassForm'
import { PlaceTag, StatusTag } from './ui'

// variant 'plan'   → Planning: what the pass contains, plan it, "så gick det"
// variant 'schema' → Schema: time, place, people; admins edit the schedule
export default function PassSheet({ passId, onClose, variant = 'plan' }: {
  passId: string | null
  onClose: () => void
  variant?: 'plan' | 'schema'
}) {
  const { data } = useSchedule()
  const [mode, setMode] = useState<'view' | 'plan' | 'edit'>('view')

  const pass = passId ? data.passes.find(p => p.id === passId) ?? null : null
  if (!pass) return null

  const close = () => { setMode('view'); onClose() }
  if (mode === 'edit') return <PassForm passId={pass.id} onClose={() => setMode('view')} />

  const gm = groupMap(data)
  return (
    <Sheet title={pass.groupIds.map(id => gm[id]?.name).join(' + ')} subtitle={`${DAY_LONG[weekdayIndex(pass.date)]} ${shortDate(pass.date)}`} onClose={close}>
      <Details pass={pass} variant={variant} />
      <ScheduleSection pass={pass} onEdit={() => setMode('edit')} onClosed={close} />
    </Sheet>
  )
}

function Details({ pass, variant }: { pass: SchedulePass; variant: 'plan' | 'schema' }) {
  const { data } = useSchedule()
  const gm = groupMap(data)
  const sm = staffMap(data)
  const cancelled = pass.cancelledReason !== null
  const dayEvents = eventsOnDate(data.events, pass.date).filter(e =>
    e.groupIds.length === 0 || e.groupIds.some(g => pass.groupIds.includes(g)))

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {variant === 'plan' && <StatusTag status={passStatus(pass)} />}
        {variant === 'schema' && cancelled && <StatusTag status="cancelled" />}
        {pass.isExtra && <Tag bg="#D1FAE5" fg="#065F46">Extrapass</Tag>}
        {pass.removed && <Tag bg="#EEF3F8" fg="#56637A">Borttaget</Tag>}
      </div>
      <dl style={{ margin: '16px 0 0', display: 'grid', gap: 12 }}>
        <Row icon={<Clock size={16} />} label="Tid">{timeText(pass)}</Row>
        <Row icon={<MapPin size={16} />} label="Plats"><PlaceTag place={pass.place} /></Row>
        <Row icon={<Users size={16} />} label="Grupper">
          <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {pass.groupIds.map(id => (
              <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: gm[id]?.color }} />{gm[id]?.name}
              </span>
            ))}
          </span>
        </Row>
        <Row icon={<UserRound size={16} />} label="Tränare">
          {pass.staffIds.length ? pass.staffIds.map(id => sm[id]?.name).join(', ') : <span style={{ color: UI.muted }}>Ingen tilldelad</span>}
        </Row>
        {cancelled && <Row icon={<CalendarX size={16} />} label="Orsak">{pass.cancelledReason || 'Inställt'}</Row>}
      </dl>
      {dayEvents.length > 0 && (
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {dayEvents.map(e => {
            const st = EVENT_STYLE[e.type]
            return (
              <div key={e.id} style={{ padding: '10px 12px', borderRadius: 12, background: st.bg, color: st.fg, fontSize: 13.5, fontWeight: 600 }}>
                {st.label}: {e.title}{e.note ? ` · ${e.note}` : ''}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ── Schema: admin edits ────────────────────────────────────────────────────

function ScheduleSection({ pass, onEdit, onClosed }: { pass: SchedulePass; onEdit: () => void; onClosed: () => void }) {
  const { cancelPass, uncancelPass, removePass, restorePass } = useSchedule()
  const { canEditSchedule } = useViewer()
  const [mode, setMode] = useState<'view' | 'cancel' | 'remove'>('view')
  const [reason, setReason] = useState('')
  const cancelled = pass.cancelledReason !== null

  return (
    <>
      <section style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${UI.line}` }}>
        <SectionHeading>Schema</SectionHeading>
        {!canEditSchedule ? (
          <p style={{ margin: 0, fontSize: 13, color: UI.muted }}>Det är admin som ändrar tider, platser och inställda pass.</p>
        ) : mode === 'cancel' ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: UI.muted }}>Orsak (visas för grupperna)</span>
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="t.ex. Bassängen stängd" style={inputStyle} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button grow onClick={() => setMode('view')}>Avbryt</Button>
              <Button grow variant="danger" onClick={() => { cancelPass(pass.id, reason.trim()); setMode('view'); setReason('') }}><Ban size={16} />Ställ in</Button>
            </div>
          </div>
        ) : mode === 'remove' ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 14, color: UI.text }}>Ta bort passet från schemat? Det hamnar under &quot;Borttagna pass&quot; i Per grupp och kan återställas.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button grow onClick={() => setMode('view')}>Avbryt</Button>
              <Button grow variant="danger" onClick={() => { removePass(pass.id); onClosed() }}><Trash2 size={16} />Ta bort</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pass.removed ? (
              <Button grow onClick={() => restorePass(pass.id)}><RotateCcw size={16} />Återställ passet</Button>
            ) : (
              <>
                <Button grow onClick={onEdit}><PencilLine size={16} />Ändra</Button>
                {cancelled
                  ? <Button grow onClick={() => uncancelPass(pass.id)}><RotateCcw size={16} />Återställ inställt</Button>
                  : <Button grow variant="danger" onClick={() => setMode('cancel')}><Ban size={16} />Ställ in</Button>}
                <Button grow variant="danger" onClick={() => setMode('remove')}><Trash2 size={16} />Ta bort</Button>
              </>
            )}
          </div>
        )}
      </section>
      {!pass.removed && !cancelled && (
        <Link href={`/planning?week=${mondayOf(pass.date)}&pass=${pass.id}`} style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: UI.primary, textDecoration: 'none', minHeight: 40 }}>
          Planera passet i Planning <ArrowRight size={15} />
        </Link>
      )}
    </>
  )
}

// ── Small pieces ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: UI.muted }}>{children}</h3>
}

function Tag({ children, bg, fg }: { children: React.ReactNode; bg: string; fg: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: bg, color: fg }}>{children}</span>
}


function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <dt style={{ display: 'flex', alignItems: 'center', gap: 8, width: 92, flexShrink: 0, color: UI.muted, fontSize: 13, fontWeight: 600 }}>
        {icon}{label}
      </dt>
      <dd style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: UI.text, minWidth: 0 }}>{children}</dd>
    </div>
  )
}
