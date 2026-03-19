'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight, Plus, Pencil, Trash2, X, Check, Search } from 'lucide-react'
import ExerciseModal, { type ExerciseData } from '@/components/ExerciseModal'

// ─── Constants ───────────────────────────────────────────────────────────────

const BLOCK_CATEGORIES = [
  { id: 'vatten',      label: 'Vatten',      emoji: '💧', color: '#0D7377' },
  { id: 'land',        label: 'Land',        emoji: '🏃', color: '#D4A017' },
  { id: 'styrka',      label: 'Styrka',      emoji: '💪', color: '#DC2626' },
  { id: 'rorlighet',   label: 'Rörlighet',   emoji: '🧘', color: '#16A34A' },
  { id: 'uppvarmning', label: 'Uppvärmning', emoji: '🔥', color: '#F97316' },
  { id: 'tavling',     label: 'Tävling',     emoji: '🏆', color: '#6366F1' },
] as const

const BLOCK_TYPE_KEYS = BLOCK_CATEGORIES.map(c => c.id) as string[]
const BLOCK_CAT_BY_ID = Object.fromEntries(BLOCK_CATEGORIES.map(c => [c.id, c]))

// ─── Types ────────────────────────────────────────────────────────────────────

interface FolderRow {
  id: string
  name: string
  sort_order: number
  child_count: number
}

interface ExerciseRow {
  id: string
  name: string
  code: string | null
  group_name: string | null
  notes: string | null
  tags: string[]
  category_id: string
}

interface TemplateCard {
  id: string
  name: string
  item_count: number
}

interface Crumb {
  label: string
  href: string
}

// ─── FolderView ───────────────────────────────────────────────────────────────

