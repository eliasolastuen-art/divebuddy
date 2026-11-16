'use client'

import { isTimeMode, switchMode, step, type EditorBlock, type EditorItem } from '@/lib/library/trainingSave'
import { C } from '@/components/schedule/ui'

// Design screen 8: a block is a heading + one white card with a row per exercise:
// name, "Byt till tid" / "Byt till antal", and − value + with the unit below.

export interface RowContext {
  unitFor: (it: EditorItem) => 'hopp' | 'st'
  defaultReps: (it: EditorItem) => number
}

const stepper: React.CSSProperties = {
  width: 44, height: 44, flex: 'none', borderRadius: 12, border: '1px solid #C9D5E3', background: '#fff',
  fontSize: 22, fontWeight: 600, color: C.primary, padding: 0, cursor: 'pointer', fontFamily: 'inherit',
}

export function ExerciseRow({ item, ctx, onChange, onOpen }: {
  item: EditorItem
  ctx: RowContext
  onChange: (it: EditorItem) => void
  onOpen: () => void
}) {
  const time = isTimeMode(item)
  const value = time ? Math.round((item.duration_seconds ?? 0) / 60) : item.reps ?? 0
  const unit = time ? 'min' : ctx.unitFor(item)
  const name = item.custom_name || item.libraryItem?.name || 'Övning'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.line}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <button type="button" onClick={onOpen} style={{ display: 'block', width: '100%', minHeight: 28, border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: C.text, textAlign: 'left', cursor: 'pointer' }}>
          {name}{item.sets ? <span style={{ color: C.muted, fontWeight: 600 }}> · {item.sets} set</span> : null}{item.height ? <span style={{ color: C.muted, fontWeight: 600 }}> · {item.height} m</span> : null}
        </button>
        <button type="button" onClick={() => onChange(switchMode(item, ctx.defaultReps(item)))} style={{ minHeight: 28, border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: C.primary, textAlign: 'left', cursor: 'pointer' }}>
          {time ? 'Byt till antal' : 'Byt till tid'}
        </button>
      </div>
      <button type="button" onClick={() => onChange(step(item, -1))} aria-label={`Minska ${name}`} style={stepper}>−</button>
      <span style={{ width: 40, flex: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{unit}</span>
      </span>
      <button type="button" onClick={() => onChange(step(item, 1))} aria-label={`Öka ${name}`} style={stepper}>+</button>
    </div>
  )
}

export default function BlockCard({ block, ctx, onChangeItem, onOpenItem, onAdd, onOpenBlock, children }: {
  block: EditorBlock
  ctx: RowContext
  onChangeItem: (it: EditorItem) => void
  onOpenItem: (it: EditorItem) => void
  onAdd: () => void
  onOpenBlock: () => void
  children?: React.ReactNode // athlete blocks render their own editor
}) {
  const tag = block.block_type === 'test' ? 'Test' : block.block_type === 'athlete' ? 'Atleter' : null
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button type="button" onClick={onOpenBlock} style={{ alignSelf: 'flex-start', minHeight: 32, border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', color: C.text }}>
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>{block.name || 'Block'}</span>
        {tag && <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}> · {tag}</span>}
      </button>
      <div style={{ borderRadius: 18, background: '#fff', border: `1px solid ${C.line}`, padding: children ? 12 : '0 8px 0 16px' }}>
        {children ?? (
          <>
            {block.items.map(it => (
              <ExerciseRow key={it.id} item={it} ctx={ctx} onChange={onChangeItem} onOpen={() => onOpenItem(it)} />
            ))}
            {block.block_type === 'test' && block.items.length === 0 && (
              <p style={{ margin: 0, padding: '14px 0', fontSize: 14, color: C.muted, borderBottom: `1px solid ${C.line}` }}>Poäng registreras per atlet under passet.</p>
            )}
            <button type="button" onClick={onAdd} style={{ display: 'flex', alignItems: 'center', minHeight: 48, width: '100%', border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: C.primary, cursor: 'pointer' }}>
              + Lägg till övningar
            </button>
          </>
        )}
      </div>
    </section>
  )
}
