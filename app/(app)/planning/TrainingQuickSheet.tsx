'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Pencil, Copy } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickBlock {
  id: string
  name: string
  category: string
  items: { id: string; name: string; reps?: number; sets?: number }[]
}

interface TrainingQuickSheetProps {
  trainingId: string
  trainingTitle: string
  trainingStatus: string
  groupName?: string
  scheduledDate?: string
  onClose: () => void
  onEdit: () => void
  onDuplicate: () => void
}

const BLOCK_META: Record<string, { emoji: string; color: string }> = {
  vatten:      { emoji: '💧', color: '#0D7377' },
  land:        { emoji: '🏃', color: '#D4A017' },
  styrka:      { emoji: '💪', color: '#DC2626' },
  rorlighet:   { emoji: '🧘', color: '#16A34A' },
  uppvarmning: { emoji: '🔥', color: '#F97316' },
  tavling:     { emoji: '🏆', color: '#6366F1' },
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  draft:     { bg: 'rgba(100,116,139,0.10)', text: '#64748B', label: 'Utkast'    },
  published: { bg: 'rgba(13,115,119,0.10)',  text: '#0D7377', label: 'Publicerad' },
  completed: { bg: 'rgba(22,163,74,0.10)',   text: '#16A34A', label: 'Genomförd'  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrainingQuickSheet({
  trainingId, trainingTitle, trainingStatus,
  groupName, scheduledDate,
  onClose, onEdit, onDuplicate,
}: TrainingQuickSheetProps) {
  const [blocks,  setBlocks]  = useState<QuickBlock[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('training_blocks')
        .select(`
          id, name, category,
          training_block_items(id, custom_name, reps, sets, sort_order, library_item:library_items(name))
        `)
        .eq('training_id', trainingId)
        .order('sort_order')

      if (data) {
        setBlocks(data.map((b: any) => ({
          id:       b.id,
          name:     b.name,
          category: b.category,
          items: (b.training_block_items || [])
            .sort((a: any, z: any) => a.sort_order - z.sort_order)
            .map((it: any) => ({
              id:   it.id,
              name: it.library_item?.name || it.custom_name || '–',
              reps: it.reps ?? undefined,
              sets: it.sets ?? undefined,
            })),
        })))
      }
      setLoading(false)
    }
    load()
  }, [trainingId])

  const s           = STATUS_STYLE[trainingStatus] || STATUS_STYLE.draft
  const totalItems  = blocks.reduce((sum, b) => sum + b.items.length, 0)
  const dateLabel   = scheduledDate
    ? new Date(scheduledDate + 'T12:00:00').toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.45)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          zIndex: 1000,
        }}
      />

      {/* Sheet */}
      <div
        className="glass-sheet"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 1001,
          maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          padding: 0,
        }}
      >
        {/* Drag handle */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 16px' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '0 20px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.2 }}>
                {trainingTitle}
              </h2>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.text, padding: '3px 9px', borderRadius: 9999 }}>
                  {s.label}
                </span>
                {groupName && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#0D7377', background: 'rgba(13,115,119,0.08)', padding: '3px 9px', borderRadius: 9999 }}>
                    👥 {groupName}
                  </span>
                )}
                {dateLabel && (
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                    📅 {dateLabel}
                  </span>
                )}
                <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
                  {blocks.length} block · {totalItems} övn
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}
            >
              <X size={14} color="#64748B" strokeWidth={2.5} />
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />
        </div>

        {/* Blocks list — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 16 }}>
              {[1,2].map(i => <div key={i} style={{ height: 60, borderRadius: 14, background: 'rgba(0,0,0,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
            </div>
          ) : blocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 14 }}>
              Inga block i detta pass än
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16 }}>
              {blocks.map(block => {
                const meta = BLOCK_META[block.category] || { emoji: '📋', color: '#64748B' }
                return (
                  <div key={block.id} style={{
                    background: `${meta.color}08`,
                    border: `1px solid ${meta.color}20`,
                    borderRadius: 16, padding: '12px 14px',
                  }}>
                    {/* Block header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: block.items.length > 0 ? 10 : 0 }}>
                      <span style={{ fontSize: 16 }}>{meta.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{block.name}</span>
                      <span style={{ fontSize: 11, color: meta.color, opacity: 0.7, marginLeft: 'auto', fontWeight: 600 }}>
                        {block.items.length} övn
                      </span>
                    </div>

                    {/* Items */}
                    {block.items.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {block.items.slice(0, 4).map(item => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.sets && item.sets > 1 ? `${item.sets}×` : ''}{item.name}
                            </span>
                            {item.reps && (
                              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600, flexShrink: 0 }}>
                                {item.reps} reps
                              </span>
                            )}
                          </div>
                        ))}
                        {block.items.length > 4 && (
                          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>
                            +{block.items.length - 4} till…
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{
          padding: '16px 20px calc(var(--safe-bottom) + 24px)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', gap: 10, flexShrink: 0,
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
          <button
            onClick={onDuplicate}
            style={{
              flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.09)',
              background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
              fontSize: 14, fontWeight: 700, color: '#475569', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <Copy size={15} strokeWidth={2.2} />
            Duplicera
          </button>
          <button
            onClick={onEdit}
            className="btn-primary"
            style={{
              flex: 2, padding: '13px', borderRadius: 14,
              fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <Pencil size={15} strokeWidth={2.2} />
            Redigera pass
          </button>
        </div>
      </div>
    </>
  )
}
