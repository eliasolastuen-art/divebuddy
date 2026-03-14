'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlanningFolder, BlockCategory } from '@/types'
import { X, Check, Search, ChevronUp, ChevronDown, Plus, Trash2, Bookmark, LayoutList } from 'lucide-react'
import { MOCK_SESSION } from '@/lib/context/session'

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOCK_CATEGORIES = [
  { id: 'vatten'      as BlockCategory, label: 'Vatten',      emoji: '💧', color: '#0D7377' },
  { id: 'land'        as BlockCategory, label: 'Land',        emoji: '🏃', color: '#D4A017' },
  { id: 'styrka'      as BlockCategory, label: 'Styrka',      emoji: '💪', color: '#DC2626' },
  { id: 'rorlighet'   as BlockCategory, label: 'Rörlighet',   emoji: '🧘', color: '#16A34A' },
  { id: 'uppvarmning' as BlockCategory, label: 'Uppvärmning', emoji: '🔥', color: '#F97316' },
  { id: 'tavling'     as BlockCategory, label: 'Tävling',     emoji: '🏆', color: '#6366F1' },
]

const CAT_BY_ID = Object.fromEntries(BLOCK_CATEGORIES.map(c => [c.id, c]))

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlockItem {
  id: string
  library_item_id?: string
  custom_name: string
  sets?: number
  reps?: number
  height?: string
  duration_seconds?: number
  notes: string
  isFromLibrary: boolean
  libraryItem?: any
}

interface Block {
  id: string
  category: BlockCategory
  name: string
  notes: string
  items: BlockItem[]
}

interface PickerItem {
  id: string
  name: string
  codeLabel: string
  category_name: string | null
  category_id: string | null
  dd?: number
  type: string
}

interface BlockTemplate {
  id: string
  name: string
  category: string | null
  items: {
    id: string
    library_item_id: string | null
    library_item?: any
    custom_name: string | null
    sets?: number
    reps?: number
    height?: string
    duration_seconds?: number
    notes?: string
    order_index: number
  }[]
}

