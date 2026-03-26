'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, X, Settings, Check, Trash2 } from 'lucide-react'
import ExerciseModal from '@/components/ExerciseModal'
import type { BlockCategoryRecord } from '@/types'

// Preset colors for block category editor
const PRESET_COLORS = [
  '#0D7377', '#D4A017', '#DC2626', '#16A34A',
  '#F97316', '#6366F1', '#0EA5E9', '#EC4899',
]

// Emoji suggestions for block category editor
const EMOJI_SUGGESTIONS = ['💧', '🏃', '💪', '🧘', '🔥', '🏆', '🤸', '⚡', '🎯', '🌊', '🏋️', '🤽']

interface BlockCategoryStat extends BlockCategoryRecord {
  subCategoryCount: number
  exerciseCount: number
}

interface GroupRow {
  id: string
  name: string
  color: string | null
  templateCount: number
}

interface RecentTemplate {
  id: string
  name: string
  category: string | null
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

interface CategoryOption {
  id: string
  name: string
}

export default function LibraryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [blockStats, setBlockStats] = useState<BlockCategoryStat[]>([])
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [recentTemplates, setRecentTemplates] = useState<RecentTemplate[]>([])
  const [allItems, setAllItems] = useState<SearchResult[]>([])
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showExerciseModal, setShowExerciseModal] = useState(false)

  // Edit mode for block categories
  const [editMode, setEditMode] = useState(false)
  const [editingCat, setEditingCat] = useState<BlockCategoryRecord | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null)

  // New block category sheet
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('🎯')
  const [newCatColor, setNewCatColor] = useState('#0D7377')
  const [creatingCat, setCreatingCat] = useState(false)

  const loadData = async () => {
    const [blockCatsRes, catsRes, itemsRes, groupsRes, tmplRes, tmplCountRes] = await Promise.all([
      supabase.from('block_categories').select('*').order('sort_order'),
      supabase.from('categories').select('id, name, block_category'),
      supabase.from('library_items').select('id, name, code, description, tags, category_id, categories(name)').eq('archived', false),
      supabase.from('groups').select('id, name, color').order('name'),
      supabase.from('block_templates').select('id, name, category, group_id').order('created_at', { ascending: false }).limit(8),
      supabase.from('block_templates').select('group_id, id').not('group_id', 'is', null),
    ])

    const blockCats: BlockCategoryRecord[] = blockCatsRes.data || []

    const items: SearchResult[] = (itemsRes.data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      code: item.code ?? null,
      notes: item.description ?? null,
      tags: item.tags ?? [],
      category_id: item.category_id ?? null,
      category_name: item.categories?.name ?? null,
    }))
    setAllItems(items)

    const cats = catsRes.data || []
    setCategoryOptions(cats.map((c: any) => ({ id: c.id, name: c.name })))

    const exerciseCountByCategory: Record<string, number> = {}
    items.forEach(i => {
      if (i.category_id) exerciseCountByCategory[i.category_id] = (exerciseCountByCategory[i.category_id] || 0) + 1
    })
    const subCatByBlock: Record<string, { subs: number; exercises: number }> = {}
    cats.forEach((c: any) => {
      const bt = c.block_category || '__none__'
      if (!subCatByBlock[bt]) subCatByBlock[bt] = { subs: 0, exercises: 0 }
      subCatByBlock[bt].subs += 1
      subCatByBlock[bt].exercises += exerciseCountByCategory[c.id] || 0
    })

    setBlockStats(
      blockCats.map(bc => ({
        ...bc,
        subCategoryCount: subCatByBlock[bc.id]?.subs ?? 0,
        exerciseCount: subCatByBlock[bc.id]?.exercises ?? 0,
      }))
    )

    const templateCountByGroup: Record<string, number> = {}
    ;(tmplCountRes.data || []).forEach((t: any) => {
      if (t.group_id) templateCountByGroup[t.group_id] = (templateCountByGroup[t.group_id] || 0) + 1
    })
    setGroups(
      (groupsRes.data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        color: g.color,
        templateCount: templateCountByGroup[g.id] || 0,
      }))
    )

    setRecentTemplates(
      (tmplRes.data || [])
        .filter((t: any) => !t.group_id)
        .slice(0, 6)
        .map((t: any) => ({ id: t.id, name: t.name, category: t.category }))
    )

    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

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

  // ── Edit block category ──────────────────────────────────────────────────────

  const openEditCat = (cat: BlockCategoryStat) => {
    setEditingCat(cat)
    setEditName(cat.name)
    setEditEmoji(cat.emoji)
    setEditColor(cat.color)
    setConfirmDeleteCatId(null)
  }

  const saveEditCat = async () => {
    if (!editingCat || !editName.trim()) return
    setSaving(true)
    await supabase.from('block_categories').update({
      name: editName.trim(),
      emoji: editEmoji,
      color: editColor,
    }).eq('id', editingCat.id)
    setSaving(false)
    setEditingCat(null)
    loadData()
  }

  const deleteBlockCat = async (id: string) => {
    await supabase.from('block_categories').delete().eq('id', id)
    setEditingCat(null)
    setConfirmDeleteCatId(null)
    loadData()
  }

  const createBlockCat = async () => {
    if (!newCatName.trim()) return
    setCreatingCat(true)
    const maxOrder = blockStats.length > 0 ? Math.max(...blockStats.map(b => b.sort_order)) + 1 : 0
    const newId = newCatName.trim().toLowerCase().replace(/[åä]/g, 'a').replace(/[ö]/g, 'o').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    await supabase.from('block_categories').insert({
      id: newId || `cat_${Date.now()}`,
      name: newCatName.trim(),
      emoji: newCatEmoji,
      color: newCatColor,
      sort_order: maxOrder,
    })
    setCreatingCat(false)
    setShowAddCat(false)
    setNewCatName('')
    setNewCatEmoji('🎯')
    setNewCatColor('#0D7377')
    loadData()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>
          Library
        </h1>
        {!search.trim() && (
          <button
            onClick={() => { setEditMode(e => !e); setEditingCat(null) }}
            style={{
              background: editMode ? '#0D7377' : 'rgba(0,0,0,0.06)',
              border: 'none', borderRadius: 12, padding: '8px 14px',
              display: 'flex', alignItems: 'center', gap: 6,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Settings size={15} color={editMode ? 'white' : '#64748B'} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 700, color: editMode ? 'white' : '#64748B' }}>
              {editMode ? 'Klar' : 'Hantera'}
            </span>
          </button>
        )}
      </div>

      {/* Search */}
      {!editMode && (
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#94A3B8" strokeWidth={2} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Sök övningar..."
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
      )}

      {/* Content */}
      <div style={{ padding: '4px 16px 140px' }}>

        {search.trim() ? (

          /* ── Search results ───────────────────────────────────────────── */
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              {searchResults.length} resultat
            </div>
            {searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Inga resultat</p>
                <p style={{ fontSize: 13, color: '#94A3B8' }}>Prova ett annat sökord</p>
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

        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Laddar...</div>

        ) : (
          <>
            {/* ── Block category Spotify grid ──────────────────────────────── */}
            <div style={{ marginBottom: 32 }}>
              {editMode && (
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Kategorier — tryck för att redigera
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {blockStats.map(stat => (
                  <button
                    key={stat.id}
                    onClick={() => editMode ? openEditCat(stat) : router.push(`/library/${stat.id}`)}
                    style={{
                      position: 'relative',
                      height: 140,
                      borderRadius: 20,
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      overflow: 'hidden',
                      background: `linear-gradient(145deg, ${stat.color}dd 0%, ${stat.color}99 100%)`,
                      boxShadow: `0 4px 20px ${stat.color}44`,
                      padding: '18px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    {/* Decorative circle */}
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />

                    <div style={{ fontSize: 38, lineHeight: 1, position: 'relative' }}>{stat.emoji}</div>

                    <div style={{ position: 'relative' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{stat.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginTop: 3 }}>
                        {stat.exerciseCount > 0 ? `${stat.exerciseCount} övningar` : 'Tom'}
                      </div>
                    </div>

                    {editMode && (
                      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.25)', borderRadius: 8, padding: '4px 8px', backdropFilter: 'blur(4px)' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>Redigera</span>
                      </div>
                    )}
                  </button>
                ))}

                {/* Add new category button in edit mode */}
                {editMode && (
                  <button
                    onClick={() => setShowAddCat(true)}
                    style={{
                      height: 140,
                      borderRadius: 20,
                      border: '2px dashed rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                      background: 'rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={18} color="#94A3B8" strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8' }}>Ny kategori</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── Grupper ──────────────────────────────────────────────────── */}
            {!editMode && groups.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Grupper
                </div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {groups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => router.push(`/library/groups/${group.id}`)}
                      className="glass-card"
                      style={{
                        flexShrink: 0,
                        padding: '14px 18px',
                        borderRadius: 18,
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        minWidth: 120,
                        borderLeft: `4px solid ${group.color ?? '#0D7377'}`,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{group.name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
                        {group.templateCount === 0 ? 'Inga mallar' : `${group.templateCount} mall${group.templateCount !== 1 ? 'ar' : ''}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Senaste mallar ───────────────────────────────────────────── */}
            {!editMode && recentTemplates.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Senaste mallar
                </div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {recentTemplates.map(tmpl => {
                    const cat = blockStats.find(b => b.id === tmpl.category)
                    const color = cat?.color ?? '#64748B'
                    const emoji = cat?.emoji ?? '📋'
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => router.push(`/library/blocks/${tmpl.id}`)}
                        className="glass-card"
                        style={{
                          flexShrink: 0,
                          padding: '12px 16px',
                          borderRadius: 16,
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          minWidth: 130,
                          maxWidth: 180,
                          borderTop: `3px solid ${color}`,
                        }}
                      >
                        <div style={{ fontSize: 18, marginBottom: 6 }}>{emoji}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tmpl.name}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB — create exercise (only when not in edit mode and not searching) */}
      {!search.trim() && !editMode && (
        <button
          onClick={() => setShowExerciseModal(true)}
          style={{
            position: 'fixed',
            bottom: 'calc(var(--safe-bottom) + 88px)',
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
        onSaved={loadData}
        categories={categoryOptions}
      />

      {/* ── Edit block category sheet ──────────────────────────────────────── */}
      {editingCat && (
        <>
          <div onClick={() => setEditingCat(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001, borderRadius: '24px 24px 0 0', padding: '24px 20px calc(var(--safe-bottom) + 32px)', maxWidth: 520, margin: '0 auto' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '0 auto 24px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: `${editColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                {editEmoji}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
                Redigera kategori
              </h3>
            </div>

            {/* Name */}
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Namn</label>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="glass-input"
              style={{ width: '100%', padding: '12px 16px', fontSize: 15, marginBottom: 20 }}
            />

            {/* Emoji */}
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Emoji</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {EMOJI_SUGGESTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setEditEmoji(e)}
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: editEmoji === e ? `2px solid ${editColor}` : '2px solid transparent',
                    background: editEmoji === e ? `${editColor}18` : 'rgba(0,0,0,0.05)',
                    fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Color */}
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Färg</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setEditColor(c)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: c,
                    boxShadow: editColor === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                />
              ))}
            </div>

            {/* Actions */}
            {confirmDeleteCatId === editingCat.id ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDeleteCatId(null)} style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: 'rgba(0,0,0,0.07)', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#64748B' }}>
                  Avbryt
                </button>
                <button onClick={() => deleteBlockCat(editingCat.id)} style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: '#DC2626', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'white' }}>
                  Ja, ta bort
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setConfirmDeleteCatId(editingCat.id)}
                  style={{ width: 48, height: 48, borderRadius: 14, border: 'none', background: 'rgba(220,38,38,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <Trash2 size={18} color="#DC2626" strokeWidth={2} />
                </button>
                <button
                  onClick={saveEditCat}
                  disabled={!editName.trim() || saving}
                  className="btn-primary"
                  style={{ flex: 1, padding: '13px', fontSize: 15, fontWeight: 700, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: !editName.trim() ? 0.5 : 1 }}
                >
                  <Check size={16} color="white" strokeWidth={2.5} />
                  {saving ? 'Sparar...' : 'Spara'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Add new block category sheet ──────────────────────────────────────── */}
      {showAddCat && (
        <>
          <div onClick={() => setShowAddCat(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001, borderRadius: '24px 24px 0 0', padding: '24px 20px calc(var(--safe-bottom) + 32px)', maxWidth: 520, margin: '0 auto' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '0 auto 24px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 24 }}>Ny kategori</h3>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Namn</label>
            <input
              autoFocus
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Kategorinamn..."
              className="glass-input"
              style={{ width: '100%', padding: '12px 16px', fontSize: 15, marginBottom: 20 }}
              onKeyDown={e => e.key === 'Enter' && createBlockCat()}
            />

            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Emoji</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {EMOJI_SUGGESTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setNewCatEmoji(e)}
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: newCatEmoji === e ? `2px solid ${newCatColor}` : '2px solid transparent',
                    background: newCatEmoji === e ? `${newCatColor}18` : 'rgba(0,0,0,0.05)',
                    fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Färg</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewCatColor(c)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: c,
                    boxShadow: newCatColor === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                />
              ))}
            </div>

            <button
              onClick={createBlockCat}
              disabled={!newCatName.trim() || creatingCat}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 16, opacity: !newCatName.trim() ? 0.5 : 1 }}
            >
              {creatingCat ? 'Skapar...' : 'Skapa kategori'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
