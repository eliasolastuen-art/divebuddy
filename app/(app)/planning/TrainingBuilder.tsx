'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlanningFolder, BlockCategory } from '@/types'
import { X, Check, Search, ChevronUp, ChevronDown, Plus, Trash2, Bookmark, LayoutList, GripVertical } from 'lucide-react'
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  block_type: 'standard' | 'test'
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

// ─── Sortable block wrapper ────────────────────────────────────────────────────

function SortableBlockWrapper({ id, children }: { id: string; children: (dragListeners: Record<string, unknown>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1, zIndex: isDragging ? 10 : undefined, position: 'relative' }}
      {...attributes}
    >
      {children(listeners as Record<string, unknown>)}
    </div>
  )
}

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
  const [title, setTitle]           = useState('')
  const [date, setDate]             = useState('')
  const [folderId, setFolderId]     = useState('')
  const [groupId, setGroupId]       = useState('')
  const [purpose, setPurpose]       = useState('')
  const [purposeType, setPurposeType] = useState('')
  const [status, setStatus]         = useState<'draft' | 'published'>('draft')
  const [blocks, setBlocks]         = useState<Block[]>([])
  const [saving, setSaving]         = useState(false)
  const [groups, setGroups]         = useState<{ id: string; name: string; color: string | null }[]>([])

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

  // Block UI state
  const [collapsedBlocks, setCollapsedBlocks]   = useState<Set<string>>(new Set())
  const [itemNotesOpen, setItemNotesOpen]       = useState<Set<string>>(new Set())
  const [editingItemId, setEditingItemId]       = useState<string | null>(null)
  const [templateSavedId, setTemplateSavedId]   = useState<string | null>(null)

  // Save block as template sheet
  const [saveTemplateBlock, setSaveTemplateBlock] = useState<Block | null>(null)
  const [savingTemplate, setSavingTemplate]       = useState(false)

  // Save whole training as template sheet
  const [showSaveTrainingSheet, setShowSaveTrainingSheet] = useState(false)
  const [trainingTmplName, setTrainingTmplName]           = useState('')
  const [trainingTmplGroup, setTrainingTmplGroup]         = useState<string | null>(null)
  const [savingTraining, setSavingTraining]               = useState(false)
  const [trainingSaved, setTrainingSaved]                 = useState(false)

  // DnD sensors for block reorder
  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = blocks.findIndex(b => b.id === active.id)
    const newIdx = blocks.findIndex(b => b.id === over.id)
    setBlocks(prev => arrayMove(prev, oldIdx, newIdx))
  }

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

    // Load groups
    supabase.from('groups').select('id, name, color').eq('club_id', MOCK_SESSION.clubId).order('name')
      .then(({ data }) => { if (data) setGroups(data) })

    // Pre-fill existing session
    if (existingTraining) {
      setTitle(existingTraining.title || '')
      setDate(existingTraining.scheduled_date || '')
      setFolderId(existingTraining.folder_id || '')
      setGroupId(existingTraining.group_id || '')
      setPurpose(existingTraining.purpose || '')
      setPurposeType(existingTraining.purpose_type || '')
      setStatus(existingTraining.status === 'published' ? 'published' : 'draft')
    }
    if (existingBlocks && existingBlocks.length > 0) {
      setBlocks(existingBlocks.map(b => ({
        id: b.id,
        category: b.category,
        name: b.name,
        notes: b.notes || '',
        block_type: b.block_type === 'test' ? 'test' : 'standard',
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
    setBlocks(b => [...b, { id: genId(), category, name: cat.label, notes: '', block_type: 'standard', items: [] }])
    setShowBlockPicker(false)
  }

  const addTestBlock = () => {
    setBlocks(b => [...b, { id: genId(), category: 'tavling', name: 'Testblock', notes: '', block_type: 'test', items: [] }])
    setShowBlockPicker(false)
  }

  const addBlockFromTemplate = (template: BlockTemplate) => {
    const category = (template.category as BlockCategory) || 'vatten'
    const newBlock: Block = {
      id: genId(),
      category,
      name: template.name,
      notes: '',
      block_type: 'standard',
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


  const saveBlockAsTemplate = async (block: Block, targetGroupId: string | null) => {
    setSavingTemplate(true)
    const { data: tmpl } = await supabase
      .from('block_templates')
      .insert({ name: block.name, category: block.category, group_id: targetGroupId })
      .select()
      .single()
    if (!tmpl) { setSavingTemplate(false); return }
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
    setSavingTemplate(false)
    setSaveTemplateBlock(null)
    setTemplateSavedId(block.id)
    setTimeout(() => setTemplateSavedId(null), 2000)
  }

  const saveWholeTraining = async () => {
    if (!trainingTmplName.trim() || blocks.length === 0) return
    setSavingTraining(true)
    const { data: tmpl } = await supabase
      .from('training_templates')
      .insert({ name: trainingTmplName.trim(), group_id: trainingTmplGroup })
      .select()
      .single()
    if (!tmpl) { setSavingTraining(false); return }
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const { data: tb } = await supabase
        .from('training_template_blocks')
        .insert({ training_template_id: tmpl.id, name: block.name, category: block.category, notes: block.notes || null, sort_order: i })
        .select()
        .single()
      if (!tb) continue
      for (let j = 0; j < block.items.length; j++) {
        const it = block.items[j]
        await supabase.from('training_template_items').insert({
          block_id: tb.id,
          library_item_id: it.library_item_id ?? null,
          custom_name: it.isFromLibrary ? null : it.custom_name || null,
          sets: it.sets ?? null,
          reps: it.reps ?? null,
          height: it.height ?? null,
          duration_seconds: it.duration_seconds ?? null,
          notes: it.notes || null,
          order_index: j,
        })
      }
    }
    setSavingTraining(false)
    setShowSaveTrainingSheet(false)
    setTrainingSaved(true)
    setTimeout(() => setTrainingSaved(false), 2500)
  }

  const toggleCollapse = (blockId: string) => {
    setCollapsedBlocks(prev => {
      const next = new Set(prev)
      next.has(blockId) ? next.delete(blockId) : next.add(blockId)
      return next
    })
  }

  const toggleItemNotes = (itemId: string) => {
    setItemNotesOpen(prev => {
      const next = new Set(prev)
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return next
    })
  }

  // ── Item helpers ───────────────────────────────────────────────────────────

  const addItemFromLibrary = (blockId: string, item: PickerItem) => {
    const newId = genId()
    setBlocks(b => b.map(block => block.id !== blockId ? block : {
      ...block,
      items: [...block.items, {
        id: newId,
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
    setEditingItemId(newId)
    setPickerBlockId(null)
    setPickerSearch('')
  }

  const addCustomItem = (blockId: string) => {
    const newId = genId()
    setBlocks(b => b.map(block => block.id !== blockId ? block : {
      ...block,
      items: [...block.items, { id: newId, custom_name: '', sets: undefined, reps: undefined, height: undefined, duration_seconds: undefined, notes: '', isFromLibrary: false }]
    }))
    setEditingItemId(newId)
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
      folder_id:    folderId    || null,
      scheduled_date: date      || null,
      status,
      group_id:     groupId     || null,
      purpose:      purpose.trim() || null,
      purpose_type: purposeType || null,
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
        block_type: block.block_type,
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {blocks.length > 0 && (
              <button
                onClick={() => { setTrainingTmplName(title); setTrainingTmplGroup(null); setShowSaveTrainingSheet(true) }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: trainingSaved ? 'rgba(22,163,74,0.12)' : 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 10, padding: '7px 12px', fontSize: 14, fontWeight: 600, color: trainingSaved ? '#16A34A' : '#64748B', cursor: 'pointer', transition: 'all 0.2s' }}
                title="Spara hela träningen som mall"
              >
                {trainingSaved ? <Check size={14} strokeWidth={2.5} /> : <Bookmark size={14} strokeWidth={2} />}
              </button>
            )}
            <button onClick={handleSave} disabled={saving || !title.trim()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: title.trim() ? 'linear-gradient(135deg, #0D7377, #0a5c60)' : 'rgba(0,0,0,0.08)', color: title.trim() ? 'white' : '#94A3B8', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 14, fontWeight: 700, cursor: title.trim() ? 'pointer' : 'default', boxShadow: title.trim() ? '0 2px 8px rgba(13,115,119,0.3)' : 'none', transition: 'all 0.15s ease' }}>
              <Check size={14} strokeWidth={2.5} />
              {saving ? '...' : 'Spara'}
            </button>
          </div>
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

            {/* Group */}
            <div style={{ marginBottom: 14 }}>
              <div className="text-label" style={{ marginBottom: 6 }}>Grupp</div>
              <select value={groupId} onChange={e => setGroupId(e.target.value)} className="glass-input" style={{ width: '100%', padding: '10px 12px', fontSize: 14, cursor: 'pointer' }}>
                <option value="">Ingen grupp</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            {/* Date + Folder */}
            <div style={{ display: 'grid', gridTemplateColumns: folders.length > 0 ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>
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

            {/* Purpose */}
            <div style={{ marginBottom: 14 }}>
              <div className="text-label" style={{ marginBottom: 6 }}>Syfte</div>
              <input
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="Vad är syftet med passet?"
                className="glass-input"
                style={{ width: '100%', padding: '10px 12px', fontSize: 14 }}
              />
            </div>

            {/* Purpose type */}
            <div style={{ marginBottom: 16 }}>
              <div className="text-label" style={{ marginBottom: 6 }}>Typ</div>
              <select value={purposeType} onChange={e => setPurposeType(e.target.value)} className="glass-input" style={{ width: '100%', padding: '10px 12px', fontSize: 14, cursor: 'pointer' }}>
                <option value="">Ingen</option>
                <option value="technique">Teknik</option>
                <option value="strength">Styrka</option>
                <option value="coordination">Koordination</option>
                <option value="competition">Tävling</option>
                <option value="recovery">Återhämtning</option>
              </select>
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
          <DndContext sensors={blockSensors} collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd}>
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block) => {
            const cat = CAT_BY_ID[block.category] || { color: '#64748B', emoji: '📋', label: block.name }
            const collapsed = collapsedBlocks.has(block.id)
            return (
              <SortableBlockWrapper key={block.id} id={block.id}>
                {(dragListeners) => (
              <div className="glass-card" style={{ marginBottom: 14, overflow: 'hidden', padding: 0 }}>
                {/* Block header */}
                <div style={{ background: `linear-gradient(135deg, ${cat.color}ee, ${cat.color}aa)`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Drag handle */}
                  <button {...dragListeners} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, touchAction: 'none' }}>
                    <GripVertical size={14} strokeWidth={2} color="white" />
                  </button>

                  {/* Collapse toggle */}
                  <button onClick={() => toggleCollapse(block.id)} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ChevronDown size={14} strokeWidth={2.5} color="white" style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.18s ease' }} />
                  </button>

                  <span style={{ fontSize: 18 }}>{block.block_type === 'test' ? '📊' : cat.emoji}</span>
                  <input value={block.name} onChange={e => updateBlock(block.id, 'name', e.target.value)} style={{ fontSize: 15, fontWeight: 700, color: 'white', background: 'transparent', border: 'none', outline: 'none', flex: 1 }} />

                  {/* Test badge */}
                  {block.block_type === 'test' && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 6px', letterSpacing: '0.06em', flexShrink: 0 }}>TEST</span>
                  )}

                  {/* Item count when collapsed */}
                  {collapsed && block.items.length > 0 && (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, flexShrink: 0 }}>
                      {block.items.length} övn.
                    </span>
                  )}

                  {/* Save as template */}
                  <button
                    onClick={() => setSaveTemplateBlock(block)}
                    title="Spara som mall"
                    style={{ background: templateSavedId === block.id ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                  >
                    {templateSavedId === block.id
                      ? <Check size={13} strokeWidth={3} color="white" />
                      : <Bookmark size={13} strokeWidth={2.5} color="white" />}
                  </button>

                  {/* Remove block */}
                  <button onClick={() => removeBlock(block.id)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={13} strokeWidth={2.5} color="white" />
                  </button>
                </div>

                {!collapsed && <div style={{ padding: '14px 16px' }}>
                  {block.items.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '10px 0', color: '#94A3B8', fontSize: 13 }}>
                      {block.block_type === 'test' ? '📊 Poäng registreras per atlet under passet' : 'Inga övningar ännu'}
                    </div>
                  )}

                  {block.items.map((item, ii) => {
                    const isEditing = editingItemId === item.id
                    const durStr = item.duration_seconds != null
                      ? `${Math.floor(item.duration_seconds / 60)}:${String(item.duration_seconds % 60).padStart(2, '0')}`
                      : ''
                    const parseDur = (v: string): number | undefined => {
                      if (!v.trim()) return undefined
                      if (v.includes(':')) { const [m, s] = v.split(':').map(Number); return (m || 0) * 60 + (s || 0) }
                      const n = parseInt(v); return isNaN(n) ? undefined : n
                    }
                    const summaryParts: string[] = []
                    if (item.sets && item.reps) summaryParts.push(`${item.sets}×${item.reps}`)
                    else if (item.sets) summaryParts.push(`${item.sets} set`)
                    else if (item.reps) summaryParts.push(`${item.reps} reps`)
                    if (item.height) summaryParts.push(item.height)
                    if (item.duration_seconds) summaryParts.push(durStr)
                    const summary = summaryParts.join(' · ')
                    const accentCol = cat?.color ?? '#0D7377'
                    return (
                    <div key={item.id} style={{ background: isEditing ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 12, marginBottom: ii < block.items.length - 1 ? 6 : 0, overflow: 'hidden' }}>

                      {isEditing ? (
                        /* ── Edit mode ── */
                        <div style={{ padding: '10px 12px' }}>
                          {/* Name */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            {block.block_type === 'test' && <span style={{ fontSize: 14, flexShrink: 0 }}>📊</span>}
                            {item.isFromLibrary ? (
                              <div style={{ flex: 1 }}>
                                {item.libraryItem?.code && <div style={{ fontSize: 10, fontWeight: 700, color: accentCol, letterSpacing: '0.06em' }}>{item.libraryItem.code}{item.libraryItem.group_name || ''}</div>}
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{item.libraryItem?.name || item.custom_name}</div>
                              </div>
                            ) : (
                              <input value={item.custom_name} onChange={e => updateItem(block.id, item.id, 'custom_name', e.target.value)} placeholder="Namn på övning..." autoFocus style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#0F172A', border: 'none', borderBottom: '1.5px solid rgba(0,0,0,0.12)', outline: 'none', paddingBottom: 3, background: 'transparent' }} />
                            )}
                            <button onClick={() => setEditingItemId(null)} style={{ background: accentCol, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', flexShrink: 0 }}>Klar</button>
                          </div>

                          {/* 2×2 param grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                            {([
                              { field: 'sets',   label: 'Set',       type: 'number', placeholder: '–',    inputMode: 'numeric' },
                              { field: 'reps',   label: 'Reps',      type: 'number', placeholder: '–',    inputMode: 'numeric' },
                              { field: 'height', label: 'Höjd',      type: 'text',   placeholder: '3m',   inputMode: 'text' },
                            ] as const).map(({ field, label, type, placeholder, inputMode }) => (
                              <div key={field}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
                                <input
                                  type={type}
                                  inputMode={inputMode as any}
                                  min={type === 'number' ? 1 : undefined}
                                  value={(item as any)[field] ?? ''}
                                  onChange={e => {
                                    const val = type === 'number' ? (e.target.value ? parseInt(e.target.value) : undefined) : (e.target.value || undefined)
                                    updateItem(block.id, item.id, field, val)
                                  }}
                                  placeholder={placeholder}
                                  className="glass-input"
                                  style={{ width: '100%', padding: '10px 12px', fontSize: 16, fontWeight: 600, textAlign: 'center', borderRadius: 10 }}
                                />
                              </div>
                            ))}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Tid (mm:ss)</div>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={durStr}
                                onChange={e => updateItem(block.id, item.id, 'duration_seconds', parseDur(e.target.value))}
                                placeholder="0:00"
                                className="glass-input"
                                style={{ width: '100%', padding: '10px 12px', fontSize: 16, fontWeight: 600, textAlign: 'center', borderRadius: 10 }}
                              />
                            </div>
                          </div>

                          {/* Notes — always visible in edit mode */}
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Anteckning</div>
                          <textarea
                            value={item.notes}
                            onChange={e => updateItem(block.id, item.id, 'notes', e.target.value)}
                            placeholder="Coachnotering, teknikpunkt..."
                            rows={2}
                            className="glass-input"
                            style={{ width: '100%', padding: '10px 12px', fontSize: 13, resize: 'none', fontFamily: 'inherit', borderRadius: 10 }}
                          />
                        </div>

                      ) : (
                        /* ── Collapsed view ── */
                        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                          <button
                            onClick={() => setEditingItemId(item.id)}
                            style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 12px' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {block.block_type === 'test' && <span style={{ fontSize: 13, flexShrink: 0 }}>📊</span>}
                              {item.libraryItem?.code && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: accentCol, letterSpacing: '0.06em', flexShrink: 0 }}>{item.libraryItem.code}{item.libraryItem.group_name || ''}</span>
                              )}
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', minWidth: 0 }}>{item.libraryItem?.name || item.custom_name || <span style={{ color: '#94A3B8' }}>Namnlös övning</span>}</span>
                            </div>
                            {summary && (
                              <div style={{ fontSize: 12, color: '#64748B', marginTop: 3, fontWeight: 600 }}>{summary}</div>
                            )}
                            {item.notes && (
                              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.notes}</div>
                            )}
                          </button>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '6px 8px 6px 0', flexShrink: 0 }}>
                            <button onClick={() => moveItem(block.id, ii, -1)} disabled={ii === 0} style={{ background: 'none', border: 'none', cursor: ii === 0 ? 'default' : 'pointer', opacity: ii === 0 ? 0.2 : 0.45, padding: 3, display: 'flex' }}>
                              <ChevronUp size={12} color="#64748B" strokeWidth={2.5} />
                            </button>
                            <button onClick={() => moveItem(block.id, ii, 1)} disabled={ii === block.items.length - 1} style={{ background: 'none', border: 'none', cursor: ii === block.items.length - 1 ? 'default' : 'pointer', opacity: ii === block.items.length - 1 ? 0.2 : 0.45, padding: 3, display: 'flex' }}>
                              <ChevronDown size={12} color="#64748B" strokeWidth={2.5} />
                            </button>
                            <button onClick={() => removeItem(block.id, item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, display: 'flex' }}>
                              <Trash2 size={12} color="#CBD5E1" strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )})}

                  {/* Add exercise row */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => { setPickerBlockId(block.id); setPickerSearch(''); setPickerCategory('all') }} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1.5px dashed rgba(13,115,119,0.4)', background: 'rgba(13,115,119,0.06)', fontSize: 13, fontWeight: 600, color: '#0D7377', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Search size={13} /> Från bibliotek
                    </button>
                    <button onClick={() => addCustomItem(block.id)} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1.5px dashed rgba(0,0,0,0.1)', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Plus size={13} /> Egen övning
                    </button>
                  </div>
                </div>}
              </div>
              )}
              </SortableBlockWrapper>
            )
          })}
            </SortableContext>
          </DndContext>

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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    {BLOCK_CATEGORIES.map(cat => (
                      <button key={cat.id} onClick={() => addBlock(cat.id)} style={{ padding: '18px 8px', borderRadius: 18, border: `1.5px solid ${cat.color}30`, background: `${cat.color}0d`, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease' }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{cat.emoji}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{cat.label}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={addTestBlock} style={{ width: '100%', padding: '14px', borderRadius: 18, border: '1.5px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>📊</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#6366F1' }}>Testblock</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>Poäng per atlet under passet</div>
                    </div>
                  </button>
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

      {/* ── Save-as-template sheet ──────────────────────────────────────────── */}
      {saveTemplateBlock && (
        <>
          <div
            onClick={() => !savingTemplate && setSaveTemplateBlock(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 400 }}
          />
          <div
            className="glass-sheet"
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 500, borderRadius: '24px 24px 0 0', padding: '24px 20px 48px', maxWidth: 520, margin: '0 auto' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '0 auto 20px' }} />
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Spara mall</div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>"{saveTemplateBlock.name}"</div>

            {/* Global */}
            <button
              onClick={() => saveBlockAsTemplate(saveTemplateBlock, null)}
              disabled={savingTemplate}
              className="glass-card"
              style={{ width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: 16, border: 'none', cursor: 'pointer', marginBottom: 10, opacity: savingTemplate ? 0.6 : 1 }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>📋 Spara globalt</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Tillgänglig för alla grupper</div>
            </button>

            {/* Per group */}
            {groups.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '16px 0 10px' }}>
                  Spara till grupp
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {groups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => saveBlockAsTemplate(saveTemplateBlock, g.id)}
                      disabled={savingTemplate}
                      className="glass-card"
                      style={{ width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: 16, border: 'none', cursor: 'pointer', opacity: savingTemplate ? 0.6 : 1, borderLeft: `4px solid ${g.color ?? '#0D7377'}` }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{g.name}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Save whole training sheet ──────────────────────────────────────── */}
      {showSaveTrainingSheet && (
        <>
          <div onClick={() => !savingTraining && setShowSaveTrainingSheet(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 400 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 500, borderRadius: '24px 24px 0 0', padding: '24px 20px 48px', maxWidth: 520, margin: '0 auto' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '0 auto 20px' }} />
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Spara träning som mall</div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 16 }}>{blocks.length} block · {blocks.reduce((s, b) => s + b.items.length, 0)} övningar</div>
            <input
              value={trainingTmplName}
              onChange={e => setTrainingTmplName(e.target.value)}
              placeholder="Mallnamn..."
              className="glass-input"
              style={{ width: '100%', padding: '12px 16px', fontSize: 15, marginBottom: 16 }}
              autoFocus
            />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Spara till grupp</div>
            <button
              onClick={() => setTrainingTmplGroup(null)}
              className="glass-card"
              style={{ width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: 14, border: `2px solid ${trainingTmplGroup === null ? '#0D7377' : 'transparent'}`, cursor: 'pointer', marginBottom: 8, background: trainingTmplGroup === null ? 'rgba(13,115,119,0.06)' : undefined }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>📋 Globalt</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Tillgänglig för alla grupper</div>
            </button>
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => setTrainingTmplGroup(g.id)}
                className="glass-card"
                style={{ width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: 14, border: `2px solid ${trainingTmplGroup === g.id ? (g.color ?? '#0D7377') : 'transparent'}`, cursor: 'pointer', marginBottom: 8, borderLeft: `4px solid ${g.color ?? '#0D7377'}`, background: trainingTmplGroup === g.id ? `${g.color ?? '#0D7377'}10` : undefined }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{g.name}</div>
              </button>
            ))}
            <button
              onClick={saveWholeTraining}
              disabled={!trainingTmplName.trim() || savingTraining}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 16, marginTop: 8, opacity: !trainingTmplName.trim() ? 0.5 : 1 }}
            >
              {savingTraining ? 'Sparar...' : 'Spara mall'}
            </button>
          </div>
        </>
      )}
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
