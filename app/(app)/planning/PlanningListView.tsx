'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { getISOWeekNumber } from '@/lib/utils/week'
import {
  Plus, FolderPlus, ChevronRight, FileText, X,
  Clock, Users, Copy, Trash2, ChevronDown, Pencil,
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

// ─── Nav types + helpers ──────────────────────────────────────────────────────

type NavMode = 'day' | 'week' | 'month'

function getNavRange(mode: NavMode, offset: number, todayStr: string): { start: string; end: string } {
  const d = new Date(todayStr + 'T12:00:00')
  if (mode === 'day') {
    const day = new Date(d); day.setDate(d.getDate() + offset)
    const s = day.toISOString().split('T')[0]
    return { start: s, end: s }
  }
  if (mode === 'week') {
    const dayOfWeek = (d.getDay() + 6) % 7
    const monday = new Date(d); monday.setDate(d.getDate() - dayOfWeek + offset * 7)
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
    return { start: monday.toISOString().split('T')[0], end: sunday.toISOString().split('T')[0] }
  } else {
    const year = d.getFullYear(); const month = d.getMonth() + offset
    const first = new Date(year, month, 1); const last = new Date(year, month + 1, 0)
    return { start: first.toISOString().split('T')[0], end: last.toISOString().split('T')[0] }
  }
}

function getNavLabel(mode: NavMode, offset: number, todayStr: string): string {
  const d = new Date(todayStr + 'T12:00:00')
  if (mode === 'day') {
    if (offset === 0) return 'Idag'
    if (offset === 1) return 'Imorgon'
    if (offset === -1) return 'Igår'
    const day = new Date(d); day.setDate(d.getDate() + offset)
    return day.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
  }
  if (mode === 'week') {
    const dayOfWeek = (d.getDay() + 6) % 7
    const monday = new Date(d); monday.setDate(d.getDate() - dayOfWeek + offset * 7)
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
    const wn = getISOWeekNumber(monday)
    const s = monday.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
    const e = sunday.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
    return `V.${wn}  ·  ${s}–${e}`
  } else {
    const year = d.getFullYear(); const month = d.getMonth() + offset
    const first = new Date(year, month, 1)
    return first.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })
  }
}

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

