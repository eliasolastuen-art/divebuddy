'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, X, Settings, Check, Trash2, ChevronRight } from 'lucide-react'
import ExerciseModal from '@/components/ExerciseModal'
import type { ExerciseData } from '@/components/ExerciseModal'
import type { BlockCategoryRecord } from '@/types'

const PRESET_COLORS = [
  '#0D7377', '#D4A017', '#DC2626', '#16A34A',
  '#F97316', '#6366F1', '#0EA5E9', '#EC4899',
]

const EMOJI_SUGGESTIONS = ['💧', '🏃', '💪', '🧘', '🔥', '🏆', '🤸', '⚡', '🎯', '🌊', '🏋️', '🤽']

const MOOD_CHIPS = [
  { label: 'Alla', value: 'all' },
  { label: '🔥 Intensivt', value: 'intensivt' },
  { label: '🎯 Teknik', value: 'teknik' },
  { label: '😌 Lätt dag', value: 'latt' },
  { label: '🏆 Tävling', value: 'tavling' },
  { label: '💪 Styrka', value: 'styrka' },
]

const AI_QUICK_PROMPTS = ['Teknikfokus 90 min', 'Lätt återhämtning', 'Tävlingsförberedelse', 'Styrkepass']

const TEAL = '#0D7377'

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
  group_name: string | null
  dd: number | null
  notes: string | null
  tags: string[]
  category_id: string | null
  category_name: string | null
}

interface CategoryOption {
  id: string
  name: string
}

interface TrainingTemplate {
  id: string
  name: string
  group_id: string | null
  created_at: string
  blocks: { id: string; name: string; category: string | null }[]
}

interface FullBlockTemplate {
  id: string
  name: string
  category: string | null
  group_id: string | null
  created_at: string
  itemCount: number
}

