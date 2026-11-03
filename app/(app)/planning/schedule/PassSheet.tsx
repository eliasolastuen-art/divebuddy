'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Clock, MapPin, Users, UserRound, CalendarX, PencilLine, ClipboardList, Ban, RotateCcw, Trash2,
  ThumbsUp, ThumbsDown, Repeat, Target, ArrowRight,
} from 'lucide-react'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import { DAY_LONG, eventsOnDate, EVENT_STYLE, mondayOf, passStatus, shortDate, timeText, todayISO, UI, weekdayIndex } from '@/lib/schedule/format'
import { groupMap, staffMap } from '@/lib/schedule/select'
import { CATEGORY_BY_ID, contentSummary, hasContent } from '@/lib/schedule/content'
import type { PassReview, SchedulePass } from '@/lib/schedule/types'
import Sheet, { Button, inputStyle } from './Sheet'
import PassPlanner from './PassPlanner'
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
  if (mode === 'plan') return <PassPlanner passId={pass.id} onClose={() => setMode('view')} />
  if (mode === 'edit') return <PassForm passId={pass.id} onClose={() => setMode('view')} />

  const gm = groupMap(data)
  return (
    <Sheet title={pass.groupIds.map(id => gm[id]?.name).join(' + ')} subtitle={`${DAY_LONG[weekdayIndex(pass.date)]} ${shortDate(pass.date)}`} onClose={close}>
      <Details pass={pass} variant={variant} />
      {variant === 'plan'
        ? <PlanSection pass={pass} onPlan={() => setMode('plan')} />
        : <ScheduleSection pass={pass} onEdit={() => setMode('edit')} onClosed={close} />}
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
        {pass.removed && <Tag bg="#F1F5F9" fg="#475569">Borttaget</Tag>}
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

// ── Planning: content, focus, review ───────────────────────────────────────

function PlanSection({ pass, onPlan }: { pass: SchedulePass; onPlan: () => void }) {
  const { data, setContentStatus } = useSchedule()
  const cancelled = pass.cancelledReason !== null
  const monday = mondayOf(pass.date)
  const focus = data.weekFocus.filter(f => f.monday === monday && pass.groupIds.includes(f.groupId))
  const gm = groupMap(data)
  const isPast = pass.date < todayISO()

  return (
    <>
      {focus.length > 0 && (
        <div style={{ marginTop: 16, display: 'grid', gap: 6 }}>
          {focus.map(f => (
            <div key={f.groupId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, background: UI.tealLight, color: UI.tealDark, fontSize: 13.5, fontWeight: 700 }}>
              <Target size={16} aria-hidden />Veckans fokus{focus.length > 1 ? ` (${gm[f.groupId]?.name})` : ''}: {f.text}
            </div>
          ))}
        </div>
      )}

      {!cancelled && !pass.removed && (
        <section style={{ marginTop: 20 }}>
          <SectionHeading>Innehåll</SectionHeading>
          {hasContent(pass.content) ? (
            <div style={{ borderRadius: 16, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', padding: 12, display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12.5, color: UI.muted }}>{pass.content!.source} · {contentSummary(pass.content)}</div>
              {pass.content!.blocks.map(b => (
                <div key={b.id} style={{ borderLeft: `3px solid ${CATEGORY_BY_ID[b.category]?.color}`, paddingLeft: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: UI.text }}>{b.name}</div>
                  {b.items.length > 0 && (
                    <div style={{ fontSize: 13, color: UI.muted, marginTop: 2 }}>
                      {b.items.map(i => `${i.name}${i.sets ? ` ${i.sets}×${i.reps ?? ''}` : ''}`).join(' · ')}
                    </div>
                  )}
                </div>
              ))}
              {pass.content!.notes && <div style={{ fontSize: 13, color: UI.text, fontStyle: 'italic' }}>{pass.content!.notes}</div>}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: UI.muted }}>Inget planerat än.</p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Button grow variant={hasContent(pass.content) ? 'secondary' : 'primary'} onClick={onPlan}>
              <ClipboardList size={16} />{hasContent(pass.content) ? 'Ändra planering' : 'Planera passet'}
            </Button>
            {hasContent(pass.content) && pass.contentStatus !== 'planned' && (
              <Button grow variant="primary" onClick={() => setContentStatus(pass.id, 'planned')}>Markera klart</Button>
            )}
            {pass.contentStatus === 'planned' && (
              <Button grow onClick={() => setContentStatus(pass.id, 'draft')}>Gör till utkast</Button>
            )}
          </div>
        </section>
      )}

      {isPast && !cancelled && !pass.removed && <ReviewSection pass={pass} />}

      <Link href="/schema" style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: UI.tealDark, textDecoration: 'none', minHeight: 40 }}>
        Se passet i schemat <ArrowRight size={15} />
      </Link>
    </>
  )
}

function ReviewSection({ pass }: { pass: SchedulePass }) {
  const { saveReview } = useSchedule()
  const r: PassReview = pass.review ?? { rating: null, note: '', repeat: false }
  const set = (patch: Partial<PassReview>) => saveReview(pass.id, { ...r, ...patch })

  return (
    <section style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${UI.line}` }}>
      <SectionHeading>Så gick det</SectionHeading>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Toggle on={r.rating === 'up'} onClick={() => set({ rating: r.rating === 'up' ? null : 'up' })} color="#15803D" bg="#DCFCE7">
          <ThumbsUp size={16} />Bra pass
        </Toggle>
        <Toggle on={r.rating === 'down'} onClick={() => set({ rating: r.rating === 'down' ? null : 'down' })} color="#B91C1C" bg="#FEE2E2">
          <ThumbsDown size={16} />Behöver ändras
        </Toggle>
        <Toggle on={r.repeat} onClick={() => set({ repeat: !r.repeat })} color={UI.tealDark} bg={UI.tealLight}>
          <Repeat size={16} />Kör igen
        </Toggle>
      </div>
      <label style={{ display: 'grid', gap: 5, marginTop: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: UI.muted }}>Kommentar (syns när passet kopieras)</span>
        <textarea value={r.note} onChange={e => set({ note: e.target.value })} rows={2}
          placeholder="t.ex. för mycket land, ansatsen satt bra, öka till 3 serier nästa gång"
          style={{ ...inputStyle, minHeight: 64, padding: '10px 12px', resize: 'vertical' }} />
      </label>
    </section>
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
        <Link href={`/planning?view=vecka&week=${mondayOf(pass.date)}&pass=${pass.id}`} style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: UI.tealDark, textDecoration: 'none', minHeight: 40 }}>
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

function Toggle({ on, onClick, children, color, bg }: { on: boolean; onClick: () => void; children: React.ReactNode; color: string; bg: string }) {
  return (
    <button aria-pressed={on} onClick={onClick} style={{
      minHeight: 44, padding: '0 14px', borderRadius: 12, fontFamily: 'inherit', cursor: 'pointer', fontSize: 14, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 7,
      border: `1.5px solid ${on ? color : 'rgba(0,0,0,0.1)'}`, background: on ? bg : '#fff', color: on ? color : UI.text,
    }}>{children}</button>
  )
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
