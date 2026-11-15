'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Copy, LayoutTemplate, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { useSchedule } from '@/lib/schedule/store'
import { DAY_LONG, shortDate, timeText, UI, weekdayIndex } from '@/lib/schedule/format'
import { groupLabel } from '@/lib/schedule/select'
import { BLOCK_CATEGORIES, CATEGORY_BY_ID, cloneContent, emptyContent, findPreviousPlanned, hasContent, newId } from '@/lib/schedule/content'
import { fetchLibrary, fetchTemplates, type LibraryOption, type TemplateOption } from '@/lib/schedule/library'
import type { BlockCategory, PassBlock, PassContent } from '@/lib/schedule/types'
import Sheet, { Button, inputStyle } from './Sheet'

export default function PassPlanner({ passId, onClose }: { passId: string; onClose: () => void }) {
  const { data, saveContent, clearContent } = useSchedule()
  const pass = data.passes.find(p => p.id === passId)
  const [draft, setDraft] = useState<PassContent | null>(pass?.content ?? null)
  const [picking, setPicking] = useState<'none' | 'template'>('none')

  if (!pass) return null
  const previous = findPreviousPlanned(data, pass)

  const save = (status: 'draft' | 'planned') => {
    if (draft) saveContent(pass.id, draft, status)
    onClose()
  }

  const title = `${groupLabel(data, pass)} · ${timeText(pass)}`
  const subtitle = `${DAY_LONG[weekdayIndex(pass.date)]} ${shortDate(pass.date)} · ${pass.place || 'Plats ej satt'}`

  return (
    <Sheet title={title} subtitle={subtitle} onClose={onClose} zIndex={110}
      footer={draft ? (
        <>
          <Button variant="danger" onClick={() => { clearContent(pass.id); onClose() }}><Trash2 size={16} />Rensa</Button>
          <Button grow onClick={() => save('draft')}>Spara utkast</Button>
          <Button grow variant="primary" onClick={() => save('planned')} disabled={!hasContent(draft)}>Klart</Button>
        </>
      ) : undefined}>

      {!draft && picking === 'none' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, color: UI.muted }}>Hur vill du planera passet?</p>
          {previous && (
            <StartOption icon={<Copy size={20} />} title={`Kopiera från ${shortDate(previous.date)}`}
              text={`Samma tid och grupp förra gången · ${previous.content?.blocks.length ?? 0} block`}
              onClick={() => setDraft(cloneContent(previous.content!, `Kopierat från ${shortDate(previous.date)}`))} />
          )}
          <StartOption icon={<LayoutTemplate size={20} />} title="Från en mall" text="Använd ett sparat träningspass från biblioteket"
            onClick={() => setPicking('template')} />
          <StartOption icon={<PencilLine size={20} />} title="Bygg själv" text="Lägg till block och övningar från biblioteket"
            onClick={() => setDraft(emptyContent())} />
        </div>
      )}

      {!draft && picking === 'template' && (
        <TemplatePicker groupIds={pass.groupIds} onBack={() => setPicking('none')}
          onPick={t => setDraft(cloneContent(t.content, t.content.source))} />
      )}

      {draft && <ContentEditor content={draft} onChange={setDraft} />}
    </Sheet>
  )
}

function StartOption({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
      borderRadius: 16, border: '1px solid #E1E8F0', background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <span style={{ width: 44, height: 44, borderRadius: 13, background: UI.primarySoft, color: UI.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 800, color: UI.text }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: UI.muted, marginTop: 2 }}>{text}</span>
      </span>
    </button>
  )
}

// ── Templates (read from the club's training_templates) ────────────────────

