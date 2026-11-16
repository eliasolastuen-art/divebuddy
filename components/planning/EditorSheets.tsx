'use client'

import { useState } from 'react'
import type { EditorBlock, EditorItem } from '@/lib/library/trainingSave'
import { C, primaryButton } from '@/components/schedule/ui'
import BottomSheet, { fieldLabel, linkButton, pill, textInput } from './BottomSheet'

const HEIGHTS = ['1', '3', '5', '7,5', '10']

// What does not fit in the row: sets, height, note, duplicate, remove
export function ExerciseDetailSheet({ item, isCopy, onSave, onDuplicate, onRemove, onClose }: {
  item: EditorItem
  isCopy?: boolean // just duplicated: pick another height or number of sets
  onSave: (it: EditorItem) => void
  onDuplicate: (it: EditorItem) => void
  onRemove: () => void
  onClose: () => void
}) {
  const [sets, setSets] = useState(item.sets ?? 0)
  const [height, setHeight] = useState(item.height ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const current = (): EditorItem => ({ ...item, sets: sets || undefined, height: height.trim() || undefined, notes })
  const done = () => { onSave(current()); onClose() }
  const duplicate = () => { const it = current(); onSave(it); onDuplicate(it) }

  return (
    <BottomSheet title={item.custom_name || item.libraryItem?.name || 'Övning'} onClose={done}
      footer={<>
        <button type="button" onClick={done} style={primaryButton}>Klar</button>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          <button type="button" onClick={duplicate} style={linkButton}>Duplicera</button>
          <button type="button" onClick={() => { onRemove(); onClose() }} style={linkButton}>Ta bort övningen</button>
        </div>
      </>}>
      {isCopy && <p role="status" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>Kopia tillagd under originalet. Välj ny höjd eller antal set.</p>}
      <div style={fieldLabel}>
        Set
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" aria-label="Färre set" onClick={() => setSets(s => Math.max(0, s - 1))} style={stepBtn}>−</button>
          <span style={{ minWidth: 48, textAlign: 'center', fontSize: 18, fontWeight: 800, color: C.text }}>{sets || '–'}</span>
          <button type="button" aria-label="Fler set" onClick={() => setSets(s => s + 1)} style={stepBtn}>+</button>
        </div>
      </div>
      <div style={fieldLabel}>
        Höjd (meter)
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {HEIGHTS.map(h => (
            <button key={h} type="button" aria-pressed={height === h} onClick={() => setHeight(height === h ? '' : h)} style={pill(height === h)}>{h} m</button>
          ))}
        </div>
      </div>
      <label style={fieldLabel}>
        Anteckning
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...textInput, padding: '12px 14px', minHeight: 88, fontWeight: 500, resize: 'vertical' }} />
      </label>
    </BottomSheet>
  )
}

const stepBtn: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 12, border: '1px solid #C9D5E3', background: '#fff', fontSize: 22,
  fontWeight: 600, color: C.primary, cursor: 'pointer', fontFamily: 'inherit',
}

export type NewBlockKind = { kind: 'standard'; name: string } | { kind: 'test' } | { kind: 'athlete' }
const SUGGESTIONS = ['Uppvärmning', 'Land', 'Vatten', 'Styrka']

// "Nytt block" asks only for a name; test and athlete blocks are two extra choices
export function NewBlockSheet({ onCreate, onClose }: { onCreate: (k: NewBlockKind) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const create = (k: NewBlockKind) => { onCreate(k); onClose() }
  return (
    <BottomSheet title="Nytt block" onClose={onClose}
      footer={<button type="button" disabled={!name.trim()} onClick={() => create({ kind: 'standard', name: name.trim() })} style={{ ...primaryButton, opacity: name.trim() ? 1 : 0.5 }}>Lägg till block</button>}>
      <label style={fieldLabel}>
        Namn
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="T.ex. Hopp 3 m" style={{ ...textInput, fontWeight: 700 }} />
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SUGGESTIONS.map(s => <button key={s} type="button" onClick={() => setName(s)} style={pill(name === s)}>{s}</button>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
        <button type="button" onClick={() => create({ kind: 'test' })} style={linkButton}>+ Testblock</button>
        <button type="button" onClick={() => create({ kind: 'athlete' })} style={linkButton}>+ Atletblock (individuella hopp)</button>
      </div>
    </BottomSheet>
  )
}

// Rename or remove a block (tap on its heading)
export function BlockSheet({ block, onRename, onRemove, onClose }: {
  block: EditorBlock
  onRename: (name: string) => void
  onRemove: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(block.name)
  const done = () => { if (name.trim() && name.trim() !== block.name) onRename(name.trim()); onClose() }
  return (
    <BottomSheet title="Block" onClose={done}
      footer={<>
        <button type="button" onClick={done} style={primaryButton}>Klar</button>
        <button type="button" onClick={() => { onRemove(); onClose() }} style={{ ...linkButton, textAlign: 'center' }}>Ta bort blocket</button>
      </>}>
      <label style={fieldLabel}>
        Namn
        <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ ...textInput, fontWeight: 700 }} />
      </label>
      {block.items.length > 0 && <p style={{ margin: 0, fontSize: 14, color: C.muted }}>Blocket har {block.items.length} övningar. Tar du bort det försvinner de när du sparar.</p>}
    </BottomSheet>
  )
}