type ActiveTab = 'utforska' | 'passmallar' | 'övningar'

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'Idag'
  if (days === 1) return 'Igår'
  return `${days} dagar sedan`
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
  const [selectedExercise, setSelectedExercise] = useState<ExerciseData | null>(null)

  const [activeTab, setActiveTab] = useState<ActiveTab>('utforska')
  const [activeMood, setActiveMood] = useState('all')
  const [showAISheet, setShowAISheet] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  const [editMode, setEditMode] = useState(false)
  const [editingCat, setEditingCat] = useState<BlockCategoryRecord | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null)

  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('🎯')
  const [newCatColor, setNewCatColor] = useState(TEAL)
  const [creatingCat, setCreatingCat] = useState(false)

  const [trainingTemplates, setTrainingTemplates] = useState<TrainingTemplate[]>([])
  const [fullBlockTemplates, setFullBlockTemplates] = useState<FullBlockTemplate[]>([])

  const loadData = async () => {
    const [blockCatsRes, catsRes, itemsRes, groupsRes, tmplRes, tmplCountRes, trainingTmplRes, fullBlockTmplRes] = await Promise.all([
      supabase.from('block_categories').select('*').order('sort_order'),
      supabase.from('categories').select('id, name, block_category'),
      supabase.from('library_items').select('id, name, code, group_name, dd, description, tags, category_id, categories(name)').eq('archived', false),
      supabase.from('groups').select('id, name, color').order('name'),
      supabase.from('block_templates').select('id, name, category, group_id').order('created_at', { ascending: false }).limit(8),
      supabase.from('block_templates').select('group_id, id').not('group_id', 'is', null),
      supabase.from('training_templates').select('id, name, group_id, created_at, training_template_blocks(id, name, category)').order('created_at', { ascending: false }),
      supabase.from('block_templates').select('id, name, category, group_id, created_at, block_template_items(id)').order('created_at', { ascending: false }),
    ])

    const blockCats: BlockCategoryRecord[] = blockCatsRes.data || []

    const items: SearchResult[] = (itemsRes.data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      code: item.code ?? null,
      group_name: item.group_name ?? null,
      dd: item.dd ?? null,
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
        id: g.id, name: g.name, color: g.color,
        templateCount: templateCountByGroup[g.id] || 0,
      }))
    )

    setRecentTemplates(
      (tmplRes.data || [])
        .filter((t: any) => !t.group_id)
        .slice(0, 6)
        .map((t: any) => ({ id: t.id, name: t.name, category: t.category }))
    )

    setTrainingTemplates(
      (trainingTmplRes.data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        group_id: t.group_id,
        created_at: t.created_at,
        blocks: (t.training_template_blocks || []).map((b: any) => ({ id: b.id, name: b.name, category: b.category })),
      }))
    )

    setFullBlockTemplates(
      (fullBlockTmplRes.data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        group_id: t.group_id,
        created_at: t.created_at,
        itemCount: (t.block_template_items || []).length,
      }))
    )

    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

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

  const recentItems = allItems.slice(0, 5).filter(item => {
    if (activeMood === 'all') return true
    return item.tags.some(t => t.toLowerCase().includes(activeMood))
  })

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
      name: editName.trim(), emoji: editEmoji, color: editColor,
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
      name: newCatName.trim(), emoji: newCatEmoji, color: newCatColor, sort_order: maxOrder,
    })
    setCreatingCat(false)
    setShowAddCat(false)
    setNewCatName('')
    setNewCatEmoji('🎯')
    setNewCatColor(TEAL)
    loadData()
  }

  const openNewExercise = () => { setSelectedExercise(null); setShowExerciseModal(true) }

  const openEditExercise = (item: SearchResult) => {
    setSelectedExercise({
      id: item.id, name: item.name, code: item.code, group_name: item.group_name,
      notes: item.notes, category_id: item.category_id ?? categoryOptions[0]?.id ?? '',
      tags: item.tags,
    })
    setShowExerciseModal(true)
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>

      {/* ── Sticky page header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(245,244,241,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: 0 }}>Library</h1>
          <button
            onClick={openNewExercise}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 20, background: TEAL, border: 'none', cursor: 'pointer' }}
          >
            <Plus size={13} color="white" strokeWidth={2.8} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Övning</span>
          </button>
        </div>

        <div style={{ padding: '0 16px 10px', position: 'relative' }}>
          <Search size={15} color="#94A3B8" strokeWidth={2} style={{ position: 'absolute', left: 30, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sök övningar och mallar..."
            className="glass-input"
            style={{ width: '100%', padding: '11px 36px', fontSize: 14 }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 26, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <X size={14} color="#94A3B8" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {!search.trim() && (
          <div style={{ display: 'flex', padding: '0 16px 10px', gap: 4 }}>
            {(['utforska', 'passmallar', 'övningar'] as ActiveTab[]).map(t => {
              const labels: Record<ActiveTab, string> = { utforska: 'Utforska', passmallar: 'Passmallar', övningar: 'Övningar' }
              const active = activeTab === t
              return (
                <button
                  key={t}
                  onClick={() => { setActiveTab(t); setEditMode(false) }}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? 'white' : '#64748B',
                    background: active ? TEAL : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {labels[t]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '16px 16px 0', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 16px)' }}>

        {search.trim() ? (
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
                    onClick={() => openEditExercise(item)}
                    className="glass-card"
                    style={{ width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: 18, border: 'none', cursor: 'pointer' }}
                  >
                    {item.code && <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: '0.06em', marginBottom: 3 }}>{item.code}</div>}
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: item.category_name ? 4 : 0 }}>{item.name}</div>
                    {item.category_name && <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{item.category_name}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Laddar...</div>

        ) : (
          <>

            {/* ─── UTFORSKA ─── */}
            {activeTab === 'utforska' && (
              <div>

                {/* AI strip */}
                <button
                  onClick={() => setShowAISheet(true)}
                  style={{
                    width: '100%', background: 'linear-gradient(135deg, #0D7377 0%, #064d50 100%)',
                    borderRadius: 18, padding: '16px 18px', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, textAlign: 'left',
                    boxShadow: '0 4px 20px rgba(13,115,119,0.25)',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 18 }}>✦</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>Generera pass med AI</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Beskriv vad du vill träna</div>
                  </div>
                  <ChevronRight size={20} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
                </button>

                {/* Mood chips */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
                  {MOOD_CHIPS.map(chip => {
                    const active = activeMood === chip.value
                    return (
                      <button
                        key={chip.value}
                        onClick={() => setActiveMood(chip.value)}
                        style={{
                          flexShrink: 0, padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                          fontSize: 13, fontWeight: active ? 700 : 500,
                          color: active ? 'white' : '#64748B',
                          background: active ? TEAL : 'rgba(0,0,0,0.06)',
                          transition: 'all 0.15s ease', whiteSpace: 'nowrap',
                        }}
                      >
                        {chip.label}
                      </button>
                    )
                  })}
                </div>

                {/* Inspiration cards */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                    Inspiration idag
                  </div>
                  <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                    {blockStats.slice(0, 6).map(stat => (
                      <button
                        key={stat.id}
                        onClick={() => router.push(`/library/${stat.id}`)}
                        style={{
                          flexShrink: 0, minWidth: 130, height: 140, borderRadius: 18, border: 'none', cursor: 'pointer',
                          textAlign: 'left', overflow: 'hidden', position: 'relative',
                          background: `linear-gradient(145deg, ${stat.color}dd 0%, ${stat.color}99 100%)`,
                          padding: '16px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          boxShadow: `0 4px 16px ${stat.color}33`,
                        }}
                      >
                        <div style={{ position: 'absolute', top: -16, right: -16, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
                        <div style={{ fontSize: 28, lineHeight: 1 }}>{stat.emoji}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{stat.name}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>
                            {stat.exerciseCount > 0 ? `${stat.exerciseCount} övningar` : 'Utforska'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent exercises */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                    Senast tillagda
                  </div>
                  {recentItems.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {recentItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => openEditExercise(item)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px', borderRadius: 12,
                            background: 'white', border: 'none', cursor: 'pointer', textAlign: 'left',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                          }}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'rgba(13,115,119,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: TEAL, textAlign: 'center', lineHeight: 1.2 }}>
                              {item.code ?? item.category_name?.slice(0, 3) ?? '—'}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                              {[item.category_name, item.dd != null ? `DD ${item.dd}` : null].filter(Boolean).join(' · ') || '—'}
                            </div>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: TEAL, flexShrink: 0 }}>
                            {item.dd != null ? item.dd : '—'}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px 16px', borderRadius: 14, background: 'white' }}>
                      <p style={{ fontSize: 13, color: '#94A3B8' }}>Inga övningar matchar</p>
                    </div>
                  )}
                </div>

                {/* Add exercise CTA */}
                <button
                  onClick={openNewExercise}
                  style={{
                    width: '100%', padding: 16, borderRadius: 18, background: 'transparent',
                    border: `1.5px dashed rgba(13,115,119,0.4)`, cursor: 'pointer',
                    color: TEAL, fontSize: 14, fontWeight: 700, opacity: 0.75,
                  }}
                >
                  + Lägg till övning
                </button>
              </div>
            )}

            {/* ─── PASSMALLAR ─── */}
            {activeTab === 'passmallar' && (
              <div>

                {/* AI strip */}
                <button
                  onClick={() => setShowAISheet(true)}
                  style={{
                    width: '100%', background: 'linear-gradient(135deg, #0D7377 0%, #064d50 100%)',
                    borderRadius: 18, padding: '16px 18px', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, textAlign: 'left',
                    boxShadow: '0 4px 20px rgba(13,115,119,0.25)',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 18 }}>✦</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>Skapa passmall med AI</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Beskriv upplägg så bygger AI mallen</div>
                  </div>
                  <ChevronRight size={20} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
                </button>

                {/* Träningsmallar section */}
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                  Träningsmallar
                </div>

                {trainingTemplates.length === 0 ? (
                  <div style={{ padding: '20px 16px', borderRadius: 16, background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', textAlign: 'center', marginBottom: 24 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Inga mallar än</p>
                    <p style={{ fontSize: 12, color: '#94A3B8' }}>Skapa ditt första pass i Planning och spara som mall</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                    {trainingTemplates.map(tmpl => {
                      const visibleBlocks = tmpl.blocks.slice(0, 4)
                      const overflow = tmpl.blocks.length - 4
                      return (
                        <div
                          key={tmpl.id}
                          style={{ background: 'white', borderRadius: 16, border: '0.5px solid rgba(0,0,0,0.08)', padding: 14 }}
                        >
                          {/* Top row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{tmpl.name}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: TEAL, background: 'rgba(13,115,119,0.1)', padding: '3px 9px', borderRadius: 20 }}>
                              {tmpl.blocks.length} block
                            </span>
                          </div>

                          {/* Block pills */}
                          {tmpl.blocks.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                              {visibleBlocks.map(block => {
                                const cat = blockStats.find(b => b.id === block.category)
                                const color = cat?.color ?? '#64748B'
                                return (
                                  <span
                                    key={block.id}
                                    style={{
                                      fontSize: 11, fontWeight: 600,
                                      color, background: `${color}14`,
                                      padding: '4px 10px', borderRadius: 20,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {block.name}
                                  </span>
                                )
                              })}
                              {overflow > 0 && (
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', padding: '4px 8px' }}>
                                  +{overflow} till
                                </span>
                              )}
                            </div>
                          )}

                          {/* Footer */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>Skapad {daysAgo(tmpl.created_at)}</span>
                            <button
                              onClick={() => router.push(`/planning?templateId=${tmpl.id}`)}
                              style={{ fontSize: 12, fontWeight: 700, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              Använd →
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Blockmallar section */}
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, marginTop: 4 }}>
                  Blockmallar
                </div>

                {fullBlockTemplates.length === 0 ? (
                  <div style={{ padding: '16px', borderRadius: 14, background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', textAlign: 'center', marginBottom: 20 }}>
                    <p style={{ fontSize: 13, color: '#94A3B8' }}>Inga blockmallar än</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {fullBlockTemplates.map(tmpl => {
                      const cat = blockStats.find(b => b.id === tmpl.category)
                      const dotColor = cat?.color ?? '#94A3B8'
                      return (
                        <button
                          key={tmpl.id}
                          onClick={() => router.push(`/library/blocks/${tmpl.id}`)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '12px 14px', borderRadius: 14,
                            background: 'white', border: '0.5px solid rgba(0,0,0,0.08)',
                            cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tmpl.name}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', background: 'rgba(0,0,0,0.05)', padding: '3px 9px', borderRadius: 20, flexShrink: 0 }}>
                            {tmpl.itemCount} övningar
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Save as template CTA */}
                <button
                  onClick={() => router.push('/planning')}
                  style={{
                    width: '100%', padding: '16px 16px 12px', borderRadius: 18,
                    background: 'transparent', border: `1.5px dashed rgba(13,115,119,0.4)`,
                    cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEAL }}>+ Spara nuvarande pass som mall</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 5, fontWeight: 500 }}>
                    Bygg ett pass i Planning och tryck "Spara som mall"
                  </div>
                </button>
              </div>
            )}

            {/* ─── ÖVNINGAR ─── */}
            {activeTab === 'övningar' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button
                    onClick={() => { setEditMode(e => !e); setEditingCat(null) }}
                    style={{ background: editMode ? TEAL : 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 12, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  >
                    <Settings size={14} color={editMode ? 'white' : '#64748B'} strokeWidth={2} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: editMode ? 'white' : '#64748B' }}>{editMode ? 'Klar' : 'Hantera'}</span>
                  </button>
                </div>

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
                        position: 'relative', height: 140, borderRadius: 20, border: 'none', cursor: 'pointer',
                        textAlign: 'left', overflow: 'hidden',
                        background: `linear-gradient(145deg, ${stat.color}dd 0%, ${stat.color}99 100%)`,
                        boxShadow: `0 4px 20px ${stat.color}44`,
                        padding: '18px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      }}
                    >
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

                  {editMode && (
                    <button
                      onClick={() => setShowAddCat(true)}
                      style={{ height: 140, borderRadius: 20, border: '2px dashed rgba(0,0,0,0.15)', cursor: 'pointer', background: 'rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={18} color="#94A3B8" strokeWidth={2.5} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8' }}>Ny kategori</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── ExerciseModal ── */}
      <ExerciseModal
        open={showExerciseModal}
        onClose={() => { setShowExerciseModal(false); setSelectedExercise(null) }}
        onSaved={loadData}
        categories={categoryOptions}
        exercise={selectedExercise}
      />

      {/* ── AI Sheet ── */}
      {showAISheet && (
        <>
          <div onClick={() => setShowAISheet(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001, padding: '16px 20px calc(env(safe-area-inset-bottom, 0px) + 28px)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Generera pass med AI</h2>
              <button onClick={() => setShowAISheet(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="Beskriv passet... t.ex. '90 min teknikpass för T-grupp'"
              rows={4}
              className="glass-input"
              style={{ width: '100%', padding: '12px 14px', fontSize: 14, marginBottom: 14, resize: 'none', boxSizing: 'border-box' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {AI_QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => setAiPrompt(p)}
                  style={{
                    padding: '7px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    border: `1.5px solid ${aiPrompt === p ? TEAL : 'rgba(0,0,0,0.1)'}`,
                    background: aiPrompt === p ? 'rgba(13,115,119,0.08)' : 'transparent',
                    color: aiPrompt === p ? TEAL : '#64748B',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => { console.log('AI generate:', aiPrompt); setShowAISheet(false) }}
              disabled={!aiPrompt.trim()}
              className="btn-primary"
              style={{ width: '100%', padding: 14, fontSize: 15, opacity: aiPrompt.trim() ? 1 : 0.4, marginBottom: 10 }}
            >
              Generera
            </button>
            <button
              onClick={() => setShowAISheet(false)}
              style={{ width: '100%', padding: 13, borderRadius: 14, background: 'rgba(0,0,0,0.05)', border: 'none', fontSize: 14, fontWeight: 600, color: '#64748B', cursor: 'pointer' }}
            >
              Avbryt
            </button>
          </div>
        </>
      )}

      {/* ── Edit block category sheet ── */}
      {editingCat && (
        <>
          <div onClick={() => setEditingCat(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001, borderRadius: '24px 24px 0 0', padding: '24px 20px calc(var(--safe-bottom, 0px) + 32px)', maxWidth: 520, margin: '0 auto' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '0 auto 24px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: `${editColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{editEmoji}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Redigera kategori</h3>
            </div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Namn</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px 16px', fontSize: 15, marginBottom: 20 }} />
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Emoji</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {EMOJI_SUGGESTIONS.map(e => (
                <button key={e} onClick={() => setEditEmoji(e)} style={{ width: 44, height: 44, borderRadius: 12, border: editEmoji === e ? `2px solid ${editColor}` : '2px solid transparent', background: editEmoji === e ? `${editColor}18` : 'rgba(0,0,0,0.05)', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{e}</button>
              ))}
            </div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Färg</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setEditColor(c)} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer', background: c, boxShadow: editColor === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none', transition: 'box-shadow 0.15s' }} />
              ))}
            </div>
            {confirmDeleteCatId === editingCat.id ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDeleteCatId(null)} style={{ flex: 1, padding: 13, borderRadius: 14, border: 'none', background: 'rgba(0,0,0,0.07)', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#64748B' }}>Avbryt</button>
                <button onClick={() => deleteBlockCat(editingCat.id)} style={{ flex: 1, padding: 13, borderRadius: 14, border: 'none', background: '#DC2626', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'white' }}>Ja, ta bort</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDeleteCatId(editingCat.id)} style={{ width: 48, height: 48, borderRadius: 14, border: 'none', background: 'rgba(220,38,38,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Trash2 size={18} color="#DC2626" strokeWidth={2} />
                </button>
                <button onClick={saveEditCat} disabled={!editName.trim() || saving} className="btn-primary" style={{ flex: 1, padding: 13, fontSize: 15, fontWeight: 700, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: !editName.trim() ? 0.5 : 1 }}>
                  <Check size={16} color="white" strokeWidth={2.5} />
                  {saving ? 'Sparar...' : 'Spara'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Add new block category sheet ── */}
      {showAddCat && (
        <>
          <div onClick={() => setShowAddCat(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001, borderRadius: '24px 24px 0 0', padding: '24px 20px calc(var(--safe-bottom, 0px) + 32px)', maxWidth: 520, margin: '0 auto' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '0 auto 24px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 24 }}>Ny kategori</h3>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Namn</label>
            <input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Kategorinamn..." className="glass-input" style={{ width: '100%', padding: '12px 16px', fontSize: 15, marginBottom: 20 }} onKeyDown={e => e.key === 'Enter' && createBlockCat()} />
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Emoji</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {EMOJI_SUGGESTIONS.map(e => (
                <button key={e} onClick={() => setNewCatEmoji(e)} style={{ width: 44, height: 44, borderRadius: 12, border: newCatEmoji === e ? `2px solid ${newCatColor}` : '2px solid transparent', background: newCatEmoji === e ? `${newCatColor}18` : 'rgba(0,0,0,0.05)', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{e}</button>
              ))}
            </div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Färg</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setNewCatColor(c)} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer', background: c, boxShadow: newCatColor === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none', transition: 'box-shadow 0.15s' }} />
              ))}
            </div>
            <button onClick={createBlockCat} disabled={!newCatName.trim() || creatingCat} className="btn-primary" style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 700, borderRadius: 16, opacity: !newCatName.trim() ? 0.5 : 1 }}>
              {creatingCat ? 'Skapar...' : 'Skapa kategori'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