function TemplatePicker({ groupIds, onPick, onBack }: { groupIds: string[]; onPick: (t: TemplateOption) => void; onBack: () => void }) {
  const [templates, setTemplates] = useState<TemplateOption[] | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    let alive = true
    fetchTemplates().then(t => { if (alive) setTemplates(t) })
    return () => { alive = false }
  }, [])

  const list = (templates ?? []).filter(t => t.name.toLowerCase().includes(q.toLowerCase()))
  // Templates for one of this pass's groups first
  list.sort((a, b) => Number(groupIds.includes(b.groupId ?? '')) - Number(groupIds.includes(a.groupId ?? '')))

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <SearchInput value={q} onChange={setQ} placeholder="Sök mall" />
      {templates === null && <p style={{ color: UI.muted, fontSize: 14 }}>Hämtar mallar…</p>}
      {templates !== null && list.length === 0 && (
        <p style={{ color: UI.muted, fontSize: 14 }}>
          {templates.length === 0 ? 'Det finns inga sparade mallar än. Spara ett pass som mall i passbyggaren, eller bygg passet själv.' : 'Ingen mall matchar sökningen.'}
        </p>
      )}
      {list.map(t => (
        <button key={t.id} onClick={() => onPick(t)} style={{ width: '100%', textAlign: 'left', minHeight: 52, padding: '10px 14px', borderRadius: 14, border: '1px solid #E1E8F0', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: UI.text }}>{t.name}</span>
          <span style={{ display: 'block', fontSize: 12.5, color: UI.muted }}>
            {t.blockCount} block · {t.content.blocks.map(b => CATEGORY_BY_ID[b.category]?.label).filter(Boolean).join(', ')}
          </span>
        </button>
      ))}
      <Button variant="ghost" onClick={onBack}>Tillbaka</Button>
    </div>
  )
}

// ── Editor ─────────────────────────────────────────────────────────────────

function ContentEditor({ content, onChange }: { content: PassContent; onChange: (c: PassContent) => void }) {
  const [library, setLibrary] = useState<LibraryOption[]>([])

  useEffect(() => {
    let alive = true
    fetchLibrary().then(l => { if (alive) setLibrary(l) })
    return () => { alive = false }
  }, [])

  const setBlock = (id: string, patch: Partial<PassBlock>) =>
    onChange({ ...content, blocks: content.blocks.map(b => (b.id === id ? { ...b, ...patch } : b)) })
  const removeBlock = (id: string) => onChange({ ...content, blocks: content.blocks.filter(b => b.id !== id) })
  const addBlock = (category: BlockCategory) =>
    onChange({ ...content, blocks: [...content.blocks, { id: newId(), category, name: CATEGORY_BY_ID[category].label, items: [] }] })

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ fontSize: 12.5, color: UI.muted }}>{content.source}</div>

      {content.blocks.map(b => (
        <BlockCard key={b.id} block={b} library={library}
          onChange={patch => setBlock(b.id, patch)} onRemove={() => removeBlock(b.id)} />
      ))}

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: UI.muted, marginBottom: 6 }}>Lägg till block</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {BLOCK_CATEGORIES.map(c => (
            <button key={c.id} onClick={() => addBlock(c.id)} style={{ minHeight: 40, padding: '0 12px', borderRadius: 999, border: `1.5px dashed ${c.color}`, background: '#fff', color: c.color, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Plus size={14} />{c.label}
            </button>
          ))}
        </div>
      </div>

      <label style={{ display: 'grid', gap: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: UI.muted }}>Anteckningar till passet</span>
        <textarea value={content.notes} onChange={e => onChange({ ...content, notes: e.target.value })} rows={3}
          placeholder="Fokus, upplägg, vad som ska följas upp…"
          style={{ ...inputStyle, minHeight: 84, padding: '10px 12px', resize: 'vertical' }} />
      </label>
    </div>
  )
}

