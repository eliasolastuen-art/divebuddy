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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#94A3B8' }}>Laddar...</div>
  if (!training) return <div style={{ padding: 24 }}><p style={{ color: '#94A3B8' }}>Hittades inte.</p></div>

  const s = STATUS_STYLE[training.status] || STATUS_STYLE.draft
  const totalItems = blocks.reduce((sum: number, b: any) => sum + (b.items?.length || 0), 0)

  return (
    <>
      <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 100 }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 16px', height: 56,
          background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <button
            onClick={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <ArrowLeft size={16} color="#0F172A" strokeWidth={2.5} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {training.title}
            </div>
            {totalItems > 0 && (
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{totalItems} övningar</div>
            )}
          </div>
          <button
            onClick={() => setShowMenu(true)}
            style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <MoreHorizontal size={18} color="#0F172A" strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: '16px 16px 0' }}>

          {/* ── Meta card ────────────────────────────────────────────────────── */}
          <div className="glass-card" style={{ padding: '16px 18px', marginBottom: 16, borderRadius: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Status badge */}
              <span style={{ padding: '4px 10px', borderRadius: 20, background: s.bg, color: s.text, fontSize: 12, fontWeight: 700 }}>
                {s.label}
              </span>
              {/* Mode badge */}
              {training.mode && training.mode !== 'training' && (
                <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', color: '#6366F1', fontSize: 12, fontWeight: 700 }}>
                  {training.mode === 'test' ? 'Test' : 'Tävling'}
                </span>
              )}
              {/* Date */}
              {training.scheduled_date && (
                <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>
                  {new Date(training.scheduled_date).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>

            {training.notes && (
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 10, lineHeight: 1.5, marginBottom: 0 }}>
                {training.notes}
              </p>
            )}
          </div>

          {/* ── Status actions ───────────────────────────────────────────────── */}
          {training.status === 'draft' && (
            <button
              onClick={() => updateStatus('published')}
              style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #0D7377, #0a5a5d)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 16, boxShadow: '0 3px 12px rgba(13,115,119,0.3)' }}
            >
              Publicera pass
            </button>
          )}
          {training.status === 'published' && (
            <button
              onClick={() => updateStatus('draft')}
              style={{ width: '100%', padding: '13px', borderRadius: 14, border: '1.5px solid rgba(100,116,139,0.2)', background: 'transparent', color: '#64748B', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}
            >
              Ångra publicering
            </button>
          )}

          {/* ── Blocks ───────────────────────────────────────────────────────── */}
          {blocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Inga block</p>
              <p style={{ fontSize: 13, color: '#94A3B8' }}>Redigera passet för att lägga till övningar.</p>
            </div>
          ) : (
            blocks.map(block => {
              const bc = BLOCK_COLORS[block.category] ?? { color: '#64748B', emoji: '📋' }
              return (
                <div key={block.id} style={{ marginBottom: 16 }}>
                  {/* Block header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingLeft: 2 }}>
                    <span style={{ fontSize: 16 }}>{bc.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: bc.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      {block.name}
                    </span>
                    {block.notes && (
                      <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginLeft: 4 }}>— {block.notes}</span>
                    )}
                  </div>

                  {/* Items */}
                  <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    {(block.items || []).length === 0 ? (
                      <div style={{ padding: '14px 16px', fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>Inga övningar i detta block</div>
                    ) : (
                      (block.items || []).map((item: any, ii: number) => {
                        const itemName = item.library_item?.name || item.custom_name || '–'
                        const setsPrefix = item.sets && item.sets > 1 ? `${item.sets} × ` : ''
                        return (
                          <div
                            key={item.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: ii < (block.items.length - 1) ? '1px solid rgba(0,0,0,0.05)' : 'none' }}
                          >
                            <div style={{ width: 28, height: 28, borderRadius: 9, background: `${bc.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: bc.color }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{setsPrefix}{itemName}</div>
                              {item.notes && (
                                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.notes}</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                              {item.reps && (
                                <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(100,116,139,0.08)', color: '#475569', padding: '3px 8px', borderRadius: 9999 }}>
                                  🔁 {item.reps}
                                </span>
                              )}
                              {item.duration_seconds && (
                                <span style={{ fontSize: 11, fontWeight: 700, background: `${bc.color}12`, color: bc.color, padding: '3px 8px', borderRadius: 9999 }}>
                                  ⏱ {Math.floor(item.duration_seconds / 60)}:{String(item.duration_seconds % 60).padStart(2, '0')}
                                </span>
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

          {/* ── Edit button ──────────────────────────────────────────────────── */}
          <button
            onClick={() => setShowEdit(true)}
            style={{ width: '100%', padding: '13px', borderRadius: 14, border: '1.5px dashed rgba(0,0,0,0.12)', background: 'transparent', fontSize: 14, fontWeight: 700, color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}
          >
            <LayoutList size={16} strokeWidth={2} />
            Redigera pass
          </button>
        </div>
      </div>

      {/* Action menu */}
      {showMenu && (
        <>
          <div
            onClick={() => setShowMenu(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.4)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 9998, // ✅ FIX
            }}
          />
          <div
            className="glass-sheet"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 9999, // ✅ FIX
              padding: '16px 16px calc(var(--safe-bottom) + 40px)',
            }}
          >
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />

            {[
              { onClick: () => { setShowMenu(false); setShowEdit(true) }, Icon: Pencil, label: 'Redigera pass', color: '#0F172A', bg: 'rgba(0,0,0,0.04)' },
              { onClick: handleDuplicate, Icon: Copy, label: duplicating ? 'Kopierar...' : 'Duplicera pass', color: '#0F172A', bg: 'rgba(0,0,0,0.04)' },
            ].map((action, i) => (
              <button key={i} onClick={action.onClick} style={{ width: '100%', padding: '15px 18px', borderRadius: 14, border: 'none', background: action.bg, fontSize: 15, fontWeight: 600, color: action.color, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                <action.Icon size={18} strokeWidth={2} />
                {action.label}
              </button>
            ))}

            <button onClick={handleDelete} disabled={deleting} style={{ width: '100%', padding: '15px 18px', borderRadius: 14, border: 'none', background: 'rgba(220,38,38,0.08)', fontSize: 15, fontWeight: 600, color: '#DC2626', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
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