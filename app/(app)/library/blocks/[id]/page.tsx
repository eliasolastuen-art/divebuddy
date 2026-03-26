'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Search, X, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'

const BLOCK_CATEGORIES = [
  { id: 'vatten',      label: 'Vatten',      emoji: '💧', color: '#0D7377' },
  { id: 'land',        label: 'Land',        emoji: '🏃', color: '#D4A017' },
  { id: 'styrka',      label: 'Styrka',      emoji: '💪', color: '#DC2626' },
  { id: 'rorlighet',   label: 'Rörlighet',   emoji: '🧘', color: '#16A34A' },
  { id: 'uppvarmning', label: 'Uppvärmning', emoji: '🔥', color: '#F97316' },
  { id: 'tavling',     label: 'Tävling',     emoji: '🏆', color: '#6366F1' },
] as const

const CAT_BY_ID = Object.fromEntries(BLOCK_CATEGORIES.map(c => [c.id, c]))

interface TemplateItem {
  id: string
  order_index: number
  library_item_id: string | null
  custom_name: string | null
  sets: number | null
  reps: number | null
  height: string | null
  notes: string | null
  library_item?: { id: string; name: string; code: string | null; group_name: string | null } | null
}

interface PickerItem {
  id: string
  name: string
  codeLabel: string
  category_name: string | null
  category_id: string | null
}