function MiniCalendar({
  mode, offset, today, dotsByDate, onDayClick,
}: {
  mode: 'week' | 'month'
  offset: number
  today: string
  dotsByDate: Record<string, string[]>
  onDayClick: (date: string) => void
}) {
  const d = new Date(today + 'T12:00:00')
  const DAY_LABELS = ['M', 'T', 'O', 'T', 'F', 'L', 'S']

  if (mode === 'week') {
    const dayOfWeek = (d.getDay() + 6) % 7
    const monday = new Date(d); monday.setDate(d.getDate() - dayOfWeek + offset * 7)
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday); day.setDate(monday.getDate() + i)
      return day.toISOString().split('T')[0]
    })
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, padding: '8px 4px', background: 'rgba(255,255,255,0.6)', borderRadius: 16, backdropFilter: 'blur(8px)' }}>
        {days.map((date, i) => {
          const isToday = date === today
          const dots = dotsByDate[date] || []
          const dayNum = new Date(date + 'T12:00:00').getDate()
          return (
            <div key={date} onClick={() => onDayClick(date)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', flex: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8' }}>{DAY_LABELS[i]}</span>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: isToday ? '#0D7377' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? 'white' : '#0F172A' }}>
                  {dayNum}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 2, justifyContent: 'center', minHeight: 6 }}>
                {dots.slice(0, 3).map((color, j) => (
                  <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Month view
  const year = d.getFullYear()
  const month = d.getMonth() + offset
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7

  const cells: (string | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let i = 1; i <= lastDay.getDate(); i++) {
    cells.push(new Date(year, month, i).toISOString().split('T')[0])
  }
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div style={{ marginBottom: 12, padding: '8px 4px', background: 'rgba(255,255,255,0.6)', borderRadius: 16, backdropFilter: 'blur(8px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
        {DAY_LABELS.map((l, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#94A3B8', padding: '2px 0' }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((date, i) => {
          if (!date) return <div key={i} />
          const isToday = date === today
          const dots = dotsByDate[date] || []
          const dayNum = new Date(date + 'T12:00:00').getDate()
          return (
            <div key={date} onClick={() => onDayClick(date)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, cursor: 'pointer', padding: '2px 0' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: isToday ? '#0D7377' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 11, fontWeight: isToday ? 800 : 400, color: isToday ? 'white' : '#0F172A' }}>
                  {dayNum}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 1, justifyContent: 'center', minHeight: 5 }}>
                {dots.slice(0, 3).map((color, j) => (
                  <div key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: color }} />
                ))}
                {dots.length > 3 && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#CBD5E1' }} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
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

// ─── Types (groups) ───────────────────────────────────────────────────────────

interface GroupTab {
  id: string
  name: string
  color: string
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlanningListView() {
  const router = useRouter()
  const { profile } = useUser()

  const [folders,         setFolders]         = useState<PlanningFolder[]>([])
  const [trainings,       setTrainings]       = useState<TrainingRow[]>([])
  const [groups,          setGroups]          = useState<GroupTab[]>([])
  const [loading,         setLoading]         = useState(true)
  const [activeGroup,     setActiveGroup]     = useState<string | null>(null)
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
  const [navMode,         setNavMode]         = useState<NavMode>('week')
  const [navOffset,       setNavOffset]       = useState(0)
  const [editingFolder,   setEditingFolder]   = useState<PlanningFolder | null>(null)
  const [editFolderName,  setEditFolderName]  = useState('')
  const [editFolderColor, setEditFolderColor] = useState(FOLDER_COLORS[0])

  const today = new Date().toISOString().split('T')[0]

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: f }, { data: t }, { data: g }] = await Promise.all([
      supabase.from('planning_folders').select('*').order('sort_order'),
      supabase
        .from('trainings')
        .select('id, title, status, training_type, scheduled_date, folder_id, group_id, purpose, purpose_type, groups(name, color)')
        .eq('club_id', profile?.club_id ?? '')
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false }),
      supabase.from('groups').select('id, name, color').eq('club_id', profile?.club_id ?? '').order('name'),
    ])
    if (f) setFolders(f)
    if (t) setTrainings(t as unknown as TrainingRow[])
    if (g) setGroups(g.map((gr: any) => ({ id: gr.id, name: gr.name, color: gr.color ?? '#0D7377' })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Folder create ─────────────────────────────────────────────────────────

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    setSavingFolder(true)
    const { error } = await createClient().from('planning_folders').insert({
      club_id: profile?.club_id, coach_id: profile?.id,
      name: newFolderName.trim(), color: newFolderColor, sort_order: folders.length,
    })
    setSavingFolder(false)
    if (error) { console.error('Create folder error:', error); return }
    setNewFolderName('')
    setShowFolderModal(false)
    load()
  }

  const saveEditFolder = async () => {
    if (!editingFolder || !editFolderName.trim()) return
    const { error } = await createClient().from('planning_folders')
      .update({ name: editFolderName.trim(), color: editFolderColor })
      .eq('id', editingFolder.id)
    if (error) { console.error('Edit folder error:', error); return }
    setEditingFolder(null)
    load()
  }

  const deleteFolder = async (f: PlanningFolder) => {
    if (!confirm(`Ta bort mappen "${f.name}"? Pass i mappen påverkas inte.`)) return
    const { error } = await createClient().from('planning_folders').delete().eq('id', f.id)
    if (error) { console.error('Delete folder error:', error); return }
    if (activeFolder === f.id) setActiveFolder(null)
    load()
  }

  // ── Duplicate ─────────────────────────────────────────────────────────────

  const handleDuplicate = async (t: TrainingRow) => {
    const supabase = createClient()
    const { data: newT } = await supabase.from('trainings').insert({
      club_id:        profile?.club_id,
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

  const byGroup       = activeGroup ? trainings.filter(t => t.group_id === activeGroup) : trainings
  const visible       = activeFolder ? byGroup.filter(t => t.folder_id === activeFolder) : byGroup
  const navRange      = getNavRange(navMode, navOffset, today)
  const rangeFiltered = visible.filter(t => t.scheduled_date && t.scheduled_date >= navRange.start && t.scheduled_date <= navRange.end)
  const scheduled     = rangeFiltered.filter(t => t.scheduled_date)
  const unscheduled   = visible.filter(t => !t.scheduled_date)
  const weekGroups    = groupByWeek(scheduled, today)

  // Dots for calendar (all visible sessions with a date)
  const dotsByDate: Record<string, string[]> = {}
  visible.forEach(t => {
    if (t.scheduled_date) {
      if (!dotsByDate[t.scheduled_date]) dotsByDate[t.scheduled_date] = []
      dotsByDate[t.scheduled_date].push(t.groups?.color ?? '#0D7377')
    }
  })

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '0 16px' }}>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => { setEditTraining(null); setExistingBlocks([]); setShowBuilder(true) }}
          className="btn-primary"
          style={{ flex: 1, padding: '12px 14px', fontSize: 14, cursor: 'pointer', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Nytt pass
        </button>
      </div>

      {/* ── Grupp-tabs ──────────────────────────────────────────────────────── */}
      {groups.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
          {[
            { id: null as string | null, name: 'Alla', color: '#0F172A' },
            ...groups,
          ].map(g => {
            const isActive = activeGroup === g.id
            const count = g.id ? trainings.filter(t => t.group_id === g.id).length : trainings.length
            return (
              <button
                key={g.id ?? 'all'}
                onClick={() => { setActiveGroup(g.id); setActiveFolder(null) }}
                style={{
                  flexShrink: 0,
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: 'none',
                  background: isActive ? g.color : 'rgba(255,255,255,0.75)',
                  backdropFilter: 'blur(8px)',
                  cursor: 'pointer',
                  boxShadow: isActive ? `0 3px 12px ${g.color}44` : '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'all 0.18s ease',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: isActive ? 'white' : '#0F172A' }}>{g.name}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? 'rgba(255,255,255,0.7)' : '#94A3B8', background: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.06)', borderRadius: 9999, padding: '1px 7px' }}>{count}</span>
              </button>
            )
          })}
        </div>
      )}


      {/* ── Navigering + kalender ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          {/* Idag-knapp */}
          <button
            onClick={() => { setNavMode('week'); setNavOffset(0) }}
            style={{ padding: '6px 10px', borderRadius: 9, border: 'none', background: 'rgba(13,115,119,0.1)', fontSize: 12, fontWeight: 700, color: '#0D7377', cursor: 'pointer', flexShrink: 0 }}
          >
            Idag
          </button>
          {/* Mode pills */}
          <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 3, flexShrink: 0 }}>
            {(['day', 'week', 'month'] as NavMode[]).map(m => (
              <button key={m}
                onClick={() => { setNavMode(m); setNavOffset(0) }}
                style={{ padding: '5px 9px', borderRadius: 9, border: 'none', background: navMode === m ? 'white' : 'transparent', fontSize: 11, fontWeight: 700, color: navMode === m ? '#0F172A' : '#94A3B8', cursor: 'pointer', boxShadow: navMode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
              >
                {m === 'day' ? 'Dag' : m === 'week' ? 'Vecka' : 'Månad'}
              </button>
            ))}
          </div>
          {/* Prev/Next + label */}
          <button onClick={() => setNavOffset(o => o - 1)}
            style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#0F172A', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flexShrink: 0 }}>
            ‹
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#0F172A', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {getNavLabel(navMode, navOffset, today)}
          </div>
          <button onClick={() => setNavOffset(o => o + 1)}
            style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#0F172A', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flexShrink: 0 }}>
            ›
          </button>
        </div>
        {/* Mini calendar (week/month only) */}
        {navMode !== 'day' && (
          <MiniCalendar
            mode={navMode}
            offset={navOffset}
            today={today}
            dotsByDate={dotsByDate}
            onDayClick={(date) => {
              const diffDays = Math.round(
                (new Date(date + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000
              )
              setNavMode('day')
              setNavOffset(diffDays)
            }}
          />
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 76, borderRadius: 18, background: 'rgba(0,0,0,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>

      ) : rangeFiltered.length === 0 && unscheduled.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(13,115,119,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FileText size={28} color="#0D7377" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
            {trainings.length === 0 ? 'Inga träningspass ännu' : 'Inga pass denna period'}
          </p>
          <p style={{ fontSize: 13, color: '#94A3B8' }}>
            {trainings.length === 0 ? 'Tryck "Nytt pass" för att börja planera' : 'Bläddra till en annan period eller skapa ett nytt pass'}
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
          <div onClick={() => setShowFolderModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001, padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
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

      {/* ── Mina mappar ─────────────────────────────────────────────────────── */}
      {!loading && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mina mappar</span>
            <button
              onClick={() => setShowFolderModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#0D7377' }}
            >
              <Plus size={13} strokeWidth={2.5} /> Ny
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {folders.map(f => {
              const isActive = activeFolder === f.id
              const fColor = (f as any).color || '#0D7377'
              const fCount = trainings.filter(t => t.folder_id === f.id).length
              return (
                <div key={f.id} style={{ flexShrink: 0, position: 'relative', minWidth: 110 }}>
                  <button
                    onClick={() => setActiveFolder(isActive ? null : f.id)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 28px',
                      borderRadius: 16,
                      border: 'none',
                      background: isActive ? fColor : 'rgba(255,255,255,0.75)',
                      backdropFilter: 'blur(8px)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: isActive ? `0 4px 14px ${fColor}40` : '0 1px 4px rgba(0,0,0,0.06)',
                      transition: 'all 0.18s ease',
                      borderLeft: isActive ? 'none' : `3px solid ${fColor}`,
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>📁</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? 'white' : '#0F172A', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: isActive ? 'rgba(255,255,255,0.7)' : '#94A3B8', fontWeight: 500 }}>{fCount} pass</div>
                  </button>
                  {/* Edit/delete icons */}
                  <div style={{ position: 'absolute', bottom: 6, right: 6, display: 'flex', gap: 4 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setEditingFolder(f); setEditFolderName(f.name); setEditFolderColor((f as any).color || FOLDER_COLORS[0]) }}
                      style={{ width: 22, height: 22, borderRadius: 6, background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Pencil size={11} color={isActive ? 'white' : '#64748B'} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteFolder(f) }}
                      style={{ width: 22, height: 22, borderRadius: 6, background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={11} color={isActive ? 'white' : '#DC2626'} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )
            })}
            <button
              onClick={() => setShowFolderModal(true)}
              style={{ flexShrink: 0, width: 80, borderRadius: 16, border: '1.5px dashed rgba(0,0,0,0.12)', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 90 }}
            >
              <FolderPlus size={18} color="#CBD5E1" strokeWidth={1.5} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>Ny mapp</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Redigera mapp ────────────────────────────────────────────────────── */}
      {editingFolder && (
        <>
          <div onClick={() => setEditingFolder(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001, padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Redigera mapp</h2>
              <button onClick={() => setEditingFolder(null)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>
            <input
              value={editFolderName}
              onChange={e => setEditFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveEditFolder()}
              className="glass-input"
              style={{ width: '100%', padding: '13px 16px', fontSize: 15, marginBottom: 18, display: 'block' }}
              autoFocus
            />
            <div style={{ marginBottom: 22 }}>
              <div className="text-label" style={{ marginBottom: 10 }}>Färg</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {FOLDER_COLORS.map(c => (
                  <button key={c} onClick={() => setEditFolderColor(c)} style={{
                    width: 36, height: 36, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                    boxShadow: editFolderColor === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                    transition: 'all 0.15s ease',
                  }} />
                ))}
              </div>
            </div>
            <button onClick={saveEditFolder} disabled={!editFolderName.trim()} className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 15, cursor: 'pointer', opacity: editFolderName.trim() ? 1 : 0.4 }}>
              Spara ändringar
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