function genId() { return Math.random().toString(36).slice(2) }

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrainingBuilder({ folders, onClose, onSaved, existingTraining, existingBlocks }: {
  folders: PlanningFolder[]
  onClose: () => void
  onSaved: () => void
  existingTraining?: any
  existingBlocks?: any[]
}) {
  const supabase = createClient()

  // Session fields
  const [title, setTitle]       = useState('')
  const [date, setDate]         = useState('')
  const [folderId, setFolderId] = useState('')
  const [status, setStatus]     = useState<'draft' | 'published'>('draft')
  const [blocks, setBlocks]     = useState<Block[]>([])
  const [saving, setSaving]     = useState(false)

  // Library picker
  const [pickerBlockId, setPickerBlockId]       = useState<string | null>(null)
  const [pickerItems, setPickerItems]           = useState<PickerItem[]>([])
  const [pickerGroups, setPickerGroups]         = useState<{ key: string; label: string; items: PickerItem[] }[]>([])
  const [pickerSearch, setPickerSearch]         = useState('')
  const [pickerCategory, setPickerCategory]     = useState<string>('all')
  const [pickerCategories, setPickerCategories] = useState<{ id: string; name: string }[]>([])

  // Block picker
  const [showBlockPicker, setShowBlockPicker]   = useState(false)
  const [blockPickerTab, setBlockPickerTab]     = useState<'new' | 'template'>('new')
  const [templates, setTemplates]               = useState<BlockTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // ── Load initial data ──────────────────────────────────────────────────────

  useEffect(() => {
    // Load library items with category info
    supabase
      .from('library_items')
      .select('id, name, code, group_name, type, dd, category_id, categories(id, name, sort_order)')
      .eq('archived', false)
      .order('code', { ascending: true })
      .order('name')
      .then(({ data }) => {
        const items: PickerItem[] = (data || []).map((it: any) => ({
          id: it.id,
          name: it.name,
          codeLabel: it.code && it.group_name ? `${it.code}${it.group_name}` : it.code ?? '',
          category_name: it.categories?.name ?? null,
          category_id: it.category_id ?? null,
          dd: it.dd ?? undefined,
          type: it.type,
        }))
        setPickerItems(items)
      })

    // Load categories for picker chips
    supabase.from('categories').select('id, name').order('sort_order')
      .then(({ data }) => { if (data) setPickerCategories(data) })

    // Pre-fill existing session
    if (existingTraining) {
      setTitle(existingTraining.title || '')
      setDate(existingTraining.scheduled_date || '')
      setFolderId(existingTraining.folder_id || '')
      setStatus(existingTraining.status === 'published' ? 'published' : 'draft')
    }
    if (existingBlocks && existingBlocks.length > 0) {
      setBlocks(existingBlocks.map(b => ({
        id: b.id,
        category: b.category,
        name: b.name,
        notes: b.notes || '',
        items: (b.items || []).map((item: any) => ({
          id: item.id,
          library_item_id: item.library_item_id,
          custom_name: item.custom_name || item.library_item?.name || '',
          sets: item.sets,
          reps: item.reps,
          height: item.height,
          duration_seconds: item.duration_seconds,
          notes: item.notes || '',
          isFromLibrary: !!item.library_item_id,
          libraryItem: item.library_item,
        }))
      })))
    }
  }, [])

  // ── Picker filtering ───────────────────────────────────────────────────────

  const filteredPickerItems = pickerItems.filter(it => {
    const q = pickerSearch.toLowerCase()
    const matchSearch = !q ||
      it.name.toLowerCase().includes(q) ||
      it.codeLabel.toLowerCase().includes(q)
    const matchCat = pickerCategory === 'all' ||
      (pickerCategory === '__uncategorized__' ? !it.category_id : it.category_id === pickerCategory)
    return matchSearch && matchCat
  })

  const groupedPickerItems = (() => {
    if (pickerCategory !== 'all') return null
    const map: Record<string, { label: string; items: PickerItem[] }> = {}
    for (const it of filteredPickerItems) {
      const key = it.category_id ?? '__uncategorized__'
      const label = it.category_name ?? 'Övriga'
      if (!map[key]) map[key] = { label, items: [] }
      map[key].items.push(it)
    }
    // Sort groups: categorized first by sort_order, then uncategorized
    const catOrder = pickerCategories.map(c => c.id)
    return Object.entries(map).sort(([a], [b]) => {
      if (a === '__uncategorized__') return 1
      if (b === '__uncategorized__') return -1
      return catOrder.indexOf(a) - catOrder.indexOf(b)
    })
  })()

  // ── Block helpers ──────────────────────────────────────────────────────────

  const addBlock = (category: BlockCategory) => {
    const cat = CAT_BY_ID[category]!
    setBlocks(b => [...b, { id: genId(), category, name: cat.label, notes: '', items: [] }])
    setShowBlockPicker(false)
  }

  const addBlockFromTemplate = (template: BlockTemplate) => {
    const category = (template.category as BlockCategory) || 'vatten'
    const newBlock: Block = {
      id: genId(),
      category,
      name: template.name,
      notes: '',
      items: template.items.map(ti => ({
        id: genId(),
        library_item_id: ti.library_item_id ?? undefined,
        custom_name: ti.library_item?.name || ti.custom_name || '',
        sets: ti.sets ?? undefined,
        reps: ti.reps ?? undefined,
        height: ti.height ?? undefined,
        duration_seconds: ti.duration_seconds ?? undefined,
        notes: ti.notes || '',
        isFromLibrary: !!ti.library_item_id,
        libraryItem: ti.library_item,
      }))
    }
    setBlocks(b => [...b, newBlock])
    setShowBlockPicker(false)
  }

  const removeBlock = (id: string) => setBlocks(b => b.filter(b2 => b2.id !== id))

  const updateBlock = (id: string, field: string, val: string) =>
    setBlocks(b => b.map(block => block.id === id ? { ...block, [field]: val } : block))

  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    setBlocks(next)
  }

  const saveBlockAsTemplate = async (block: Block) => {
    const { data: tmpl } = await supabase
      .from('block_templates')
      .insert({ name: block.name, category: block.category })
      .select()
      .single()
    if (!tmpl) return
    for (let i = 0; i < block.items.length; i++) {
      const it = block.items[i]
      await supabase.from('block_template_items').insert({
        template_id: tmpl.id,
        library_item_id: it.library_item_id ?? null,
        custom_name: it.isFromLibrary ? null : it.custom_name || null,
        sets: it.sets ?? null,
        reps: it.reps ?? null,
        height: it.height ?? null,
        duration_seconds: it.duration_seconds ?? null,
        notes: it.notes || null,
        order_index: i,
      })
    }
  }

  // ── Item helpers ───────────────────────────────────────────────────────────

  const addItemFromLibrary = (blockId: string, item: PickerItem) => {
    setBlocks(b => b.map(block => block.id !== blockId ? block : {
      ...block,
      items: [...block.items, {
        id: genId(),
        library_item_id: item.id,
        custom_name: item.name,
        reps: undefined,
        sets: undefined,
        height: undefined,
        duration_seconds: undefined,
        notes: '',
        isFromLibrary: true,
        libraryItem: { id: item.id, name: item.name, dd: item.dd, type: item.type },
      }]
    }))
    setPickerBlockId(null)
    setPickerSearch('')
  }

  const addCustomItem = (blockId: string) => {
    setBlocks(b => b.map(block => block.id !== blockId ? block : {
      ...block,
      items: [...block.items, { id: genId(), custom_name: '', sets: undefined, reps: undefined, height: undefined, duration_seconds: undefined, notes: '', isFromLibrary: false }]
    }))
    setPickerBlockId(null)
  }

  const updateItem = (blockId: string, itemId: string, field: string, val: any) =>
    setBlocks(b => b.map(block => block.id !== blockId ? block : {
      ...block,
      items: block.items.map(item => item.id !== itemId ? item : { ...item, [field]: val })
    }))

  const removeItem = (blockId: string, itemId: string) =>
    setBlocks(b => b.map(block => block.id !== blockId ? block : {
      ...block, items: block.items.filter(i => i.id !== itemId)
    }))

  const moveItem = (blockId: string, i: number, dir: -1 | 1) => {
    setBlocks(b => b.map(block => {
      if (block.id !== blockId) return block
      const items = [...block.items]
      const j = i + dir
      if (j < 0 || j >= items.length) return block
      ;[items[i], items[j]] = [items[j], items[i]]
      return { ...block, items }
    }))
  }

  // ── Templates loader ───────────────────────────────────────────────────────

  const loadTemplates = async () => {
    setLoadingTemplates(true)
    const { data } = await supabase
      .from('block_templates')
      .select('id, name, category, block_template_items(id, library_item_id, custom_name, sets, reps, height, duration_seconds, notes, order_index, library_item:library_items(id, name, dd, type))')
      .order('created_at', { ascending: false })
    if (data) {
      setTemplates(data.map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        items: (t.block_template_items || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((ti: any) => ({ ...ti, library_item: ti.library_item ?? undefined })),
      })))
    }
    setLoadingTemplates(false)
  }

  // ── Save session ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)

    const trainingData = {
      title: title.trim(),
      folder_id: folderId || null,
      scheduled_date: date || null,
      status,
    }

    let trainingId: string

    if (existingTraining) {
      await supabase.from('trainings').update(trainingData).eq('id', existingTraining.id)
      trainingId = existingTraining.id
      const { data: oldBlocks } = await supabase.from('training_blocks').select('id').eq('training_id', trainingId)
      if (oldBlocks) {
        for (const ob of oldBlocks) {
          await supabase.from('training_block_items').delete().eq('block_id', ob.id)
        }
        await supabase.from('training_blocks').delete().eq('training_id', trainingId)
      }
    } else {
      const { data: training } = await supabase.from('trainings').insert({
        club_id: MOCK_SESSION.clubId,
        training_type: 'training',
        ...trainingData,
      }).select().single()
      if (!training) { setSaving(false); return }
      trainingId = training.id
    }

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const { data: savedBlock } = await supabase.from('training_blocks').insert({
        training_id: trainingId,
        category: block.category,
        name: block.name,
        notes: block.notes || null,
        sort_order: i,
        block_type: 'standard',
      }).select().single()

      if (savedBlock) {
        for (let j = 0; j < block.items.length; j++) {
          const item = block.items[j]
          await supabase.from('training_block_items').insert({
            block_id: savedBlock.id,
            library_item_id: item.library_item_id || null,
            custom_name: item.isFromLibrary ? null : item.custom_name || null,
            sets: item.sets || null,
            reps: item.reps || null,
            height: item.height || null,
            duration_seconds: item.duration_seconds ?? null,
            notes: item.notes || null,
            sort_order: j,
          })
        }
      }
    }

    setSaving(false)
    onSaved()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 200, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 201,
        background: 'var(--surface-bg)',
        backgroundImage: 'radial-gradient(ellipse at 20% 0%, rgba(13,115,119,0.06) 0%, transparent 60%)',
        overflowY: 'auto',
      }}>
        {/* Top bar */}
        <div className="glass-nav" style={{
          position: 'sticky', top: 0, zIndex: 10,
          padding: '0 16px', height: 56,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 10, padding: '7px 12px', fontSize: 14, fontWeight: 600, color: '#64748B', cursor: 'pointer' }}>
            <X size={14} strokeWidth={2.5} /> Avbryt
          </button>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {existingTraining ? 'Redigera pass' : 'Nytt träningspass'}
          </span>
          <button onClick={handleSave} disabled={saving || !title.trim()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: title.trim() ? 'linear-gradient(135deg, #0D7377, #0a5c60)' : 'rgba(0,0,0,0.08)', color: title.trim() ? 'white' : '#94A3B8', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 14, fontWeight: 700, cursor: title.trim() ? 'pointer' : 'default', boxShadow: title.trim() ? '0 2px 8px rgba(13,115,119,0.3)' : 'none', transition: 'all 0.15s ease' }}>
            <Check size={14} strokeWidth={2.5} />
            {saving ? '...' : 'Spara'}
          </button>
        </div>

        <div style={{ padding: '20px 16px 120px', maxWidth: 520, margin: '0 auto' }}>

          {/* Session info */}
          <div className="glass-card" style={{ padding: '20px 18px', marginBottom: 16 }}>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Namn på träningspasset..."
              style={{ width: '100%', fontSize: 22, fontWeight: 800, color: '#0F172A', border: 'none', outline: 'none', background: 'none', marginBottom: 18, letterSpacing: '-0.03em' }}
              autoFocus
            />
            <div style={{ display: 'grid', gridTemplateColumns: folders.length > 0 ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div className="text-label" style={{ marginBottom: 6 }}>Datum</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="glass-input" style={{ width: '100%', padding: '10px 12px', fontSize: 14 }} />
              </div>
              {folders.length > 0 && (
                <div>
                  <div className="text-label" style={{ marginBottom: 6 }}>Mapp</div>
                  <select value={folderId} onChange={e => setFolderId(e.target.value)} className="glass-input" style={{ width: '100%', padding: '10px 12px', fontSize: 14, cursor: 'pointer' }}>
                    <option value="">Ingen mapp</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: 4, borderRadius: 12, gap: 4 }}>
              {(['draft', 'published'] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: status === s ? (s === 'published' ? 'linear-gradient(135deg, #0D7377, #0a5c60)' : 'white') : 'transparent', color: status === s ? (s === 'published' ? 'white' : '#0F172A') : '#94A3B8', boxShadow: status === s ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s ease' }}>
                  {s === 'draft' ? '📝 Utkast' : '✅ Publicera'}
                </button>
              ))}
            </div>
          </div>

          {/* Blocks */}
          {blocks.map((block, blockIdx) => {
            const cat = CAT_BY_ID[block.category] || { color: '#64748B', emoji: '📋', label: block.name }
            return (
              <div key={block.id} className="glass-card" style={{ marginBottom: 14, overflow: 'hidden', padding: 0 }}>
                {/* Block header */}
                <div style={{ background: `linear-gradient(135deg, ${cat.color}ee, ${cat.color}aa)`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                  <input value={block.name} onChange={e => updateBlock(block.id, 'name', e.target.value)} style={{ fontSize: 15, fontWeight: 700, color: 'white', background: 'transparent', border: 'none', outline: 'none', flex: 1 }} />

                  {/* Reorder */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <button onClick={() => moveBlock(blockIdx, -1)} disabled={blockIdx === 0} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 5, width: 22, height: 18, cursor: blockIdx === 0 ? 'default' : 'pointer', opacity: blockIdx === 0 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChevronUp size={11} strokeWidth={3} color="white" />
                    </button>
                    <button onClick={() => moveBlock(blockIdx, 1)} disabled={blockIdx === blocks.length - 1} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 5, width: 22, height: 18, cursor: blockIdx === blocks.length - 1 ? 'default' : 'pointer', opacity: blockIdx === blocks.length - 1 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChevronDown size={11} strokeWidth={3} color="white" />
                    </button>
                  </div>

                  {/* Save as template */}
                  <button
                    onClick={() => saveBlockAsTemplate(block)}
                    title="Spara som mall"
                    style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Bookmark size={13} strokeWidth={2.5} color="white" />
                  </button>

                  {/* Remove block */}
                  <button onClick={() => removeBlock(block.id)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={13} strokeWidth={2.5} color="white" />
                  </button>
                </div>

                <div style={{ padding: '14px 16px' }}>
                  {block.items.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '10px 0', color: '#94A3B8', fontSize: 13 }}>Inga övningar ännu</div>
                  )}

                  {block.items.map((item, ii) => (
                    <div key={item.id} style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 14, padding: '12px 14px', marginBottom: ii < block.items.length - 1 ? 8 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {item.isFromLibrary ? (
                            <div>
                              {item.libraryItem?.code && (
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#0D7377', letterSpacing: '0.06em', marginBottom: 2 }}>
                                  {item.libraryItem.code}{item.libraryItem.group_name || ''}
                                </div>
                              )}
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{item.libraryItem?.name || item.custom_name}</div>
                            </div>
                          ) : (
                            <input value={item.custom_name} onChange={e => updateItem(block.id, item.id, 'custom_name', e.target.value)} placeholder="Namn på övning..." style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', border: 'none', borderBottom: '1.5px solid rgba(0,0,0,0.1)', outline: 'none', width: '100%', paddingBottom: 4, background: 'transparent' }} />
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                          {/* Item reorder */}
                          <button onClick={() => moveItem(block.id, ii, -1)} disabled={ii === 0} style={{ background: 'none', border: 'none', cursor: ii === 0 ? 'default' : 'pointer', opacity: ii === 0 ? 0.3 : 0.6, padding: 3, display: 'flex' }}>
                            <ChevronUp size={13} color="#64748B" strokeWidth={2.5} />
                          </button>
                          <button onClick={() => moveItem(block.id, ii, 1)} disabled={ii === block.items.length - 1} style={{ background: 'none', border: 'none', cursor: ii === block.items.length - 1 ? 'default' : 'pointer', opacity: ii === block.items.length - 1 ? 0.3 : 0.6, padding: 3, display: 'flex' }}>
                            <ChevronDown size={13} color="#64748B" strokeWidth={2.5} />
                          </button>
                          <button onClick={() => removeItem(block.id, item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, display: 'flex' }}>
                            <Trash2 size={13} color="#CBD5E1" strokeWidth={2} />
                          </button>
                        </div>
                      </div>

                      {/* Sets / Reps / Höjd / Tid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.4fr', gap: 6 }}>
                        {([
                          { field: 'sets',   label: 'Set',  type: 'number', placeholder: '–' },
                          { field: 'reps',   label: 'Reps', type: 'number', placeholder: '–' },
                          { field: 'height', label: 'Höjd', type: 'text',   placeholder: '3m' },
                        ] as const).map(({ field, label, type, placeholder }) => (
                          <div key={field}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4, textAlign: 'center', letterSpacing: '0.05em' }}>{label}</div>
                            <input
                              type={type}
                              min={type === 'number' ? 1 : undefined}
                              value={(item as any)[field] ?? ''}
                              onChange={e => {
                                const val = type === 'number'
                                  ? (e.target.value ? parseInt(e.target.value) : undefined)
                                  : (e.target.value || undefined)
                                updateItem(block.id, item.id, field, val)
                              }}
                              placeholder={placeholder}
                              className="glass-input"
                              style={{ width: '100%', padding: '8px 4px', fontSize: 15, fontWeight: 600, textAlign: 'center', borderRadius: 10 }}
                            />
                          </div>
                        ))}
                        {/* Time: min:sec */}
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4, textAlign: 'center', letterSpacing: '0.05em' }}>Tid</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <input
                              type="number"
                              min={0}
                              value={item.duration_seconds != null ? Math.floor(item.duration_seconds / 60) : ''}
                              onChange={e => {
                                const mins = e.target.value ? parseInt(e.target.value) : 0
                                const secs = item.duration_seconds != null ? item.duration_seconds % 60 : 0
                                const total = mins * 60 + secs
                                updateItem(block.id, item.id, 'duration_seconds', total || undefined)
                              }}
                              placeholder="00"
                              className="glass-input"
                              style={{ width: '100%', padding: '8px 2px', fontSize: 15, fontWeight: 600, textAlign: 'center', borderRadius: 10 }}
                            />
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8', flexShrink: 0 }}>:</span>
                            <input
                              type="number"
                              min={0}
                              max={59}
                              value={item.duration_seconds != null ? item.duration_seconds % 60 : ''}
                              onChange={e => {
                                const secs = e.target.value ? Math.min(59, parseInt(e.target.value)) : 0
                                const mins = item.duration_seconds != null ? Math.floor(item.duration_seconds / 60) : 0
                                const total = mins * 60 + secs
                                updateItem(block.id, item.id, 'duration_seconds', total || undefined)
                              }}
                              placeholder="00"
                              className="glass-input"
                              style={{ width: '100%', padding: '8px 2px', fontSize: 15, fontWeight: 600, textAlign: 'center', borderRadius: 10 }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add exercise row */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => { setPickerBlockId(block.id); setPickerSearch(''); setPickerCategory('all') }} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1.5px dashed rgba(13,115,119,0.4)', background: 'rgba(13,115,119,0.06)', fontSize: 13, fontWeight: 600, color: '#0D7377', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Search size={13} /> Från bibliotek
                    </button>
                    <button onClick={() => addCustomItem(block.id)} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1.5px dashed rgba(0,0,0,0.1)', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Plus size={13} /> Egen övning
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add block button */}
          <button onClick={() => { setShowBlockPicker(true); setBlockPickerTab('new') }} style={{ width: '100%', padding: '16px', borderRadius: 16, border: '2px dashed rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', fontSize: 15, fontWeight: 600, color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={16} strokeWidth={2.5} /> Lägg till block
          </button>
        </div>

        {/* ── Block picker modal ─────────────────────────────────────────── */}
        {showBlockPicker && (
          <>
            <div onClick={() => setShowBlockPicker(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 300 }} />
            <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301, padding: '16px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />

              {/* Tabs */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: 4, borderRadius: 12, gap: 4, marginBottom: 20 }}>
                {([['new', '➕ Nytt block'], ['template', '📋 Från mall']] as const).map(([tab, label]) => (
                  <button key={tab} onClick={() => { setBlockPickerTab(tab); if (tab === 'template') loadTemplates() }} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: blockPickerTab === tab ? 'white' : 'transparent', color: blockPickerTab === tab ? '#0F172A' : '#94A3B8', boxShadow: blockPickerTab === tab ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s ease' }}>
                    {label}
                  </button>
                ))}
              </div>

              {blockPickerTab === 'new' ? (
                <>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#64748B', marginBottom: 14, textAlign: 'center' }}>Välj kategori</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {BLOCK_CATEGORIES.map(cat => (
                      <button key={cat.id} onClick={() => addBlock(cat.id)} style={{ padding: '18px 8px', borderRadius: 18, border: `1.5px solid ${cat.color}30`, background: `${cat.color}0d`, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease' }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{cat.emoji}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{cat.label}</div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div>
                  {loadingTemplates ? (
                    <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8', fontSize: 14 }}>Laddar mallar...</div>
                  ) : templates.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(13,115,119,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <LayoutList size={22} color="#0D7377" strokeWidth={1.5} />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Inga mallar än</p>
                      <p style={{ fontSize: 13, color: '#94A3B8' }}>Spara ett block som mall med 🔖</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {templates.map(tmpl => {
                        const cat = CAT_BY_ID[tmpl.category as BlockCategory] || { color: '#64748B', emoji: '📋' }
                        return (
                          <button key={tmpl.id} onClick={() => addBlockFromTemplate(tmpl)} className="glass-card" style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 16, border: 'none', cursor: 'pointer', borderLeft: `3px solid ${cat.color}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                              <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{tmpl.name}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                              {tmpl.items.length} övning{tmpl.items.length !== 1 ? 'ar' : ''}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Library picker modal ───────────────────────────────────────── */}
        {pickerBlockId && (
          <>
            <div onClick={() => setPickerBlockId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 300 }} />
            <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301, maxHeight: '84vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px 10px', flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 16px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>Välj övning</h3>
                  <button onClick={() => setPickerBlockId(null)} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={14} color="#64748B" strokeWidth={2.5} />
                  </button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <Search size={14} color="#94A3B8" strokeWidth={2} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder="Sök på namn eller kod..." className="glass-input" style={{ width: '100%', padding: '11px 14px 11px 34px', fontSize: 14 }} autoFocus />
                </div>

                {/* Category chips */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                  <button onClick={() => setPickerCategory('all')} className={pickerCategory === 'all' ? 'chip chip-active' : 'chip chip-inactive'} style={{ flexShrink: 0 }}>Alla</button>
                  {pickerCategories.map(cat => (
                    <button key={cat.id} onClick={() => setPickerCategory(cat.id)} className={pickerCategory === cat.id ? 'chip chip-active' : 'chip chip-inactive'} style={{ flexShrink: 0 }}>{cat.name}</button>
                  ))}
                </div>
              </div>

              {/* Items list */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '4px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
                {filteredPickerItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 14 }}>Inga övningar</div>
                ) : pickerCategory !== 'all' || pickerSearch.trim() ? (
                  // Flat list when filtering
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filteredPickerItems.map(item => (
                      <PickerItemRow key={item.id} item={item} onSelect={() => addItemFromLibrary(pickerBlockId, item)} />
                    ))}
                  </div>
                ) : (
                  // Grouped when showing all
                  groupedPickerItems?.map(([key, group]) => (
                    <div key={key} style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{group.label}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {group.items.map(item => (
                          <PickerItemRow key={item.id} item={item} onSelect={() => addItemFromLibrary(pickerBlockId, item)} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── PickerItemRow ─────────────────────────────────────────────────────────────

function PickerItemRow({ item, onSelect }: { item: PickerItem; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className="glass-card" style={{ width: '100%', padding: '12px 14px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 14, border: 'none' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {item.codeLabel && (
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0D7377', letterSpacing: '0.06em', marginBottom: 2 }}>{item.codeLabel}</div>
        )}
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{item.name}</div>
        {item.dd && (
          <div style={{ fontSize: 11, color: '#D4A017', fontWeight: 700, marginTop: 2 }}>DD {item.dd}</div>
        )}
      </div>
      <Plus size={15} color="#0D7377" strokeWidth={2.5} style={{ flexShrink: 0 }} />
    </button>
  )
}
