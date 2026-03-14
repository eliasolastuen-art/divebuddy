'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, X, ChevronUp, ChevronDown, BookOpen, Pencil, Trash2 } from 'lucide-react'
import ExerciseModal from '@/components/ExerciseModal'

interface Category {
  id: string
  name: string
  sort_order: number
  exercise_count: number
}

interface SearchResult {
  id: string
  name: string
  code: string | null
  notes: string | null
  tags: string[]
  category_id: string | null
  category_name: string | null
}

export default function LibraryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [allItems, setAllItems] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // New exercise modal
  const [showExerciseModal, setShowExerciseModal] = useState(false)

  // Edit categories state
  const [showEdit, setShowEdit] = useState(false)
  const [editList, setEditList] = useState<{ id: string; name: string; isNew?: boolean }[]>([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const loadCategories = async () => {
    const [catRes, itemRes] = await Promise.all([
      supabase.from('categories').select('id, name, sort_order').order('sort_order'),
      supabase.from('library_items').select('id, name, code, description, tags, category_id, categories(name)').eq('archived', false).order('name'),
    ])

    const items: SearchResult[] = (itemRes.data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      code: item.code ?? null,
      notes: item.description ?? null,
      tags: item.tags ?? [],
      category_id: item.category_id ?? null,
      category_name: item.categories?.name ?? null,
    }))
    setAllItems(items)

    const counts: Record<string, number> = {}
    items.forEach(i => { if (i.category_id) counts[i.category_id] = (counts[i.category_id] || 0) + 1 })

    setCategories((catRes.data || []).map(c => ({ ...c, exercise_count: counts[c.id] || 0 })))
    setLoading(false)
  }

  useEffect(() => { loadCategories() }, [])

  // Search filter
  const searchResults = search.trim()
    ? allItems.filter(item => {
        const q = search.toLowerCase()
        return (
          item.name.toLowerCase().includes(q) ||
          (item.code?.toLowerCase().includes(q)) ||
          (item.notes?.toLowerCase().includes(q)) ||
          item.tags.some(t => t.toLowerCase().includes(q))
        )
      })
    : []

  // Category edit helpers
  const openEdit = () => {
    setEditList(categories.map(c => ({ id: c.id, name: c.name })))
    setNewName('')
    setShowEdit(true)
  }

  const move = (i: number, dir: -1 | 1) => {
    const list = [...editList]
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    setEditList(list)
  }

  const rename = (i: number, name: string) => {
    setEditList(prev => prev.map((c, idx) => idx === i ? { ...c, name } : c))
  }

  const remove = (i: number) => {
    setEditList(prev => prev.filter((_, idx) => idx !== i))
  }

  const addCategory = () => {
    const name = newName.trim()
    if (!name) return
    setEditList(prev => [...prev, { id: crypto.randomUUID(), name, isNew: true }])
    setNewName('')
  }

  const saveCategories = async () => {
    setSaving(true)
    const existingIds = categories.map(c => c.id)
    const keptIds = editList.map(c => c.id)

    // Delete removed
    const toDelete = existingIds.filter(id => !keptIds.includes(id))
    if (toDelete.length > 0) {
      await supabase.from('categories').delete().in('id', toDelete)
    }

    // Upsert all with updated sort_order and name
    for (let i = 0; i < editList.length; i++) {
      const c = editList[i]
      if (c.isNew) {
        await supabase.from('categories').insert({ name: c.name, sort_order: i })
      } else {
        await supabase.from('categories').update({ name: c.name, sort_order: i }).eq('id', c.id)
      }
    }

    setSaving(false)
    setShowEdit(false)
    loadCategories()
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>Library</h1>
          <button
            onClick={openEdit}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 12, background: 'rgba(13,115,119,0.08)', border: 'none', color: '#0D7377' }}
          >
            <Pencil size={13} strokeWidth={2.5} /> Edit
          </button>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative' }}>
          <Search size={15} color="#94A3B8" strokeWidth={2} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="glass-input"
            style={{ width: '100%', padding: '12px 40px', fontSize: 14 }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <X size={14} color="#94A3B8" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '4px 16px 120px' }}>

        {search.trim() ? (
          /* Search results */
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </div>
            {searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>No results</p>
                <p style={{ fontSize: 13, color: '#94A3B8' }}>Try a different search term</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchResults.map(item => (
                  <button
                    key={item.id}
                    onClick={() => item.category_id && router.push(`/library/${item.category_id}`)}
                    className="glass-card"
                    style={{ width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: 18, border: 'none', cursor: 'pointer' }}
                  >
                    {item.code && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0D7377', letterSpacing: '0.06em', marginBottom: 3 }}>{item.code}</div>
                    )}
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: item.category_name ? 4 : 0 }}>{item.name}</div>
                    {item.category_name && (
                      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{item.category_name}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Category grid */
          loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading...</div>
          ) : categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(13,115,119,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <BookOpen size={26} color="#0D7377" strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>No categories yet</p>
              <p style={{ fontSize: 13, color: '#94A3B8' }}>Tap Edit to create your first category</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => router.push(`/library/${cat.id}`)}
                  className="glass-card"
                  style={{
                    padding: '22px 18px',
                    borderRadius: 20,
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    minHeight: 110,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.25 }}>{cat.name}</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500, marginTop: 10 }}>
                    {cat.exercise_count === 1 ? '1 exercise' : `${cat.exercise_count} exercises`}
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* FAB — create exercise without entering a category first */}
      {!search.trim() && (
        <button
          onClick={() => setShowExerciseModal(true)}
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #0D7377, #0a5a5d)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(13,115,119,0.4)',
            zIndex: 50,
          }}
        >
          <Plus size={24} color="white" strokeWidth={2.5} />
        </button>
      )}

      <ExerciseModal
        open={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onSaved={loadCategories}
        categories={categories}
      />

      {/* Edit Categories modal */}
      {showEdit && (
        <>
          <div
            onClick={() => setShowEdit(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100 }}
          />
          <div
            className="glass-sheet"
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, padding: '16px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)', maxHeight: '92vh', overflowY: 'auto' }}
          >
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Edit Categories</h2>
              <button
                onClick={() => setShowEdit(false)}
                style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>

            {/* Category list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {editList.map((cat, i) => (
                <div
                  key={cat.id}
                  className="glass-card"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 14 }}
                >
                  {/* Reorder */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', padding: '2px 4px', opacity: i === 0 ? 0.25 : 1, display: 'flex' }}
                    >
                      <ChevronUp size={13} color="#64748B" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === editList.length - 1}
                      style={{ background: 'none', border: 'none', cursor: i === editList.length - 1 ? 'default' : 'pointer', padding: '2px 4px', opacity: i === editList.length - 1 ? 0.25 : 1, display: 'flex' }}
                    >
                      <ChevronDown size={13} color="#64748B" strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Editable name */}
                  <input
                    value={cat.name}
                    onChange={e => rename(i, e.target.value)}
                    className="glass-input"
                    style={{ flex: 1, padding: '8px 12px', fontSize: 14, fontWeight: 600, borderRadius: 10 }}
                  />

                  {/* Delete */}
                  <button
                    onClick={() => remove(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', flexShrink: 0 }}
                  >
                    <Trash2 size={15} color="#DC2626" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new category */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                placeholder="New category name..."
                className="glass-input"
                style={{ flex: 1, padding: '11px 14px', fontSize: 14 }}
              />
              <button
                onClick={addCategory}
                disabled={!newName.trim()}
                style={{ padding: '11px 16px', borderRadius: 12, background: '#0D7377', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'white', opacity: newName.trim() ? 1 : 0.4, flexShrink: 0 }}
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>

            <button
              onClick={saveCategories}
              disabled={saving}
              className="btn-primary"
              style={{ width: '100%', padding: '15px', fontSize: 15, cursor: 'pointer' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
