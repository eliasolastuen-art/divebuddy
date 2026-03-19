'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MOCK_SESSION } from '@/lib/context/session'
import { getISOWeekNumber } from '@/lib/utils/week'
import {
  Plus, FolderPlus, ChevronRight, FileText, X,
  Clock, Users, Copy, Trash2, ChevronDown,
} from 'lucide-react'
import type { PlanningFolder } from '@/types'
import TrainingBuilder from './TrainingBuilder'
import TrainingQuickSheet from './TrainingQuickSheet'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrainingRow {
  id: string
  title: string
  status: 'draft' | 'published' | 'completed'
  training_type: string
  scheduled_date?: string
  folder_id?: string
  group_id?: string
  purpose?: string
  purpose_type?: string
  groups?: { name: string; color: string } | null
}

interface WeekGroup {
  label: string
  weekNum: number | null
  dateKey: string          // for sort / collapse key
  items: TrainingRow[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FOLDER_COLORS = ['#0D7377','#D4A017','#6366F1','#EC4899','#10B981','#F97316','#3B82F6','#8B5CF6']

const STATUS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:     { bg: 'rgba(100,116,139,0.10)', text: '#64748B', dot: '#94A3B8', label: 'Utkast'    },
  published: { bg: 'rgba(13,115,119,0.10)',  text: '#0D7377', dot: '#0D7377', label: 'Publicerad' },
  completed: { bg: 'rgba(22,163,74,0.10)',   text: '#16A34A', dot: '#16A34A', label: 'Genomförd'  },
}

const BLOCK_EMOJIS: Record<string, string> = {
  vatten: '💧', land: '🏃', styrka: '💪',
  rorlighet: '🧘', uppvarmning: '🔥', tavling: '🏆',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekLabel(dateStr: string, todayStr: string): { label: string; weekNum: number; dateKey: string } {
  const date    = new Date(dateStr + 'T12:00:00')
  const today   = new Date(todayStr + 'T12:00:00')
  const weekNum = getISOWeekNumber(date)

  // Start of the week (Monday) for both
  const dayOfWeek   = (date.getDay() + 6) % 7   // 0=Mon
  const dayToday    = (today.getDay() + 6) % 7
  const mondayDate  = new Date(date);  mondayDate.setDate(date.getDate() - dayOfWeek)
  const mondayToday = new Date(today); mondayToday.setDate(today.getDate() - dayToday)

  const diffWeeks = Math.round((mondayDate.getTime() - mondayToday.getTime()) / (7 * 24 * 60 * 60 * 1000))

  let label: string
  if (diffWeeks === 0)  label = `Denna vecka  ·  v.${weekNum}`
  else if (diffWeeks === 1)  label = `Nästa vecka  ·  v.${weekNum}`
  else if (diffWeeks === -1) label = `Förra veckan  ·  v.${weekNum}`
  else if (diffWeeks < 0)    label = `v.${weekNum}  ·  ${mondayDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}`
  else                       label = `v.${weekNum}  ·  ${mondayDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}`

  return { label, weekNum, dateKey: mondayDate.toISOString().split('T')[0] }
}

function groupByWeek(trainings: TrainingRow[], todayStr: string): WeekGroup[] {
  const map: Record<string, WeekGroup> = {}

  for (const t of trainings) {
    if (!t.scheduled_date) continue
    const { label, weekNum, dateKey } = getWeekLabel(t.scheduled_date, todayStr)
    if (!map[dateKey]) map[dateKey] = { label, weekNum, dateKey, items: [] }
    map[dateKey].items.push(t)
  }

  return Object.values(map).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

// ─── Swipeable Card ───────────────────────────────────────────────────────────

function SwipeCard({
  training, folders, today,
  onTap, onDuplicate, onDelete,
}: {
  training: TrainingRow
  folders: PlanningFolder[]
  today: string
  onTap: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const startX   = useRef(0)
  const currentX = useRef(0)
  const [offset,    setOffset]    = useState(0)
  const [revealing, setRevealing] = useState<'left' | 'right' | null>(null)

  const s          = STATUS[training.status] || STATUS.draft
  const groupName  = (training as any).groups?.name  as string | undefined
  const groupColor = (training as any).groups?.color as string | undefined
  const isToday    = training.scheduled_date === today
  const isPast     = training.scheduled_date && training.scheduled_date < today && training.status !== 'completed'
  const folder     = folders.find(f => f.id === training.folder_id)

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current   = e.clientX
    currentX.current = e.clientX
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!e.buttons) return
    const dx = e.clientX - startX.current
    currentX.current = e.clientX
    setOffset(dx)
    if (dx < -20)      setRevealing('left')
    else if (dx > 20)  setRevealing('right')
    else               setRevealing(null)
  }

  const onPointerUp = () => {
    const dx = currentX.current - startX.current
    if (dx < -80)     { onDuplicate(); reset() }
    else if (dx > 80) { onDelete();    reset() }
    else               reset()
  }

  const reset = () => { setOffset(0); setRevealing(null) }

  const clampedOffset = Math.max(-120, Math.min(120, offset))

  return (
    <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', marginBottom: 0 }}>
      {/* Left action (swipe right → delete) */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 100,
        background: 'rgba(220,38,38,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: revealing === 'right' ? 'none' : 'opacity 0.2s',
        opacity: revealing === 'right' ? 1 : 0,
        borderRadius: '18px 0 0 18px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <Trash2 size={18} color="#DC2626" strokeWidth={2} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626' }}>Ta bort</span>
        </div>
      </div>

      {/* Right action (swipe left → duplicate) */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 100,
        background: 'rgba(13,115,119,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: revealing === 'left' ? 'none' : 'opacity 0.2s',
        opacity: revealing === 'left' ? 1 : 0,
        borderRadius: '0 18px 18px 0',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <Copy size={18} color="#0D7377" strokeWidth={2} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#0D7377' }}>Duplicera</span>
        </div>
      </div>

      {/* Card */}
      <div
        className="glass-card"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={() => { if (Math.abs(offset) < 8) onTap() }}
        style={{
          padding: '14px 16px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          borderLeft: `3px solid ${s.dot}`,
          borderRadius: 18,
          opacity: isPast ? 0.6 : 1,
          transform: `translateX(${clampedOffset}px)`,
          transition: offset === 0 ? 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
          userSelect: 'none',
          touchAction: 'pan-y',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Status dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: s.dot, flexShrink: 0,
          boxShadow: training.status === 'published' ? `0 0 0 3px ${s.dot}28` : 'none',
        }} />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {training.title}
          </div>

          {/* Meta row: status + group · folder + date */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.text, padding: '2px 8px', borderRadius: 9999 }}>
              {s.label}
            </span>
            {(groupName || folder) && (
              <span style={{ fontSize: 11, fontWeight: 600, color: groupColor || '#64748B' }}>
                {[groupName, folder?.name].filter(Boolean).join(' · ')}
              </span>
            )}
            {training.scheduled_date && (
              <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? '#0D7377' : '#64748B', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={9} strokeWidth={2.5} />
                {isToday ? 'Idag' : new Date(training.scheduled_date + 'T12:00:00').toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          {/* Purpose */}
          {training.purpose && (
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
              <span>🎯</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {training.purpose}
              </span>
            </div>
          )}
        </div>

        <ChevronRight size={15} color="#CBD5E1" strokeWidth={2.5} style={{ flexShrink: 0 }} />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlanningListView() {
  const router = useRouter()

  const [folders,         setFolders]         = useState<PlanningFolder[]>([])
  const [trainings,       setTrainings]       = useState<TrainingRow[]>([])
  const [loading,         setLoading]         = useState(true)
  const [activeFolder,    setActiveFolder]    = useState<string | null>(null)
  const [collapsedWeeks,  setCollapsedWeeks]  = useState<Set<string>>(new Set())
  const [showBuilder,     setShowBuilder]     = useState(false)
  const [editTraining,    setEditTraining]    = useState<TrainingRow | null>(null)
  const [quickSheet,      setQuickSheet]      = useState<TrainingRow | null>(null)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [newFolderName,   setNewFolderName]   = useState('')
  const [newFolderColor,  setNewFolderColor]  = useState(FOLDER_COLORS[0])
  const [savingFolder,    setSavingFolder]    = useState(false)
  const [existingBlocks,  setExistingBlocks]  = useState<any[]>([])

  const today = new Date().toISOString().split('T')[0]

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: f }, { data: t }] = await Promise.all([
      supabase.from('planning_folders').select('*').order('sort_order'),
      supabase
        .from('trainings')
        .select('id, title, status, training_type, scheduled_date, folder_id, group_id, purpose, purpose_type, groups(name, color)')
        .eq('club_id', MOCK_SESSION.clubId)
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false }),
    ])
    if (f) setFolders(f)
    if (t) setTrainings(t as unknown as TrainingRow[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Folder create ─────────────────────────────────────────────────────────

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    setSavingFolder(true)
    await createClient().from('planning_folders').insert({
      club_id: MOCK_SESSION.clubId, coach_id: MOCK_SESSION.coachId,
      name: newFolderName.trim(), color: newFolderColor, sort_order: folders.length,
    })
    setSavingFolder(false)
    setNewFolderName('')
    setShowFolderModal(false)
    load()
  }

  // ── Duplicate ─────────────────────────────────────────────────────────────

  const handleDuplicate = async (t: TrainingRow) => {
    const supabase = createClient()
    const { data: newT } = await supabase.from('trainings').insert({
      club_id:        MOCK_SESSION.clubId,
      title:          t.title + ' (kopia)',
      folder_id:      t.folder_id || null,
      group_id:       t.group_id  || null,
      scheduled_date: null,
      status:         'draft',
      training_type:  t.training_type || 'training',
    }).select().single()

    if (newT) {
      const { data: blocks } = await supabase
        .from('training_blocks').select('*').eq('training_id', t.id).order('sort_order')

      if (blocks) {
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i]
          const { data: nb } = await supabase.from('training_blocks').insert({
            training_id: newT.id, category: b.category, name: b.name,
            notes: b.notes, sort_order: i, block_type: b.block_type || 'standard',
          }).select().single()

          if (nb) {
            const { data: items } = await supabase
              .from('training_block_items').select('*').eq('block_id', b.id).order('sort_order')
            if (items) {
              for (let j = 0; j < items.length; j++) {
                const it = items[j]
                await supabase.from('training_block_items').insert({
                  block_id: nb.id, library_item_id: it.library_item_id,
                  custom_name: it.custom_name, sets: it.sets, reps: it.reps,
                  duration_seconds: it.duration_seconds, notes: it.notes, sort_order: j,
                })
              }
            }
          }
        }
      }
      load()
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (t: TrainingRow) => {
    if (!confirm(`Ta bort "${t.title}"?`)) return
    const supabase = createClient()
    const { data: blocks } = await supabase.from('training_blocks').select('id').eq('training_id', t.id)
    if (blocks) {
      for (const b of blocks) {
        await supabase.from('training_block_items').delete().eq('block_id', b.id)
      }
      await supabase.from('training_blocks').delete().eq('training_id', t.id)
    }
    await supabase.from('trainings').delete().eq('id', t.id)
    load()
  }

  // ── Open for edit ─────────────────────────────────────────────────────────

  const openForEdit = async (t: TrainingRow) => {
    const supabase = createClient()
    const { data: blockData } = await supabase
      .from('training_blocks').select('*').eq('training_id', t.id).order('sort_order')

    if (blockData && blockData.length > 0) {
      const withItems = await Promise.all(
        blockData.map(b =>
          supabase.from('training_block_items')
            .select('*, library_item:library_items(*)')
            .eq('block_id', b.id).order('sort_order')
            .then(({ data: items }) => ({ ...b, items: items || [] }))
        )
      )
      setExistingBlocks(withItems)
    } else {
      setExistingBlocks([])
    }
    setEditTraining(t)
    setQuickSheet(null)
    setShowBuilder(true)
  }

  // ── Toggle week collapse ──────────────────────────────────────────────────

  const toggleWeek = (key: string) => {
    setCollapsedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else               next.add(key)
      return next
    })
  }

  // ── Filtered data ─────────────────────────────────────────────────────────

  const visible    = activeFolder ? trainings.filter(t => t.folder_id === activeFolder) : trainings
  const scheduled  = visible.filter(t =>  t.scheduled_date)
  const unscheduled = visible.filter(t => !t.scheduled_date)
  const weekGroups = groupByWeek(scheduled, today)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '0 16px' }}>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button
          onClick={() => { setEditTraining(null); setExistingBlocks([]); setShowBuilder(true) }}
          className="btn-primary"
          style={{ flex: 1, padding: '12px 14px', fontSize: 14, cursor: 'pointer', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Nytt pass
        </button>
        <button
          onClick={() => setShowFolderModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0,0,0,0.09)', borderRadius: 14,
            padding: '12px 14px', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer',
          }}
        >
          <FolderPlus size={15} strokeWidth={2.2} />
          Mapp
        </button>
      </div>

      {/* Folder chips */}
      {folders.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 20 }}>
          {[
            { id: null as null, name: 'Alla', color: '#0F172A', count: trainings.length },
            ...folders.map(f => ({ id: f.id, name: f.name, color: (f as any).color || '#0D7377', count: trainings.filter(t => t.folder_id === f.id).length })),
          ].map(item => {
            const isActive = activeFolder === item.id
            return (
              <button
                key={item.id ?? 'all'}
                onClick={() => setActiveFolder(item.id)}
                style={{
                  flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  padding: '11px 14px', minWidth: 88, borderRadius: 16, border: 'none',
                  background: isActive ? item.color : 'rgba(255,255,255,0.75)',
                  backdropFilter: 'blur(8px)', cursor: 'pointer',
                  boxShadow: isActive ? `0 4px 16px ${item.color}40` : '0 1px 4px rgba(0,0,0,0.04)',
                  transition: 'all 0.18s ease',
                }}
              >
                <span style={{ fontSize: 17, marginBottom: 5 }}>{item.id ? '📁' : '📋'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? 'white' : '#0F172A', marginBottom: 2 }}>{item.name}</span>
                <span style={{ fontSize: 11, color: isActive ? 'rgba(255,255,255,0.7)' : '#94A3B8', fontWeight: 500 }}>{item.count} pass</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Swipe hint (first load only) */}
      {!loading && visible.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
            ← Svep för att duplicera  ·  Svep → för att ta bort
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 76, borderRadius: 18, background: 'rgba(0,0,0,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>

      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(13,115,119,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FileText size={28} color="#0D7377" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
            {trainings.length === 0 ? 'Inga träningspass ännu' : 'Inga pass i den här mappen'}
          </p>
          <p style={{ fontSize: 13, color: '#94A3B8' }}>
            {trainings.length === 0 ? 'Tryck "Nytt pass" för att börja planera' : 'Välj en annan mapp eller skapa ett nytt pass'}
          </p>
        </div>

      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Week groups ─────────────────────────────────────────────── */}
          {weekGroups.map(group => {
            const isCollapsed = collapsedWeeks.has(group.dateKey)
            const isPastWeek  = group.dateKey < today.slice(0, 10)
            return (
              <div key={group.dateKey}>

                {/* Week header */}
                <button
                  onClick={() => toggleWeek(group.dateKey)}
                  style={{
                    width: '100%', border: 'none', background: 'none',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '4px 2px', marginBottom: isCollapsed ? 0 : 10, cursor: 'pointer',
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: isPastWeek ? 'rgba(0,0,0,0.06)' : 'rgba(13,115,119,0.2)' }} />
                  <span style={{
                    fontSize: 11, fontWeight: 800,
                    color: isPastWeek ? '#94A3B8' : '#0D7377',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    whiteSpace: 'nowrap',
                  }}>
                    {group.label}
                  </span>
                  <ChevronDown
                    size={13}
                    color={isPastWeek ? '#94A3B8' : '#0D7377'}
                    strokeWidth={2.5}
                    style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, height: 1, background: isPastWeek ? 'rgba(0,0,0,0.06)' : 'rgba(13,115,119,0.2)' }} />
                </button>

                {/* Cards */}
                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.items.map(t => (
                      <SwipeCard
                        key={t.id}
                        training={t}
                        folders={folders}
                        today={today}
                        onTap={() => setQuickSheet(t)}
                        onDuplicate={() => handleDuplicate(t)}
                        onDelete={() => handleDelete(t)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* ── Without date ────────────────────────────────────────────── */}
          {unscheduled.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.06)' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                  Utan datum  ·  {unscheduled.length} pass
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.06)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {unscheduled.map(t => (
                  <SwipeCard
                    key={t.id}
                    training={t}
                    folders={folders}
                    today={today}
                    onTap={() => setQuickSheet(t)}
                    onDuplicate={() => handleDuplicate(t)}
                    onDelete={() => handleDelete(t)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── New folder modal ────────────────────────────────────────────────── */}
      {showFolderModal && (
        <>
          <div onClick={() => setShowFolderModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Ny mapp</h2>
              <button onClick={() => setShowFolderModal(false)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createFolder()}
              placeholder="t.ex. Vecka 12, A-gruppen..."
              className="glass-input"
              style={{ width: '100%', padding: '13px 16px', fontSize: 15, marginBottom: 18, display: 'block' }}
              autoFocus
            />
            <div style={{ marginBottom: 22 }}>
              <div className="text-label" style={{ marginBottom: 10 }}>Färg</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {FOLDER_COLORS.map(c => (
                  <button key={c} onClick={() => setNewFolderColor(c)} style={{
                    width: 36, height: 36, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                    boxShadow: newFolderColor === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                    transition: 'all 0.15s ease',
                  }} />
                ))}
              </div>
            </div>
            <button onClick={createFolder} disabled={savingFolder || !newFolderName.trim()} className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 15, cursor: 'pointer', opacity: newFolderName.trim() ? 1 : 0.4 }}>
              {savingFolder ? 'Sparar...' : 'Skapa mapp'}
            </button>
          </div>
        </>
      )}

      {/* ── Quick sheet ─────────────────────────────────────────────────────── */}
      {quickSheet && (
        <TrainingQuickSheet
          trainingId={quickSheet.id}
          trainingTitle={quickSheet.title}
          trainingStatus={quickSheet.status}
          groupName={(quickSheet as any).groups?.name}
          scheduledDate={quickSheet.scheduled_date}
          onClose={() => setQuickSheet(null)}
          onEdit={() => openForEdit(quickSheet)}
          onDuplicate={() => { handleDuplicate(quickSheet); setQuickSheet(null) }}
        />
      )}

      {/* ── Training builder ────────────────────────────────────────────────── */}
      {showBuilder && (
        <TrainingBuilder
          folders={folders}
          existingTraining={editTraining}
          existingBlocks={existingBlocks.length > 0 ? existingBlocks : undefined}
          onClose={() => { setShowBuilder(false); setEditTraining(null); setExistingBlocks([]) }}
          onSaved={() => { setShowBuilder(false); setEditTraining(null); setExistingBlocks([]); load() }}
        />
      )}
    </div>
  )
}
