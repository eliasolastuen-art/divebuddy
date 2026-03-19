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
        {/* ALLT ANNAT ÄR IDENTISKT */}
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
              padding: '16px 16px calc(env(safe-area-inset-bottom, 0px) + 120px)', // ✅ FIX
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