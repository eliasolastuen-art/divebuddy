'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Search, X } from 'lucide-react'
import ExerciseModal, { type ExerciseData } from '@/components/ExerciseModal'

interface Category {
  id: string
  name: string
}

interface AddToTrainingForm {
  sets: string
  reps: string
  height: string
}

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const categoryId = params.categoryId as string
  const supabase = createClient()

  const [categoryName, setCategoryName] = useState('')
  const [exercises, setExercises] = useState<ExerciseData[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Edit/create exercise modal
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseData | null>(null)

  // Add-to-training modal
  const [addTarget, setAddTarget] = useState<ExerciseData | null>(null)
  const [addForm, setAddForm] = useState<AddToTrainingForm>({ sets: '', reps: '', height: '' })

  const loadData = async () => {
    const [catRes, exRes, allCatsRes] = await Promise.all([
      supabase.from('categories').select('name').eq('id', categoryId).single(),
      supabase
        .from('library_items')
        .select('id, name, code, group_name, description, category_id')
        .eq('category_id', categoryId)
        .eq('archived', false)
        .order('code', { ascending: true })
        .order('group_name', { ascending: true })
        .order('name', { ascending: true }),
      supabase.from('categories').select('id, name').order('sort_order'),
    ])

    if (catRes.data) setCategoryName(catRes.data.name)
    if (exRes.data) {
      setExercises(exRes.data.map((e: any) => ({
        id: e.id,
        name: e.name,
        code: e.code ?? null,
        group_name: e.group_name ?? null,
        notes: e.description ?? null,
        category_id: e.category_id,
      })))
    }
    if (allCatsRes.data) setCategories(allCatsRes.data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [categoryId])

  // Combined code label: "101" + "B" → "101B"
  const codeLabel = (ex: ExerciseData) =>
    ex.code && ex.group_name ? `${ex.code}${ex.group_name}` : ex.code ?? ''

  // Client-side search — also matches the combined codeLabel
  const filtered = search.trim()
    ? exercises.filter(ex => {
        const q = search.toLowerCase()
        return (
          ex.name.toLowerCase().includes(q) ||
          codeLabel(ex).toLowerCase().includes(q) ||
          (ex.notes?.toLowerCase().includes(q))
        )
      })
    : exercises

  // Group by code (exercises without a code go to '__other__')
  const grouped = filtered.reduce((acc, ex) => {
    const key = ex.code ?? '__other__'
    if (!acc[key]) acc[key] = []
    acc[key].push(ex)
    return acc
  }, {} as Record<string, ExerciseData[]>)

  // Sort group keys numerically; '__other__' always last
  const groupKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '__other__') return 1
    if (b === '__other__') return -1
    return a.localeCompare(b, undefined, { numeric: true })
  })

  const openAdd = () => {
    setSelectedExercise(null)
    setShowExerciseModal(true)
  }

  const openEdit = (ex: ExerciseData) => {
    setSelectedExercise(ex)
    setShowExerciseModal(true)
  }

  const openAddToTraining = (e: React.MouseEvent, ex: ExerciseData) => {
    e.stopPropagation()
    setAddForm({ sets: '', reps: '', height: '' })
    setAddTarget(ex)
  }

  const handleAddToTraining = () => {
    if (!addTarget) return
    console.log('Add to training:', {
      exerciseId: addTarget.id,
      name: addTarget.name,
      sets: addForm.sets ? parseInt(addForm.sets) : null,
      reps: addForm.reps ? parseInt(addForm.reps) : null,
      height: addForm.height || null,
    })
    setAddTarget(null)
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button
            onClick={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <ArrowLeft size={18} color="#0F172A" strokeWidth={2} />
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>
            {categoryName || '…'}
          </h1>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} color="#94A3B8" strokeWidth={2} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises…"
            className="glass-input"
            style={{ width: '100%', padding: '11px 36px', fontSize: 14 }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <X size={13} color="#94A3B8" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Exercise list */}
      <div style={{ padding: '4px 16px 120px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
              {search ? 'No results' : 'No exercises yet'}
            </p>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>
              {search ? 'Try a different search' : 'Tap + to add the first exercise'}
            </p>
          </div>
        ) : (
          <div>
            {groupKeys.map(key => (
              <div key={key} style={{ marginBottom: 18 }}>
                {/* Section header — only for coded groups */}
                {key !== '__other__' && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', marginBottom: 6, paddingLeft: 2 }}>
                    {key}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {grouped[key].map(ex => {
                    const label = codeLabel(ex)
                    return (
                      <div
                        key={ex.id}
                        className="glass-card"
                        style={{ borderRadius: 18, overflow: 'hidden' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {/* Main tap area → edit */}
                          <button
                            onClick={() => openEdit(ex)}
                            style={{ flex: 1, textAlign: 'left', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', minWidth: 0 }}
                          >
                            {label && (
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#0D7377', letterSpacing: '0.06em', marginBottom: 3 }}>
                                {label}
                              </div>
                            )}
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{ex.name}</div>
                            {ex.notes && (
                              <div style={{
                                fontSize: 12, color: '#94A3B8', marginTop: 4, lineHeight: 1.4,
                                display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                              } as React.CSSProperties}>
                                {ex.notes}
                              </div>
                            )}
                          </button>

                          {/* Add-to-training button */}
                          <button
                            onClick={e => openAddToTraining(e, ex)}
                            style={{
                              flexShrink: 0,
                              width: 44,
                              height: 44,
                              margin: '0 10px',
                              borderRadius: 12,
                              background: 'rgba(13,115,119,0.09)',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Plus size={18} color="#0D7377" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
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

      {/* Exercise edit/create modal */}
      <ExerciseModal
        open={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onSaved={loadData}
        categories={categories}
        initialCategoryId={categoryId}
        exercise={selectedExercise}
      />

      {/* Add-to-training modal */}
      {addTarget && (
        <>
          <div
            onClick={() => setAddTarget(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100 }}
          />
          <div
            className="glass-sheet"
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, padding: '16px 20px calc(env(safe-area-inset-bottom, 0px) + 28px)' }}
          >
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Add to training</div>
                {codeLabel(addTarget) && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0D7377', letterSpacing: '0.05em', marginBottom: 2 }}>{codeLabel(addTarget)}</div>
                )}
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>{addTarget.name}</div>
              </div>
              <button
                onClick={() => setAddTarget(null)}
                style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <X size={14} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '20px 0 20px' }}>
              {([
                { key: 'sets', label: 'Sets', placeholder: '3' },
                { key: 'reps', label: 'Reps', placeholder: '10' },
                { key: 'height', label: 'Height', placeholder: '1m' },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <div className="text-label" style={{ marginBottom: 7 }}>{label}</div>
                  <input
                    value={addForm[key]}
                    onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="glass-input"
                    style={{ width: '100%', padding: '11px 12px', fontSize: 15, textAlign: 'center' }}
                    inputMode={key !== 'height' ? 'numeric' : 'text'}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleAddToTraining}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 15, cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        </>
      )}
    </div>
  )
}
