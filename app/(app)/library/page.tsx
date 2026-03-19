'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, X } from 'lucide-react'
import ExerciseModal from '@/components/ExerciseModal'

const BLOCK_CATEGORIES = [
  { id: 'vatten',      label: 'Vatten',      emoji: '💧', color: '#0D7377' },
  { id: 'land',        label: 'Land',        emoji: '🏃', color: '#D4A017' },
  { id: 'styrka',      label: 'Styrka',      emoji: '💪', color: '#DC2626' },
  { id: 'rorlighet',   label: 'Rörlighet',   emoji: '🧘', color: '#16A34A' },
  { id: 'uppvarmning', label: 'Uppvärmning', emoji: '🔥', color: '#F97316' },
  { id: 'tavling',     label: 'Tävling',     emoji: '🏆', color: '#6366F1' },
] as const

interface BlockCategoryStat {
  blockType: string
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

// For ExerciseModal
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

  const loadData = async () => {
    const [catsRes, itemsRes, groupsRes, tmplRes, tmplCountRes] = await Promise.all([
      supabase.from('categories').select('id, name, block_category'),
      supabase.from('library_items').select('id, name, code, description, tags, category_id, categories(name)').eq('archived', false),
      supabase.from('groups').select('id, name, color').order('name'),
      supabase.from('block_templates').select('id, name, category, group_id').order('created_at', { ascending: false }).limit(8),
      supabase.from('block_templates').select('group_id, id').not('group_id', 'is', null),
    ])

    // Build exercise search data
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

    // Build category options for ExerciseModal
    const cats = catsRes.data || []
    setCategoryOptions(cats.map((c: any) => ({ id: c.id, name: c.name })))

    // Block category stats
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
      BLOCK_CATEGORIES.map(bc => ({
        blockType: bc.id,
        subCategoryCount: subCatByBlock[bc.id]?.subs ?? 0,
        exerciseCount: subCatByBlock[bc.id]?.exercises ?? 0,
      }))
    )

    // Group template counts
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

    // Recent global templates (no group_id)
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

  const BLOCK_CAT_BY_ID = Object.fromEntries(BLOCK_CATEGORIES.map(c => [c.id, c]))

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 14px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em', marginBottom: 16 }}>
          Library
        </h1>

        {/* Search */}
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

      {/* Content */}
      <div style={{ padding: '4px 16px 120px' }}>

        {search.trim() ? (

          /* ── Search results ─────────────────────────────────────────── */
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
            {/* ── 6 Block category cards ──────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
              {blockStats.map(stat => {
                const bc = BLOCK_CAT_BY_ID[stat.blockType]
                if (!bc) return null
                return (
                  <button
                    key={bc.id}
                    onClick={() => router.push(`/library/${bc.id}`)}
                    className="glass-card"
                    style={{
                      padding: '20px 18px',
                      borderRadius: 20,
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      minHeight: 120,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderTop: `3px solid ${bc.color}`,
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 10 }}>{bc.emoji}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 4 }}>{bc.label}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                        {stat.subCategoryCount > 0
                          ? `${stat.subCategoryCount} grupp${stat.subCategoryCount !== 1 ? 'er' : ''} · ${stat.exerciseCount} övn.`
                          : 'Inga kategorier'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* ── Grupper ─────────────────────────────────────────────── */}
            {groups.length > 0 && (
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

            {/* ── Senaste mallar ───────────────────────────────────────── */}
            {recentTemplates.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Senaste mallar
                </div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {recentTemplates.map(tmpl => {
                    const cat = BLOCK_CAT_BY_ID[tmpl.category ?? ''] ?? { emoji: '📋', color: '#64748B' }
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
                          borderTop: `3px solid ${'color' in cat ? cat.color : '#64748B'}`,
                        }}
                      >
                        <div style={{ fontSize: 18, marginBottom: 6 }}>{cat.emoji}</div>
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

      {/* FAB — create exercise */}
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
        onSaved={loadData}
        categories={categoryOptions}
      />
    </div>
  )
}
