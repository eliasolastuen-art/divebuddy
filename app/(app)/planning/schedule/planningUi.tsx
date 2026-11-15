'use client'

import { useState } from 'react'
import { Target, ThumbsUp, ThumbsDown, Repeat, Plus } from 'lucide-react'
import { useSchedule } from '@/lib/schedule/store'
import { dateNum, dayShort, passStatus, STATUS_STYLE, timeText, todayISO, UI } from '@/lib/schedule/format'
import { CATEGORY_BY_ID, hasContent } from '@/lib/schedule/content'
import type { SchedulePass } from '@/lib/schedule/types'
import { PlaceTag } from './ui'

// Which kinds of blocks a pass contains, as small coloured tags
export function ContentChips({ pass, max = 4 }: { pass: SchedulePass; max?: number }) {
  if (!hasContent(pass.content)) return null
  const cats = Array.from(new Set(pass.content!.blocks.map(b => b.category)))
  return (
    <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {cats.slice(0, max).map(c => (
        <span key={c} style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: `${CATEGORY_BY_ID[c].color}18`, color: CATEGORY_BY_ID[c].color }}>
          {CATEGORY_BY_ID[c].label}
        </span>
      ))}
    </span>
  )
}

export function ReviewMark({ pass }: { pass: SchedulePass }) {
  const r = pass.review
  if (!r) return null
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {r.rating === 'up' && <ThumbsUp size={14} color="#15803D" aria-label="Bra pass" />}
      {r.rating === 'down' && <ThumbsDown size={14} color="#B91C1C" aria-label="Behöver ändras" />}
      {r.repeat && <Repeat size={14} color={UI.primary} aria-label="Kör igen" />}
    </span>
  )
}

// One pass in the planning views: what it is and how far planning has come
export function PassTile({ pass, onOpen, showDate }: { pass: SchedulePass; onOpen: () => void; showDate?: boolean }) {
  const status = passStatus(pass, todayISO())
  const st = STATUS_STYLE[status]
  const blockNames = hasContent(pass.content) ? pass.content!.blocks.map(b => b.name).join(' · ') : ''

  return (
    <button onClick={onOpen} aria-label={`${timeText(pass)} ${pass.place}, ${st.label}${blockNames ? `: ${blockNames}` : ''}`} style={{
      width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 5, padding: '9px 10px', borderRadius: 12,
      background: status === 'unplanned' ? '#FCFCFD' : st.bg,
      borderStyle: st.dashed ? 'dashed' : 'solid', borderWidth: 1, borderColor: st.border,
      opacity: status === 'past' && !hasContent(pass.content) ? 0.65 : 1,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {showDate && <span style={{ fontSize: 12, fontWeight: 800, color: UI.muted }}>{dayShort(pass.date)} {dateNum(pass.date)}</span>}
        <span style={{ fontSize: 13.5, fontWeight: 800, color: UI.text, fontVariantNumeric: 'tabular-nums', textDecoration: st.strike ? 'line-through' : 'none' }}>{timeText(pass)}</span>
        <PlaceTag place={pass.place} />
        <ReviewMark pass={pass} />
      </span>
      {blockNames
        ? <span style={{ fontSize: 12.5, fontWeight: 600, color: UI.text, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{blockNames}</span>
        : <span style={{ fontSize: 12, fontWeight: 700, color: st.fg }}>{status === 'cancelled' ? (pass.cancelledReason || 'Inställt') : st.label}</span>}
      <ContentChips pass={pass} />
    </button>
  )
}

// "v.43 fokus: …" for one group, editable inline
export function WeekFocusEditor({ groupId, monday, compact }: { groupId: string; monday: string; compact?: boolean }) {
  const { data, setWeekFocus } = useSchedule()
  const current = data.weekFocus.find(f => f.groupId === groupId && f.monday === monday)?.text ?? ''
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(current)

  if (editing) {
    const save = () => { setWeekFocus(groupId, monday, text); setEditing(false) }
    return (
      <form onSubmit={e => { e.preventDefault(); save() }} style={{ display: 'flex', gap: 6 }}>
        <input autoFocus aria-label="Veckans fokus" value={text} onChange={e => setText(e.target.value)} onBlur={save}
          placeholder="t.ex. framåtvarv, ansats" style={{ flex: 1, minWidth: 0, minHeight: 38, padding: '0 10px', borderRadius: 10, border: `1.5px solid ${UI.primary}`, fontFamily: 'inherit', fontSize: 13.5 }} />
      </form>
    )
  }

  return (
    <button onClick={() => { setText(current); setEditing(true) }} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: compact ? 32 : 38, padding: '0 10px', borderRadius: 10,
      border: current ? 'none' : `1px dashed ${UI.faint}`, background: current ? UI.primarySoft : 'transparent',
      color: current ? UI.primary : UI.muted, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left', maxWidth: '100%',
    }}>
      {current ? <Target size={14} aria-hidden /> : <Plus size={14} aria-hidden />}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current || 'Fokus för veckan'}</span>
    </button>
  )
}
