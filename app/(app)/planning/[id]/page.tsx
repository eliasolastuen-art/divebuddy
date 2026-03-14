'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PlanningFolder } from '@/types'
import TrainingBuilder from '../TrainingBuilder'
import { ArrowLeft, MoreHorizontal, Pencil, Copy, Trash2, LayoutList } from 'lucide-react'

const BLOCK_COLORS: Record<string, { color: string; emoji: string }> = {
  vatten:      { color: '#0D7377', emoji: '💧' },
  land:        { color: '#D4A017', emoji: '🏃' },
  styrka:      { color: '#DC2626', emoji: '💪' },
  rorlighet:   { color: '#16A34A', emoji: '🧘' },
  uppvarmning: { color: '#F97316', emoji: '🔥' },
  tavling:     { color: '#6366F1', emoji: '🏆' },
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  draft:     { bg: 'rgba(100,116,139,0.1)', text: '#64748B', label: 'Utkast' },
  published: { bg: 'rgba(13,115,119,0.1)',  text: '#0D7377', label: 'Publicerad' },
  completed: { bg: 'rgba(22,163,74,0.1)',   text: '#16A34A', label: 'Genomförd' },
}

export default function TrainingDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [training, setTraining] = useState<any>(null)
  const [blocks, setBlocks] = useState<any[]>([])
  const [folders, setFolders] = useState<PlanningFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  const trainingId = Array.isArray(id) ? id[0] : id as string

  const load = async () => {
    const supabase = createClient()
    const [{ data: t }, { data: f }] = await Promise.all([
      supabase.from('trainings').select('*').eq('id', trainingId).single(),
      supabase.from('planning_folders').select('*').order('sort_order'),
    ])
    if (t) setTraining(t)
    if (f) setFolders(f)

    const { data: blockData } = await supabase
      .from('training_blocks').select('*').eq('training_id', trainingId).order('sort_order')

    if (blockData && blockData.length > 0) {
      const blocksWithItems = await Promise.all(
        blockData.map(block =>
          supabase.from('training_block_items')
            .select('*, library_item:library_items(*)')
            .eq('block_id', block.id)
            .order('sort_order')
            .then(({ data: items }) => ({ ...block, items: items || [] }))
        )
      )
      setBlocks(blocksWithItems)
    } else {
      setBlocks([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [trainingId])

  const updateStatus = async (newStatus: string) => {
    const supabase = createClient()
    await supabase.from('trainings').update({ status: newStatus }).eq('id', trainingId)
    setTraining((t: any) => t ? { ...t, status: newStatus } : t)
  }

  const handleDelete = async () => {
    if (!confirm('Ta bort detta träningspass?')) return
    setDeleting(true)
    const supabase = createClient()
    for (const block of blocks) {
      await supabase.from('training_block_items').delete().eq('block_id', block.id)
    }
    await supabase.from('training_blocks').delete().eq('training_id', trainingId)
    await supabase.from('trainings').delete().eq('id', trainingId)
    router.replace('/planning')
  }

  const handleDuplicate = async () => {
    setDuplicating(true)
    setShowMenu(false)
    const supabase = createClient()

    const { data: newTraining } = await supabase.from('trainings').insert({
      club_id: training.club_id,
      title: training.title + ' (kopia)',
      folder_id: training.folder_id,
      scheduled_date: null,
      status: 'draft',
      training_type: training.training_type,
    }).select().single()

    if (newTraining) {
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i]
        const { data: newBlock } = await supabase.from('training_blocks').insert({
          training_id: newTraining.id,
          category: block.category,
          name: block.name,
          notes: block.notes,
          sort_order: i,
          block_type: block.block_type || 'standard',
        }).select().single()

        if (newBlock) {
          for (let j = 0; j < block.items.length; j++) {
            const item = block.items[j]
            await supabase.from('training_block_items').insert({
              block_id: newBlock.id,
              library_item_id: item.library_item_id,
              custom_name: item.custom_name,
              sets: item.sets,
              reps: item.reps,
              duration_seconds: item.duration_seconds,
              notes: item.notes,
              sort_order: j,
            })
          }
        }
      }
      router.push(`/planning/${newTraining.id}`)
    }
    setDuplicating(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#94A3B8' }}>
      Laddar...
    </div>
  )
  if (!training) return (
    <div style={{ padding: 24 }}>
      <p style={{ color: '#94A3B8' }}>Hittades inte.</p>
      <button onClick={() => router.back()} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', fontWeight: 600 }}>
        ← Tillbaka
      </button>
    </div>
  )

  const s = STATUS_STYLE[training.status] || STATUS_STYLE.draft
  const totalItems = blocks.reduce((sum: number, b: any) => sum + (b.items?.length || 0), 0)

  return (
    <>
      <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 100 }}>

        {/* Header row */}
        <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button
            onClick={() => router.back()}
            style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0,0,0,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} color="#0F172A" strokeWidth={2.5} />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: 0, flex: 1 }}>
            {training.title}
          </h1>
          <button
            onClick={() => setShowMenu(true)}
            style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0,0,0,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <MoreHorizontal size={18} color="#0F172A" strokeWidth={2.5} />
          </button>
        </div>

        {/* Meta chips */}
        <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            fontSize: 12, fontWeight: 700,
            background: s.bg, color: s.text,
            padding: '4px 12px', borderRadius: 9999,
          }}>{s.label}</span>
          {training.scheduled_date && (
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>
              {new Date(training.scheduled_date + 'T12:00:00').toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          )}
          <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
            {blocks.length} block · {totalItems} övningar
          </span>
        </div>

        {/* Status switcher */}
        <div style={{ padding: '0 16px 14px' }}>
          <div className="glass-card" style={{ padding: '14px 16px' }}>
            <div className="text-label" style={{ marginBottom: 10 }}>Status</div>
            <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.04)', padding: 4, borderRadius: 14 }}>
              {(['draft', 'published', 'completed'] as const).map(st => {
                const ss = STATUS_STYLE[st]
                const isActive = training.status === st
                return (
                  <button
                    key={st}
                    onClick={() => updateStatus(st)}
                    style={{
                      flex: 1, padding: '8px 6px', borderRadius: 10,
                      border: 'none',
                      background: isActive ? 'white' : 'transparent',
                      boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                      fontSize: 12, fontWeight: 700,
                      color: isActive ? ss.text : '#94A3B8',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {ss.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Edit button */}
        <div style={{ padding: '0 16px 20px' }}>
          <button
            onClick={() => setShowEdit(true)}
            className="btn-primary"
            style={{
              width: '100%', padding: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 15, cursor: 'pointer', borderRadius: 14,
            }}
          >
            <Pencil size={16} strokeWidth={2.5} />
            Redigera pass
          </button>
        </div>

        {/* Blocks */}
        <div style={{ padding: '0 16px' }}>
          {blocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <div style={{
                width: 60, height: 60, borderRadius: 18,
                background: 'rgba(13,115,119,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <LayoutList size={26} color="#0D7377" strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginBottom: 4 }}>Inga block ännu</p>
              <p style={{ fontSize: 13, color: '#94A3B8' }}>Tryck Redigera för att lägga till</p>
            </div>
          ) : (
            blocks.map((block: any) => {
              const cat = BLOCK_COLORS[block.category] || { color: '#64748B', emoji: '📋' }
              return (
                <div key={block.id} className="glass-card" style={{ marginBottom: 14, overflow: 'hidden', padding: 0 }}>
                  {/* Block header */}
                  <div style={{
                    background: `linear-gradient(135deg, ${cat.color}ee, ${cat.color}bb)`,
                    padding: '13px 18px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'white', flex: 1 }}>{block.name}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      background: 'rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.9)',
                      padding: '3px 9px', borderRadius: 9999,
                    }}>
                      {block.items?.length || 0} övn
                    </span>
                  </div>

                  {/* Block items */}
                  <div style={{ padding: '8px 18px 12px' }}>
                    {(!block.items || block.items.length === 0) ? (
                      <div style={{ padding: '10px 0', color: '#94A3B8', fontSize: 13 }}>Inga övningar</div>
                    ) : (
                      block.items.map((item: any, ii: number) => {
                        const name = item.library_item?.name || item.custom_name || '–'
                        const dd = item.library_item?.dd
                        return (
                          <div key={item.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '11px 0',
                            borderBottom: ii < block.items.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{name}</div>
                              {dd && (
                                <span style={{ fontSize: 11, color: '#D4A017', fontWeight: 700 }}>DD {dd}</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 14, marginLeft: 12 }}>
                              {item.sets && (
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{item.sets}</div>
                                  <div style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Set</div>
                                </div>
                              )}
                              {item.reps && (
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{item.reps}</div>
                                  <div style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Reps</div>
                                </div>
                              )}
                              {item.duration_seconds && (
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{item.duration_seconds}</div>
                                  <div style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Sek</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Action menu */}
      {showMenu && (
        <>
          <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 400 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401, padding: '16px 16px calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />

            {[
              { onClick: () => { setShowMenu(false); setShowEdit(true) }, Icon: Pencil, label: 'Redigera pass', color: '#0F172A', bg: 'rgba(0,0,0,0.04)' },
              { onClick: handleDuplicate, Icon: Copy, label: duplicating ? 'Kopierar...' : 'Duplicera pass', color: '#0F172A', bg: 'rgba(0,0,0,0.04)' },
            ].map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                style={{
                  width: '100%', padding: '15px 18px',
                  borderRadius: 14, border: 'none',
                  background: action.bg,
                  fontSize: 15, fontWeight: 600, color: action.color,
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 14,
                  marginBottom: 8,
                }}
              >
                <action.Icon size={18} strokeWidth={2} />
                {action.label}
              </button>
            ))}

            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                width: '100%', padding: '15px 18px',
                borderRadius: 14, border: 'none',
                background: 'rgba(220,38,38,0.08)',
                fontSize: 15, fontWeight: 600, color: '#DC2626',
                cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <Trash2 size={18} strokeWidth={2} />
              {deleting ? 'Tar bort...' : 'Ta bort pass'}
            </button>
          </div>
        </>
      )}

      {showEdit && (
        <TrainingBuilder
          folders={folders}
          existingTraining={training}
          existingBlocks={blocks}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load() }}
        />
      )}
    </>
  )
}