function BlockCard({ block, library, onChange, onRemove }: {
  block: PassBlock
  library: LibraryOption[]
  onChange: (patch: Partial<PassBlock>) => void
  onRemove: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState('')
  const cat = CATEGORY_BY_ID[block.category]

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return library.filter(l => l.name.toLowerCase().includes(s) || l.code.toLowerCase().includes(s)).slice(0, 8)
  }, [q, library])

  const addItem = (name: string, libraryItemId: string | null) => {
    onChange({ items: [...block.items, { id: newId(), libraryItemId, name, sets: null, reps: null, notes: '' }] })
    setQ('')
  }

  return (
    <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #E1E8F0', borderLeft: `4px solid ${cat.color}`, padding: 12, display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: cat.color, flexShrink: 0 }}>{cat.label}</span>
        <input aria-label="Blockets namn" value={block.name} onChange={e => onChange({ name: e.target.value })}
          style={{ ...inputStyle, minHeight: 38, fontWeight: 700, flex: 1 }} />
        <button onClick={onRemove} aria-label="Ta bort block" style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, border: '1px solid #FECACA', background: '#fff', color: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Trash2 size={15} />
        </button>
      </div>

      {block.items.map(it => (
        <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: UI.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            {it.libraryItemId && <BookOpen size={13} color={UI.faint} aria-label="Från biblioteket" />}{it.name}
          </span>
          <input aria-label={`Set för ${it.name}`} inputMode="numeric" placeholder="set" value={it.sets ?? ''}
            onChange={e => onChange({ items: block.items.map(x => (x.id === it.id ? { ...x, sets: e.target.value ? Number(e.target.value) || null : null } : x)) })}
            style={{ ...inputStyle, width: 54, minHeight: 36, padding: '0 6px', textAlign: 'center', fontSize: 14 }} />
          <span aria-hidden style={{ color: UI.faint }}>×</span>
          <input aria-label={`Repetitioner för ${it.name}`} inputMode="numeric" placeholder="rep" value={it.reps ?? ''}
            onChange={e => onChange({ items: block.items.map(x => (x.id === it.id ? { ...x, reps: e.target.value ? Number(e.target.value) || null : null } : x)) })}
            style={{ ...inputStyle, width: 54, minHeight: 36, padding: '0 6px', textAlign: 'center', fontSize: 14 }} />
          <button onClick={() => onChange({ items: block.items.filter(x => x.id !== it.id) })} aria-label={`Ta bort ${it.name}`}
            style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, border: 'none', background: 'transparent', color: UI.faint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {adding ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <SearchInput value={q} onChange={setQ} placeholder="Sök i biblioteket eller skriv egen övning" autoFocus />
          {matches.map(m => (
            <button key={m.id} onClick={() => addItem(m.name, m.id)} style={{ textAlign: 'left', minHeight: 40, padding: '6px 10px', borderRadius: 10, border: '1px solid #E1E8F0', background: '#EEF3F8', fontFamily: 'inherit', cursor: 'pointer', fontSize: 14 }}>
              <strong>{m.name}</strong>{m.code && <span style={{ color: UI.muted }}> · {m.code}</span>}{m.category && <span style={{ color: UI.muted }}> · {m.category}</span>}
            </button>
          ))}
          {q.trim() && (
            <button onClick={() => addItem(q.trim(), null)} style={{ textAlign: 'left', minHeight: 40, padding: '6px 10px', borderRadius: 10, border: `1px dashed ${UI.primary}`, background: '#fff', fontFamily: 'inherit', cursor: 'pointer', fontSize: 14, color: UI.primary, fontWeight: 700 }}>
              + Lägg till ”{q.trim()}” som egen övning
            </button>
          )}
          <Button variant="ghost" onClick={() => { setAdding(false); setQ('') }}>Klar</Button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ justifySelf: 'start', minHeight: 38, padding: '0 10px', borderRadius: 10, border: 'none', background: UI.primarySoft, color: UI.primary, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={14} />Övning
        </button>
      )}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  return (
    <div style={{ position: 'relative' }}>
      <Search size={16} color={UI.faint} style={{ position: 'absolute', left: 12, top: 14 }} aria-hidden />
      <input type="search" aria-label={placeholder} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
        style={{ ...inputStyle, paddingLeft: 36 }} />
    </div>
  )
}
