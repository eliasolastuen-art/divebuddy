'use client'

import { useEffect, useState } from 'react'
import { X, Plus, Trash2, Copy, Calendar, ChevronDown, ChevronUp, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EntryBlock {
  category: string
  name: string
  items: { custom_name: string; library_item_id?: string }[]
}

interface TemplateEntry {
  id: string
  week_number: number
  day_of_week: number // 1=Mon ... 7=Sun
  title: string
  group_id: string | null
  block_data: EntryBlock[]
}

interface PeriodTemplate {
  id: string
  name: string
  weeks: number
  entries: TemplateEntry[]
}

interface GroupTab {
  id: string
  name: string
  color: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const DAY_LABELS_SHORT = ['M', 'T', 'O', 'T', 'F', 'L', 'S']

function genId() { return Math.random().toString(36).slice(2) }

// ─── Component ────────────────────────────────────────────────────────────────

export default function PeriodBuilder({ onClose }: { onClose: () => void }) {
  const { profile } = useUser()

  // Template list
  const [templates, setTemplates] = useState<PeriodTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<GroupTab[]>([])

  // Active template editing
  const [active, setActive] = useState<PeriodTemplate | null>(null)

  // Create new
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newWeeks, setNewWeeks] = useState(4)

  // Add entry
  const [addingCell, setAddingCell] = useState<{ week: number; day: number } | null>(null)
  const [entryTitle, setEntryTitle] = useState('')
  const [entryGroupId, setEntryGroupId] = useState<string | null>(null)

  // Apply
  const [showApply, setShowApply] = useState(false)
  const [applyDate, setApplyDate] = useState('')
  const [applyGroupId, setApplyGroupId] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadTemplates = async () => {
    setLoading(true)
    const supabase = createClient()

    const [{ data: tpls }, { data: g }] = await Promise.all([
      supabase
        .from('period_templates')
        .select('id, name, weeks, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('groups').select('id, name, color').eq('club_id', profile?.club_id ?? '').order('name'),
    ])

    if (g) setGroups(g.map((gr: any) => ({ id: gr.id, name: gr.name, color: gr.color ?? '#0D7377' })))

    if (tpls) {
      const full: PeriodTemplate[] = []
      for (const t of tpls) {
        const { data: entries } = await supabase
          .from('period_template_entries')
          .select('*')
          .eq('template_id', t.id)
          .order('week_number')
          .order('day_of_week')
          .order('sort_order')

        full.push({
          id: t.id,
          name: t.name,
          weeks: t.weeks,
          entries: (entries ?? []).map((e: any) => ({
            id: e.id,
            week_number: e.week_number,
            day_of_week: e.day_of_week,
            title: e.title,
            group_id: e.group_id,
            block_data: e.block_data ?? [],
          })),
        })
      }
      setTemplates(full)
    }
    setLoading(false)
  }

  useEffect(() => { loadTemplates() }, [])

  // ── Create template ───────────────────────────────────────────────────────

  const createTemplate = async () => {
    if (!newName.trim()) return
    const supabase = createClient()
    const { data } = await supabase.from('period_templates').insert({
      name: newName.trim(),
      weeks: newWeeks,
      club_id: profile?.club_id,
      created_by: profile?.id,
    }).select().single()

    if (data) {
      const tpl: PeriodTemplate = { id: data.id, name: data.name, weeks: data.weeks, entries: [] }
      setTemplates(prev => [tpl, ...prev])
      setActive(tpl)
      setShowCreate(false)
      setNewName('')
      setNewWeeks(4)
    }
  }

  // ── Delete template ───────────────────────────────────────────────────────

  const deleteTemplate = async (id: string) => {
    if (!confirm('Ta bort denna veckocykel-mall?')) return
    await createClient().from('period_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    if (active?.id === id) setActive(null)
  }

  // ── Add entry to cell ─────────────────────────────────────────────────────

  const addEntry = async () => {
    if (!addingCell || !entryTitle.trim() || !active) return
    const supabase = createClient()
    const { data } = await supabase.from('period_template_entries').insert({
      template_id: active.id,
      week_number: addingCell.week,
      day_of_week: addingCell.day,
      title: entryTitle.trim(),
      group_id: entryGroupId,
      block_data: [],
      sort_order: active.entries.filter(e => e.week_number === addingCell.week && e.day_of_week === addingCell.day).length,
    }).select().single()

    if (data) {
      const entry: TemplateEntry = {
        id: data.id,
        week_number: data.week_number,
        day_of_week: data.day_of_week,
        title: data.title,
        group_id: data.group_id,
        block_data: data.block_data ?? [],
      }
      setActive(prev => prev ? { ...prev, entries: [...prev.entries, entry] } : null)
      setTemplates(prev => prev.map(t =>
        t.id === active.id ? { ...t, entries: [...t.entries, entry] } : t
      ))
    }
    setAddingCell(null)
    setEntryTitle('')
    setEntryGroupId(null)
  }

  // ── Remove entry ──────────────────────────────────────────────────────────

  const removeEntry = async (entryId: string) => {
    if (!active) return
    await createClient().from('period_template_entries').delete().eq('id', entryId)
    const updated = active.entries.filter(e => e.id !== entryId)
    setActive({ ...active, entries: updated })
    setTemplates(prev => prev.map(t =>
      t.id === active.id ? { ...t, entries: updated } : t
    ))
  }

  // ── Copy week ─────────────────────────────────────────────────────────────

  const copyWeek = async (fromWeek: number, toWeek: number) => {
    if (!active) return
    const supabase = createClient()
    const source = active.entries.filter(e => e.week_number === fromWeek)
    const newEntries: TemplateEntry[] = []

    for (const e of source) {
      const { data } = await supabase.from('period_template_entries').insert({
        template_id: active.id,
        week_number: toWeek,
        day_of_week: e.day_of_week,
        title: e.title,
        group_id: e.group_id,
        block_data: e.block_data,
        sort_order: e.day_of_week,
      }).select().single()

      if (data) {
        newEntries.push({
          id: data.id,
          week_number: data.week_number,
          day_of_week: data.day_of_week,
          title: data.title,
          group_id: data.group_id,
          block_data: data.block_data ?? [],
        })
      }
    }

    const allEntries = [...active.entries, ...newEntries]
    setActive({ ...active, entries: allEntries })
    setTemplates(prev => prev.map(t =>
      t.id === active.id ? { ...t, entries: allEntries } : t
    ))
  }

  // ── Apply template to calendar ────────────────────────────────────────────

  const applyTemplate = async () => {
    if (!active || !applyDate) return
    setApplying(true)
    const supabase = createClient()

    // applyDate should be a Monday
    const startDate = new Date(applyDate + 'T12:00:00')

    for (const entry of active.entries) {
      // Calculate date: start + (week-1)*7 + (day-1) days
      const dayOffset = (entry.week_number - 1) * 7 + (entry.day_of_week - 1)
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + dayOffset)
      const dateStr = date.toISOString().split('T')[0]

      const groupId = entry.group_id || applyGroupId

      // Create training
      const { data: training } = await supabase.from('trainings').insert({
        club_id: profile?.club_id,
        title: entry.title,
        scheduled_date: dateStr,
        status: 'draft',
        training_type: 'training',
        group_id: groupId,
      }).select().single()

      if (training && entry.block_data.length > 0) {
        for (let i = 0; i < entry.block_data.length; i++) {
          const bd = entry.block_data[i]
          const { data: block } = await supabase.from('training_blocks').insert({
            training_id: training.id,
            category: bd.category || 'vatten',
            name: bd.name || `Block ${i + 1}`,
            sort_order: i,
            block_type: 'standard',
          }).select().single()

          if (block && bd.items?.length) {
            for (let j = 0; j < bd.items.length; j++) {
              await supabase.from('training_block_items').insert({
                block_id: block.id,
                library_item_id: bd.items[j].library_item_id || null,
                custom_name: bd.items[j].custom_name || null,
                sort_order: j,
              })
            }
          }
        }
      }
    }

    setApplying(false)
    setShowApply(false)
    alert(`${active.entries.length} pass skapade!`)
  }

  // ── Get Monday of current week for default date ───────────────────────────

  const getNextMonday = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = ((8 - day) % 7) || 7 // next Monday
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  // Template list view
  if (!active) {
    return (
      <div className="glass-sheet" style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(248,250,252,0.97)', backdropFilter: 'blur(20px)',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
              Periodisering
            </h1>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="#64748B" />
            </button>
          </div>

          <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
            Skapa veckocykel-mallar med progression. Varje mall har N veckor med pass fördelade på veckodagar. Applicera en mall på kalendern för att skapa riktiga pass.
          </p>

          {/* Create new */}
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 14, borderRadius: 14, cursor: 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Plus size={16} strokeWidth={2.5} />
              Ny veckocykel-mall
            </button>
          ) : (
            <div className="glass-card" style={{ padding: 18, marginBottom: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>
                  Namn
                </label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="T.ex. Grundperiod"
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.1)', fontSize: 14,
                    background: 'rgba(255,255,255,0.8)',
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>
                  Antal veckor
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[2, 3, 4, 6, 8, 12].map(n => (
                    <button
                      key={n}
                      onClick={() => setNewWeeks(n)}
                      style={{
                        padding: '8px 14px', borderRadius: 10, border: 'none',
                        background: newWeeks === n ? '#0D7377' : 'rgba(0,0,0,0.06)',
                        color: newWeeks === n ? 'white' : '#0F172A',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'rgba(0,0,0,0.06)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>
                  Avbryt
                </button>
                <button onClick={createTemplate} disabled={!newName.trim()} className="btn-primary" style={{ flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, cursor: 'pointer', opacity: newName.trim() ? 1 : 0.4 }}>
                  Skapa
                </button>
              </div>
            </div>
          )}

          {/* Template list */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div style={{ width: 28, height: 28, border: '3px solid rgba(13,115,119,0.2)', borderTopColor: '#0D7377', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 14 }}>
              Inga mallar ännu. Skapa din första veckocykel-mall!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {templates.map(tpl => (
                <div key={tpl.id} className="glass-card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      onClick={() => setActive(tpl)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', flex: 1 }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
                        {tpl.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        {tpl.weeks} veckor · {tpl.entries.length} pass
                      </div>
                    </button>
                    <button
                      onClick={() => deleteTemplate(tpl.id)}
                      style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={14} color="#DC2626" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Active template editor ─────────────────────────────────────────────────

  return (
    <div className="glass-sheet" style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(248,250,252,0.97)', backdropFilter: 'blur(20px)',
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <button
            onClick={() => setActive(null)}
            style={{ fontSize: 13, fontWeight: 600, color: '#0D7377', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Tillbaka
          </button>
          <button
            onClick={() => { setShowApply(true); if (!applyDate) setApplyDate(getNextMonday()) }}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: 13, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Play size={13} strokeWidth={2.5} />
            Applicera
          </button>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 4 }}>
          {active.name}
        </h2>
        <p style={{ fontSize: 12, color: '#64748B', marginBottom: 20 }}>
          {active.weeks} veckor · Klicka på en cell för att lägga till pass
        </p>

        {/* Week grid */}
        {Array.from({ length: active.weeks }, (_, wi) => {
          const weekNum = wi + 1
          const weekEntries = active.entries.filter(e => e.week_number === weekNum)

          return (
            <div key={weekNum} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0D7377', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Vecka {weekNum}
                </div>
                {weekNum < active.weeks && (
                  <button
                    onClick={() => copyWeek(weekNum, weekNum + 1)}
                    style={{ fontSize: 11, fontWeight: 600, color: '#64748B', background: 'rgba(0,0,0,0.04)', border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Copy size={11} /> Kopiera → v.{weekNum + 1}
                  </button>
                )}
              </div>

              {/* Day columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {/* Day headers */}
                {DAY_LABELS_SHORT.map((d, i) => (
                  <div key={i} style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textAlign: 'center', paddingBottom: 4 }}>
                    {d}
                  </div>
                ))}

                {/* Day cells */}
                {[1, 2, 3, 4, 5, 6, 7].map(day => {
                  const cellEntries = weekEntries.filter(e => e.day_of_week === day)
                  const isAddingHere = addingCell?.week === weekNum && addingCell?.day === day

                  return (
                    <div
                      key={day}
                      onClick={() => {
                        if (!isAddingHere) {
                          setAddingCell({ week: weekNum, day })
                          setEntryTitle('')
                          setEntryGroupId(null)
                        }
                      }}
                      style={{
                        minHeight: 52,
                        borderRadius: 10,
                        background: isAddingHere ? 'rgba(13,115,119,0.08)' : 'rgba(255,255,255,0.7)',
                        border: isAddingHere ? '2px solid rgba(13,115,119,0.3)' : '1px solid rgba(0,0,0,0.06)',
                        padding: 4,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {cellEntries.map(entry => {
                        const group = groups.find(g => g.id === entry.group_id)
                        return (
                          <div
                            key={entry.id}
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: group?.color || '#0F172A',
                              background: group ? `${group.color}18` : 'rgba(0,0,0,0.04)',
                              borderRadius: 6,
                              padding: '3px 4px',
                              marginBottom: 2,
                              lineHeight: 1.2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              position: 'relative',
                            }}
                            onClick={e => { e.stopPropagation(); removeEntry(entry.id) }}
                            title="Klicka för att ta bort"
                          >
                            {entry.title}
                          </div>
                        )
                      })}
                      {cellEntries.length === 0 && !isAddingHere && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                          <Plus size={12} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Add entry sheet */}
        {addingCell && (
          <div className="glass-card" style={{
            position: 'sticky', bottom: 16, padding: 16,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
            borderRadius: 18,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 8 }}>
              Vecka {addingCell.week} · {DAY_LABELS[addingCell.day - 1]}
            </div>
            <input
              value={entryTitle}
              onChange={e => setEntryTitle(e.target.value)}
              placeholder="Passnamn, t.ex. Teknikpass"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') addEntry() }}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.1)', fontSize: 14,
                background: 'rgba(255,255,255,0.8)', marginBottom: 10,
              }}
            />
            {groups.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setEntryGroupId(entryGroupId === g.id ? null : g.id)}
                    style={{
                      padding: '5px 10px', borderRadius: 8, border: 'none',
                      background: entryGroupId === g.id ? g.color : 'rgba(0,0,0,0.06)',
                      color: entryGroupId === g.id ? 'white' : '#0F172A',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setAddingCell(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.06)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}
              >
                Avbryt
              </button>
              <button
                onClick={addEntry}
                disabled={!entryTitle.trim()}
                className="btn-primary"
                style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, cursor: 'pointer', opacity: entryTitle.trim() ? 1 : 0.4 }}
              >
                Lägg till
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Apply modal */}
      {showApply && (
        <>
          <div
            onClick={() => setShowApply(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10000 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10001,
            background: 'white', borderRadius: '24px 24px 0 0',
            padding: '24px 20px', paddingBottom: 40,
            boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
              Applicera mall
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
              Välj startdatum (bör vara en måndag). {active.entries.length} pass skapas som utkast över {active.weeks} veckor.
            </p>

            <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>
              Startdatum
            </label>
            <input
              type="date"
              value={applyDate}
              onChange={e => setApplyDate(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.1)', fontSize: 15,
                marginBottom: 16,
              }}
            />

            {groups.length > 0 && (
              <>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }}>
                  Standardgrupp (för pass utan grupp)
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {groups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setApplyGroupId(applyGroupId === g.id ? null : g.id)}
                      style={{
                        padding: '8px 14px', borderRadius: 10, border: 'none',
                        background: applyGroupId === g.id ? g.color : 'rgba(0,0,0,0.06)',
                        color: applyGroupId === g.id ? 'white' : '#0F172A',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={applyTemplate}
              disabled={!applyDate || applying}
              className="btn-primary"
              style={{
                width: '100%', padding: '14px', fontSize: 15, borderRadius: 14,
                cursor: 'pointer', opacity: applyDate && !applying ? 1 : 0.4,
              }}
            >
              {applying ? 'Skapar pass...' : `Skapa ${active.entries.length} pass`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