function FolderView({ blockType, categoryId }: { blockType?: string; categoryId?: string }) {
  const router = useRouter()
  const supabase = createClient()
  const bc = blockType ? BLOCK_CAT_BY_ID[blockType] : null

  const [folders, setFolders]           = useState<FolderRow[]>([])
  const [exercises, setExercises]       = useState<ExerciseRow[]>([])
  const [templates, setTemplates]       = useState<TemplateCard[]>([])
  const [allCategories, setAllCategories] = useState<{ id: string; name: string }[]>([])
  const [breadcrumb, setBreadcrumb]     = useState<Crumb[]>([])
  const [blockCat, setBlockCat]         = useState<string | null>(blockType ?? null)
  const [loading, setLoading]           = useState(true)

  // Search & filter
  const [search, setSearch]             = useState('')
  const [activeTag, setActiveTag]       = useState<string | null>(null)

  // Inline rename
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [renameValue, setRenameValue]   = useState('')

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]         = useState(false)

  // Create sheet
  const [showCreate, setShowCreate]     = useState(false)
  const [createType, setCreateType]     = useState<'folder' | 'exercise'>('folder')
  const [createName, setCreateName]     = useState('')
  const [creating, setCreating]         = useState(false)

  // Exercise modal
  const [showExModal, setShowExModal]   = useState(false)
  const [selectedEx, setSelectedEx]     = useState<ExerciseData | null>(null)

  // ─── Load data ──────────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true)

    if (blockType) {
      // Root of a block type: categories WHERE block_category = blockType AND parent_id IS NULL
      const [catsRes, tmplRes, allCatsRes] = await Promise.all([
        supabase.from('categories')
          .select('id, name, sort_order')
          .eq('block_category', blockType)
          .is('parent_id', null)
          .order('sort_order'),
        supabase.from('block_templates')
          .select('id, name, category, block_template_items(id)')
          .eq('category', blockType)
          .is('group_id', null)
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').eq('block_category', blockType).order('sort_order'),
      ])

      const cats = catsRes.data || []
      const catIds = cats.map(c => c.id)
      const childCounts: Record<string, number> = {}

      if (catIds.length > 0) {
        const [subRes, exRes] = await Promise.all([
          supabase.from('categories').select('parent_id').in('parent_id', catIds),
          supabase.from('library_items').select('category_id').in('category_id', catIds).eq('archived', false),
        ])
        ;(subRes.data || []).forEach((r: any) => {
          if (r.parent_id) childCounts[r.parent_id] = (childCounts[r.parent_id] || 0) + 1
        })
        ;(exRes.data || []).forEach((r: any) => {
          if (r.category_id) childCounts[r.category_id] = (childCounts[r.category_id] || 0) + 1
        })
      }

      setFolders(cats.map((c: any) => ({
        id: c.id, name: c.name, sort_order: c.sort_order ?? 0,
        child_count: childCounts[c.id] || 0,
      })))
      setTemplates((tmplRes.data || []).map((t: any) => ({
        id: t.id, name: t.name, item_count: (t.block_template_items || []).length,
      })))
      setAllCategories(allCatsRes.data || [])
      setExercises([])
      setBreadcrumb([
        { label: 'Library', href: '/library' },
        { label: `${bc!.emoji} ${bc!.label}`, href: '' },
      ])

    } else if (categoryId) {
      // Sub-folder level — fetch category first to get block_category
      const { data: cat } = await supabase.from('categories').select('id, name, block_category, parent_id').eq('id', categoryId).single()
      if (!cat) { setLoading(false); return }

      setBlockCat(cat.block_category ?? null)

      const [subFoldersRes, exRes, allCatsRes] = await Promise.all([
        supabase.from('categories').select('id, name, sort_order').eq('parent_id', categoryId).order('sort_order'),
        supabase.from('library_items')
          .select('id, name, code, group_name, description, tags, category_id')
          .eq('category_id', categoryId).eq('archived', false)
          .order('code').order('group_name').order('name'),
        supabase.from('categories').select('id, name').eq('block_category', cat.block_category ?? '').order('sort_order'),
      ])

      const subFolders = subFoldersRes.data || []
      const subIds = subFolders.map((f: any) => f.id)
      const childCounts: Record<string, number> = {}

      if (subIds.length > 0) {
        const [gcRes, seRes] = await Promise.all([
          supabase.from('categories').select('parent_id').in('parent_id', subIds),
          supabase.from('library_items').select('category_id').in('category_id', subIds).eq('archived', false),
        ])
        ;(gcRes.data || []).forEach((r: any) => {
          if (r.parent_id) childCounts[r.parent_id] = (childCounts[r.parent_id] || 0) + 1
        })
        ;(seRes.data || []).forEach((r: any) => {
          if (r.category_id) childCounts[r.category_id] = (childCounts[r.category_id] || 0) + 1
        })
      }

      setFolders(subFolders.map((f: any) => ({
        id: f.id, name: f.name, sort_order: f.sort_order ?? 0,
        child_count: childCounts[f.id] || 0,
      })))
      setExercises((exRes.data || []).map((e: any) => ({
        id: e.id, name: e.name, code: e.code ?? null,
        group_name: e.group_name ?? null, notes: e.description ?? null,
        tags: e.tags ?? [], category_id: e.category_id,
      })))
      setAllCategories(allCatsRes.data || [])

      // Build breadcrumb by walking up parent chain
      const crumbs: Crumb[] = [{ label: cat.name, href: '' }]
      let current: any = cat
      const visited = new Set<string>()
      visited.add(current.id)

      while (current.parent_id && !visited.has(current.parent_id)) {
        visited.add(current.parent_id)
        const { data: parent } = await supabase
          .from('categories').select('id, name, block_category, parent_id')
          .eq('id', current.parent_id).single()
        if (!parent) break
        crumbs.unshift({ label: parent.name, href: `/library/${parent.id}` })
        current = parent
      }

      // Add block type root
      const rootBcId = current.block_category ?? cat.block_category
      if (rootBcId && BLOCK_CAT_BY_ID[rootBcId]) {
        const rootBc = BLOCK_CAT_BY_ID[rootBcId]
        crumbs.unshift({ label: `${rootBc.emoji} ${rootBc.label}`, href: `/library/${rootBc.id}` })
      }
      crumbs.unshift({ label: 'Library', href: '/library' })
      setBreadcrumb(crumbs)
    }

    setLoading(false)
  }

  useEffect(() => { loadData() }, [blockType, categoryId])

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  const saveRename = async (id: string) => {
    const trimmed = renameValue.trim()
    setEditingId(null)
    if (!trimmed) return
    const current = folders.find(f => f.id === id)
    if (current && trimmed === current.name) return
    await supabase.from('categories').update({ name: trimmed }).eq('id', id)
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: trimmed } : f))
  }

  const deleteFolder = async (id: string) => {
    setDeleting(true)
    await supabase.from('categories').delete().eq('id', id)
    setFolders(prev => prev.filter(f => f.id !== id))
    setConfirmDeleteId(null)
    setDeleting(false)
  }

  const createFolder = async () => {
    if (!createName.trim()) return
    setCreating(true)
    const maxOrder = folders.length > 0 ? Math.max(...folders.map(f => f.sort_order)) + 1 : 0
    const insertData: Record<string, unknown> = { name: createName.trim(), sort_order: maxOrder }
    if (blockType) {
      insertData.block_category = blockType
    } else if (categoryId) {
      insertData.parent_id = categoryId
      insertData.block_category = blockCat
    }
    const { data } = await supabase.from('categories').insert(insertData).select().single()
    setCreating(false)
    if (data) {
      setFolders(prev => [...prev, { id: data.id, name: data.name, sort_order: data.sort_order ?? maxOrder, child_count: 0 }])
    }
    setCreateName('')
    setShowCreate(false)
  }

  // ─── Filtering ───────────────────────────────────────────────────────────────

  const allTags = Array.from(new Set(exercises.flatMap(e => e.tags))).sort()
  const accentColor = bc?.color ?? (blockCat ? BLOCK_CAT_BY_ID[blockCat as keyof typeof BLOCK_CAT_BY_ID]?.color : undefined) ?? '#0D7377'

  const filteredFolders = search.trim()
    ? folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : folders

  const filteredExercises = exercises.filter(ex => {
    if (search.trim()) {
      const q = search.toLowerCase()
      const code = ex.code && ex.group_name ? `${ex.code}${ex.group_name}` : ex.code ?? ''
      if (!ex.name.toLowerCase().includes(q) && !code.toLowerCase().includes(q) && !(ex.notes?.toLowerCase().includes(q))) return false
    }
    if (activeTag && !ex.tags.includes(activeTag)) return false
    return true
  })

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>

      {/* Breadcrumb + search */}
      <div style={{ padding: '16px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
          {breadcrumb.map((crumb, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <span style={{ fontSize: 12, color: '#CBD5E1', userSelect: 'none' }}>/</span>}
              {crumb.href ? (
                <button
                  onClick={() => router.push(crumb.href)}
                  style={{ fontSize: 13, fontWeight: 600, color: accentColor, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
                >
                  {crumb.label}
                </button>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{crumb.label}</span>
              )}
            </span>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={14} color="#94A3B8" strokeWidth={2} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sök i mappen..."
            className="glass-input"
            style={{ width: '100%', padding: '10px 36px', fontSize: 14 }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <X size={13} color="#94A3B8" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Tag chips */}
      {!loading && allTags.length > 0 && !search && (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: activeTag === tag ? accentColor : 'rgba(0,0,0,0.06)', color: activeTag === tag ? 'white' : '#64748B', transition: 'all 0.15s' }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '0 16px 140px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Laddar...</div>
        ) : (
          <>
            {/* Block templates (only at block type root) */}
            {blockType && !search && templates.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Mallar</div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/library/blocks/${t.id}`)}
                      style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 12, border: 'none', background: `${accentColor}12`, cursor: 'pointer', textAlign: 'left', minWidth: 110, maxWidth: 160, borderLeft: `3px solid ${accentColor}` }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{t.item_count} övn.</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {filteredFolders.length === 0 && filteredExercises.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  {search || activeTag ? 'Inga resultat' : 'Tom mapp'}
                </p>
                <p style={{ fontSize: 13, color: '#94A3B8' }}>
                  {search || activeTag ? 'Prova ett annat sökord' : 'Tryck + för att skapa en mapp eller övning'}
                </p>
              </div>
            )}

            {/* Folder list */}
            {filteredFolders.length > 0 && (
              <div className="glass-card" style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 10 }}>
                {filteredFolders.map((folder, i) => (
                  <div key={folder.id}>
                    {i > 0 && <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', marginLeft: 52 }} />}

                    {editingId === folder.id ? (
                      /* Rename row */
                      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10 }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>📁</span>
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => saveRename(folder.id)}
                          onKeyDown={e => { if (e.key === 'Enter') saveRename(folder.id); if (e.key === 'Escape') setEditingId(null) }}
                          className="glass-input"
                          style={{ flex: 1, padding: '7px 12px', fontSize: 14, fontWeight: 600, borderRadius: 10 }}
                        />
                        <button
                          onClick={() => saveRename(folder.id)}
                          style={{ background: accentColor, border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                        >
                          <Check size={14} color="white" strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                        >
                          <X size={14} color="#64748B" strokeWidth={2.5} />
                        </button>
                      </div>

                    ) : confirmDeleteId === folder.id ? (
                      /* Delete confirm row */
                      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 10, background: 'rgba(220,38,38,0.04)' }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>📁</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Ta bort "{folder.name}"?
                          </div>
                          {folder.child_count > 0 && (
                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                              {folder.child_count} objekt inuti raderas också
                            </div>
                          )}
                        </div>
                        <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.06)', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#64748B', flexShrink: 0 }}>
                          Avbryt
                        </button>
                        <button onClick={() => deleteFolder(folder.id)} disabled={deleting} style={{ padding: '5px 12px', borderRadius: 8, background: '#DC2626', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                          Ta bort
                        </button>
                      </div>

                    ) : (
                      /* Normal row */
                      <div style={{ display: 'flex', alignItems: 'center', minHeight: 54 }}>
                        <button
                          onClick={() => router.push(`/library/${folder.id}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <span style={{ fontSize: 20, flexShrink: 0 }}>📁</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{folder.name}</div>
                            {folder.child_count > 0 && (
                              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{folder.child_count} objekt</div>
                            )}
                          </div>
                          <ChevronRight size={15} color="#CBD5E1" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                        </button>
                        <div style={{ display: 'flex', gap: 2, paddingRight: 10, flexShrink: 0 }}>
                          <button
                            onClick={() => { setEditingId(folder.id); setRenameValue(folder.name); setConfirmDeleteId(null) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 7, borderRadius: 8, display: 'flex' }}
                          >
                            <Pencil size={14} color="#CBD5E1" strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => { setConfirmDeleteId(folder.id); setEditingId(null) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 7, borderRadius: 8, display: 'flex' }}
                          >
                            <Trash2 size={14} color="#FCA5A5" strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Exercise list */}
            {filteredExercises.length > 0 && (
              <div className="glass-card" style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 10 }}>
                {filteredExercises.map((ex, i) => {
                  const codeLabel = ex.code && ex.group_name ? `${ex.code}${ex.group_name}` : ex.code ?? ''
                  return (
                    <div key={ex.id}>
                      {i > 0 && <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', marginLeft: 52 }} />}
                      <button
                        onClick={() => { setSelectedEx(ex as ExerciseData); setShowExModal(true) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {codeLabel && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: '0.05em', marginBottom: 1 }}>{codeLabel}</div>
                          )}
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{ex.name}</div>
                          {ex.notes && (
                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.notes}</div>
                          )}
                        </div>
                        <ChevronRight size={14} color="#CBD5E1" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Inline quick-add folder at bottom */}
            {!search && !activeTag && (
              <button
                onClick={() => { setShowCreate(true); setCreateType('folder'); setCreateName('') }}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: '1.5px dashed rgba(0,0,0,0.12)', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Plus size={14} strokeWidth={2.5} /> Ny mapp
              </button>
            )}
          </>
        )}
      </div>

      {/* FAB — create exercise or folder */}
      <button
        onClick={() => { setShowCreate(true); setCreateType('exercise'); setCreateName('') }}
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
          right: 20,
          width: 56, height: 56,
          borderRadius: 18,
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 20px ${accentColor}44`,
          zIndex: 50,
        }}
      >
        <Plus size={24} color="white" strokeWidth={2.5} />
      </button>

      {/* Create sheet */}
      {showCreate && (
        <>
          <div onClick={() => setShowCreate(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300 }} />
          <div
            className="glass-sheet"
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 400, borderRadius: '24px 24px 0 0', padding: '24px 20px 48px', maxWidth: 520, margin: '0 auto' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '0 auto 20px' }} />

            {/* Toggle: folder | exercise */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: 4, borderRadius: 12, gap: 4, marginBottom: 20 }}>
              {(['folder', 'exercise'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setCreateType(type)}
                  style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: createType === type ? 'white' : 'transparent', color: createType === type ? '#0F172A' : '#94A3B8', boxShadow: createType === type ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}
                >
                  {type === 'folder' ? '📁 Ny mapp' : '🏊 Ny övning'}
                </button>
              ))}
            </div>

            {createType === 'folder' ? (
              <>
                <input
                  autoFocus
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="Mappnamn..."
                  className="glass-input"
                  style={{ width: '100%', padding: '12px 16px', fontSize: 15, marginBottom: 14 }}
                  onKeyDown={e => e.key === 'Enter' && createFolder()}
                />
                <button
                  onClick={createFolder}
                  disabled={!createName.trim() || creating}
                  className="btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 16, opacity: !createName.trim() ? 0.5 : 1 }}
                >
                  {creating ? 'Skapar...' : 'Skapa mapp'}
                </button>
              </>
            ) : (
              <button
                onClick={() => { setShowCreate(false); setSelectedEx(null); setShowExModal(true) }}
                className="btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 16 }}
              >
                Öppna övningsformulär
              </button>
            )}
          </div>
        </>
      )}

      {/* Exercise modal */}
      <ExerciseModal
        open={showExModal}
        onClose={() => setShowExModal(false)}
        onSaved={loadData}
        categories={allCategories}
        initialCategoryId={categoryId}
        exercise={selectedEx}
      />
    </div>
  )
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export default function CategoryPage() {
  const params = useParams()
  const categoryId = params.categoryId as string
  if (BLOCK_TYPE_KEYS.includes(categoryId)) {
    return <FolderView blockType={categoryId} />
  }
  return <FolderView categoryId={categoryId} />
}
