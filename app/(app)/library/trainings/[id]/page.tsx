'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ChevronDown } from 'lucide-react'

const BLOCK_CATEGORIES = [
  { id: 'vatten',      label: 'Vatten',      emoji: '💧', color: '#0D7377' },
  { id: 'land',        label: 'Land',        emoji: '🏃', color: '#D4A017' },
  { id: 'styrka',      label: 'Styrka',      emoji: '💪', color: '#DC2626' },
  { id: 'rorlighet',   label: 'Rörlighet',   emoji: '🧘', color: '#16A34A' },
  { id: 'uppvarmning', label: 'Uppvärmning', emoji: '🔥', color: '#F97316' },
  { id: 'tavling',     label: 'Tävling',     emoji: '🏆', color: '#6366F1' },
] as const
const CAT_BY_ID = Object.fromEntries(BLOCK_CATEGORIES.map(c => [c.id, c]))

interface TemplateBlock {
  id: string
  name: string
  category: string | null
  notes: string | null
  sort_order: number
  items: {
    id: string
    library_item_id: string | null
    custom_name: string | null
    sets: number | null
    reps: number | null
    height: string | null
    duration_seconds: number | null
    notes: string | null
    order_index: number
    library_item?: { name: string; code: string | null; group_name: string | null } | null
  }[]
}

interface TrainingTemplate {
  id: string
  name: string
  group_id: string | null
  created_at: string
}

export default function TrainingTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [template, setTemplate] = useState<TrainingTemplate | null>(null)
  const [blocks, setBlocks] = useState<TemplateBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())

  const load = async () => {
    const [tmplRes, blocksRes] = await Promise.all([
      supabase.from('training_templates').select('id, name, group_id, created_at').eq('id', id).single(),
      supabase
        .from('training_template_blocks')
        .select('id, name, category, notes, sort_order, training_template_items(id, library_item_id, custom_name, sets, reps, height, duration_seconds, notes, order_index, library_items(name, code, group_name))')
        .eq('training_template_id', id)
        .order('sort_order'),
    ])
    if (tmplRes.data) setTemplate(tmplRes.data)
    if (blocksRes.data) {
      setBlocks(blocksRes.data.map((b: any) => ({
        id: b.id,
        name: b.name,
        category: b.category,
        notes: b.notes,
        sort_order: b.sort_order,
        items: (b.training_template_items || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((it: any) => ({
            id: it.id,
            library_item_id: it.library_item_id,
            custom_name: it.custom_name,
            sets: it.sets,
            reps: it.reps,
            height: it.height,
            duration_seconds: it.duration_seconds,
            notes: it.notes,
            order_index: it.order_index,
            library_item: it.library_items ?? null,
          })),
      })))
      // Expand all blocks by default
      setExpandedBlocks(new Set(blocksRes.data.map((b: any) => b.id)))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev)
      next.has(blockId) ? next.delete(blockId) : next.add(blockId)
      return next
    })
  }

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <button onClick={() => router.back()} style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <ArrowLeft size={18} color="#0F172A" strokeWidth={2} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 4 }}>
            {template?.name ?? '…'}
          </h1>
          {!loading && (
            <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>
              {blocks.length} block · {blocks.reduce((s, b) => s + b.items.length, 0)} övningar
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '4px 16px 160px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Laddar...</div>
        ) : blocks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#475569' }}>Mallen är tom</p>
          </div>
        ) : (
          blocks.map(block => {
            const cat = block.category ? CAT_BY_ID[block.category as keyof typeof CAT_BY_ID] : null
            const expanded = expandedBlocks.has(block.id)
            return (
              <div key={block.id} className="glass-card" style={{ marginBottom: 12, overflow: 'hidden', padding: 0 }}>
                {/* Block header */}
                <button
                  onClick={() => toggleBlock(block.id)}
                  style={{ width: '100%', background: cat ? `linear-gradient(135deg, ${cat.color}ee, ${cat.color}aa)` : 'linear-gradient(135deg, #64748Bee, #64748Baa)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontSize: 18 }}>{cat?.emoji ?? '📋'}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'white', flex: 1 }}>{block.name}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{block.items.length} övn.</span>
                  <ChevronDown size={14} strokeWidth={2.5} color="white" style={{ transform: expanded ? 'none' : 'rotate(-90deg)', transition: 'transform 0.18s ease', flexShrink: 0 }} />
                </button>

                {expanded && (
                  <div style={{ padding: '10px 14px' }}>
                    {block.notes && (
                      <div style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic', marginBottom: 10, padding: '6px 10px', background: 'rgba(0,0,0,0.03)', borderRadius: 8 }}>
                        {block.notes}
                      </div>
                    )}
                    {block.items.map((item, idx) => {
                      const name = item.library_item?.name ?? item.custom_name ?? '–'
                      const code = item.library_item?.code
                      const groupName = item.library_item?.group_name
                      const codeLabel = code && groupName ? `${code}${groupName}` : code ?? ''
                      const params: string[] = []
                      if (item.sets) params.push(`${item.sets} set`)
                      if (item.reps) params.push(`${item.reps} reps`)
                      if (item.height) params.push(item.height)
                      if (item.duration_seconds) params.push(formatDuration(item.duration_seconds))
                      return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: idx < block.items.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                          <div style={{ width: 22, height: 22, borderRadius: 7, background: cat ? `${cat.color}20` : 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: cat?.color ?? '#64748B' }}>{idx + 1}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {codeLabel && <div style={{ fontSize: 11, fontWeight: 700, color: '#0D7377', letterSpacing: '0.05em', marginBottom: 2 }}>{codeLabel}</div>}
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{name}</div>
                            {params.length > 0 && (
                              <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{params.join(' · ')}</div>
                            )}
                            {item.notes && (
                              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3, fontStyle: 'italic' }}>{item.notes}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