export default function BlockTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string
  const supabase = createClient()

  const [templateName, setTemplateName] = useState('')
  const [templateCategory, setTemplateCategory] = useState('vatten')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [items, setItems] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)

  // Library picker
  const [showPicker, setShowPicker] = useState(false)
  const [pickerItems, setPickerItems] = useState<PickerItem[]>([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerCategories, setPickerCategories] = useState<{ id: string; name: string }[]>([])
  const [pickerCategory, setPickerCategory] = useState('all')

  // Delete confirmation
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<string | null>(null)
  const [showDeleteTemplate, setShowDeleteTemplate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    const [tmplRes, itemsRes, libRes, catsRes] = await Promise.all([
      supabase.from('block_templates').select('id, name, category').eq('id', templateId).single(),
      supabase
        .from('block_template_items')
        .select('id, order_index, library_item_id, custom_name, sets, reps, height, notes, library_item:library_items(id, name, code, group_name)')
        .eq('template_id', templateId)
        .order('order_index'),
      supabase
        .from('library_items')
        .select('id, name, code, group_name, category_id, categories(id, name, sort_order)')
        .eq('archived', false)
        .order('code', { ascending: true })
        .order('name'),
      supabase.from('categories').select('id, name').order('sort_order'),
    ])

    if (tmplRes.data) {
      setTemplateName(tmplRes.data.name)
      setNameInput(tmplRes.data.name)
      setTemplateCategory(tmplRes.data.category ?? 'vatten')
    }
    if (itemsRes.data) {
      setItems(itemsRes.data.map((it: any) => ({
        ...it,
        library_item: it.library_item ?? null,
      })))
    }
    if (libRes.data) {
      setPickerItems(libRes.data.map((it: any) => ({
        id: it.id,
        name: it.name,
        codeLabel: it.code && it.group_name ? `${it.code}${it.group_name}` : it.code ?? '',
        category_name: it.categories?.name ?? null,
        category_id: it.category_id ?? null,
      })))
    }
    if (catsRes.data) setPickerCategories(catsRes.data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [templateId])

  // ── Name save ────────────────────────────────────────────────────────────

  const saveName = async () => {
    const trimmed = nameInput.trim()
    setEditingName(false)
    if (!trimmed || trimmed === templateName) return
    await supabase.from('block_templates').update({ name: trimmed }).eq('id', templateId)
    setTemplateName(trimmed)
  }

  // ── Category change ──────────────────────────────────────────────────────

  const saveCategory = async (catId: string) => {
    setTemplateCategory(catId)
    await supabase.from('block_templates').update({ category: catId }).eq('id', templateId)
  }

  // ── Items ────────────────────────────────────────────────────────────────

  const addFromLibrary = async (item: PickerItem) => {
    setSaving(true)
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index)) + 1 : 0
    const { data, error: err } = await supabase
      .from('block_template_items')
      .insert({ template_id: templateId, library_item_id: item.id, order_index: maxOrder })
      .select('id, order_index, library_item_id, custom_name, sets, reps, height, notes, library_item:library_items(id, name, code, group_name)')
      .single()
    setSaving(false)
    if (err || !data) { setError('Kunde inte lägga till övning'); return }
    const newItem: TemplateItem = { ...(data as any), library_item: (data as any).library_item ?? null }
    setItems(prev => [...prev, newItem])
    setShowPicker(false)
    setPickerSearch('')
  }

  const removeItem = async (id: string) => {
    await supabase.from('block_template_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setConfirmDeleteItem(null)
  }

  const moveItem = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setItems(next)
    await Promise.all([
      supabase.from('block_template_items').update({ order_index: j }).eq('id', next[idx].id),
      supabase.from('block_template_items').update({ order_index: idx }).eq('id', next[j].id),
    ])
  }

  // ── Delete template ──────────────────────────────────────────────────────

  const deleteTemplate = async () => {
    await supabase.from('block_template_items').delete().eq('template_id', templateId)
    await supabase.from('block_templates').delete().eq('id', templateId)
    router.back()
  }

  // ── Picker filter ────────────────────────────────────────────────────────

  const filtered = pickerItems.filter(it => {
    const q = pickerSearch.toLowerCase()
    const matchSearch = !q || it.name.toLowerCase().includes(q) || it.codeLabel.toLowerCase().includes(q)
    const matchCat = pickerCategory === 'all' || it.category_id === pickerCategory
    return matchSearch && matchCat
  })

  const cat = CAT_BY_ID[templateCategory as keyof typeof CAT_BY_ID] ?? { color: '#64748B', emoji: '📋', label: templateCategory }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <ArrowLeft size={18} color="#0F172A" strokeWidth={2} />
          </button>

          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') { setNameInput(templateName); setEditingName(false) }
              }}
              className="glass-input"
              style={{ flex: 1, fontSize: 22, fontWeight: 800, padding: '6px 10px', letterSpacing: '-0.03em', borderRadius: 10 }}
            />
          ) : (
            <h1
              onClick={() => { setNameInput(templateName); setEditingName(true) }}
              style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em', cursor: 'text', flex: 1 }}
            >
              {templateName || '…'}
            </h1>
          )}
        </div>

        {/* Category picker */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {BLOCK_CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => saveCategory(c.id)}
              style={{
                flexShrink: 0,
                padding: '6px 12px',
                borderRadius: 20,
                border: `1.5px solid ${templateCategory === c.id ? c.color : 'transparent'}`,
                background: templateCategory === c.id ? `${c.color}15` : 'rgba(0,0,0,0.05)',
                fontSize: 12,
                fontWeight: 700,
                color: templateCategory === c.id ? c.color : '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: '0 16px 10px', padding: '10px 14px', background: 'rgba(220,38,38,0.08)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <X size={14} color="#DC2626" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Items */}
      <div style={{ padding: '4px 16px 140px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Laddar...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.5)', borderRadius: 18, border: '1px solid rgba(0,0,0,0.05)', marginBottom: 16 }}>
            <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>{cat.emoji}</span>
            <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500 }}>Inga övningar än — lägg till från biblioteket</p>
          </div>
        ) : (
          <div className="glass-card" style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
            {items.map((item, i) => {
              const label = item.library_item
                ? (item.library_item.code && item.library_item.group_name
                    ? `${item.library_item.code}${item.library_item.group_name}`
                    : item.library_item.code ?? '')
                : ''
              const displayName = item.library_item?.name ?? item.custom_name ?? '—'

              return (
                <div key={item.id}>
                  {i > 0 && <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', marginLeft: 16 }} />}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 8 }}>

                    {/* Reorder */}
                    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                      <button onClick={() => moveItem(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', padding: '2px 4px', opacity: i === 0 ? 0.18 : 0.55, display: 'flex' }}>
                        <ChevronUp size={13} color="#64748B" strokeWidth={2.5} />
                      </button>
                      <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} style={{ background: 'none', border: 'none', cursor: i === items.length - 1 ? 'default' : 'pointer', padding: '2px 4px', opacity: i === items.length - 1 ? 0.18 : 0.55, display: 'flex' }}>
                        <ChevronDown size={13} color="#64748B" strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {label && <div style={{ fontSize: 11, fontWeight: 700, color: '#0D7377', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>}
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{displayName}</div>
                      {(item.sets || item.reps || item.height) && (
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: 500 }}>
                          {[item.sets && `${item.sets} set`, item.reps && `${item.reps} reps`, item.height].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    {confirmDeleteItem === item.id ? (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setConfirmDeleteItem(null)} style={{ padding: '4px 8px', borderRadius: 8, background: 'rgba(0,0,0,0.06)', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Avbryt</button>
                        <button onClick={() => removeItem(item.id)} style={{ padding: '4px 10px', borderRadius: 8, background: '#DC2626', border: 'none', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Ta bort</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', display: 'flex', flexShrink: 0 }}>
                        <Trash2 size={14} color="#CBD5E1" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add exercise button */}
        <button
          onClick={() => { setShowPicker(true); setPickerSearch(''); setPickerCategory('all') }}
          style={{ width: '100%', padding: '14px', borderRadius: 16, border: '2px dashed rgba(13,115,119,0.3)', background: 'rgba(13,115,119,0.04)', fontSize: 14, fontWeight: 600, color: '#0D7377', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Plus size={15} strokeWidth={2.5} /> Lägg till övning
        </button>

        {/* Delete template */}
        {!showDeleteTemplate ? (
          <button
            onClick={() => setShowDeleteTemplate(true)}
            style={{ width: '100%', marginTop: 20, padding: '13px', borderRadius: 14, background: 'rgba(220,38,38,0.07)', border: 'none', fontSize: 14, fontWeight: 700, color: '#DC2626', cursor: 'pointer' }}
          >
            Ta bort mall
          </button>
        ) : (
          <div style={{ marginTop: 20, background: 'rgba(220,38,38,0.07)', borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', marginBottom: 12, textAlign: 'center' }}>Ta bort denna mall permanent?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowDeleteTemplate(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Avbryt</button>
              <button onClick={deleteTemplate} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#DC2626', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Ta bort</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Library picker ────────────────────────────────────────────────── */}
      {showPicker && (
        <>
          <div onClick={() => setShowPicker(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001, maxHeight: '84vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px 10px', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>Lägg till övning</h3>
                <button onClick={() => setShowPicker(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} color="#64748B" strokeWidth={2.5} />
                </button>
              </div>

              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={14} color="#94A3B8" strokeWidth={2} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  autoFocus
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Sök på namn eller kod..."
                  className="glass-input"
                  style={{ width: '100%', padding: '11px 14px 11px 34px', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                <button onClick={() => setPickerCategory('all')} className={pickerCategory === 'all' ? 'chip chip-active' : 'chip chip-inactive'} style={{ flexShrink: 0 }}>Alla</button>
                {pickerCategories.map(c => (
                  <button key={c.id} onClick={() => setPickerCategory(c.id)} className={pickerCategory === c.id ? 'chip chip-active' : 'chip chip-inactive'} style={{ flexShrink: 0 }}>{c.name}</button>
                ))}
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '4px 20px calc(var(--safe-bottom) + 20px)' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 14 }}>Inga övningar</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filtered.map(item => (
                    <button
                      key={item.id}
                      onClick={() => addFromLibrary(item)}
                      disabled={saving}
                      className="glass-card"
                      style={{ width: '100%', padding: '12px 14px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 14, border: 'none' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {item.codeLabel && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#0D7377', letterSpacing: '0.06em', marginBottom: 2 }}>{item.codeLabel}</div>
                        )}
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{item.name}</div>
                        {item.category_name && (
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{item.category_name}</div>
                        )}
                      </div>
                      <Plus size={15} color="#0D7377" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
