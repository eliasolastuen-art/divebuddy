'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { UserPlus, Users, UserCheck, X, Pencil, Trash2, GripVertical } from 'lucide-react'
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Group {
  id: string
  name: string
  color: string
  description: string | null
  sort_order: number
}

interface Athlete {
  id: string
  name: string
  email: string | null
  active: boolean
  group_id: string
}

const GROUP_COLORS = ['#0D7377','#D4A017','#6366F1','#EC4899','#10B981','#F97316','#3B82F6','#8B5CF6']

function SortableGroupSection({ id, children }: { id: string; children: (dragListeners: Record<string, unknown>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }} {...attributes}>
      {children(listeners as Record<string, unknown>)}
    </div>
  )
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  // Add athlete sheet
  const [showAddAthlete, setShowAddAthlete] = useState(false)
  const [newAthleteName, setNewAthleteName] = useState('')
  const [newAthleteEmail, setNewAthleteEmail] = useState('')
  const [newAthleteGroup, setNewAthleteGroup] = useState('')

  // Add group sheet
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('#0D7377')

  // Edit athlete sheet
  const [editAthlete, setEditAthlete] = useState<Athlete | null>(null)
  const [editAthleteName, setEditAthleteName] = useState('')
  const [editAthleteEmail, setEditAthleteEmail] = useState('')
  const [editAthleteGroup, setEditAthleteGroup] = useState('')
  const [editAthleteActive, setEditAthleteActive] = useState(true)
  const [confirmDeleteAthlete, setConfirmDeleteAthlete] = useState(false)

  // Edit group sheet
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupColor, setEditGroupColor] = useState('#0D7377')
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false)

  const [saving, setSaving] = useState(false)

  const { profile } = useUser()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const load = async () => {
    if (!profile?.club_id) return
    const supabase = createClient()
    const [{ data: g }, { data: a }] = await Promise.all([
      supabase.from('groups').select('*').eq('club_id', profile.club_id).order('sort_order').order('name'),
      supabase.from('athletes').select('*').eq('club_id', profile.club_id).order('name'),
    ])
    if (g) setGroups(g)
    if (a) setAthletes(a)
    setLoading(false)
  }

  useEffect(() => { load() }, [profile?.id])

  const handleGroupDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = groups.findIndex(g => g.id === active.id)
    const newIndex = groups.findIndex(g => g.id === over.id)
    const reordered = arrayMove(groups, oldIndex, newIndex)
    setGroups(reordered)
    const supabase = createClient()
    await Promise.all(reordered.map((g, i) => supabase.from('groups').update({ sort_order: i }).eq('id', g.id)))
  }

  // ── Add ─────────────────────────────────────────────────────────────────────

  const addAthlete = async () => {
    if (!newAthleteName.trim() || !newAthleteGroup) return
    setSaving(true)
    await createClient().from('athletes').insert({
      club_id: profile?.club_id,
      group_id: newAthleteGroup,
      name: newAthleteName.trim(),
      email: newAthleteEmail.trim() || null,
      active: true,
    })
    setNewAthleteName(''); setNewAthleteEmail(''); setShowAddAthlete(false); setSaving(false)
    load()
  }

  const addGroup = async () => {
    if (!newGroupName.trim()) return
    setSaving(true)
    await createClient().from('groups').insert({
      club_id: profile?.club_id,
      name: newGroupName.trim(),
      color: newGroupColor,
    })
    setNewGroupName(''); setShowAddGroup(false); setSaving(false)
    load()
  }

  // ── Edit athlete ─────────────────────────────────────────────────────────────

  const openEditAthlete = (a: Athlete) => {
    setEditAthlete(a)
    setEditAthleteName(a.name)
    setEditAthleteEmail(a.email ?? '')
    setEditAthleteGroup(a.group_id)
    setEditAthleteActive(a.active)
    setConfirmDeleteAthlete(false)
  }

  const saveAthlete = async () => {
    if (!editAthlete || !editAthleteName.trim()) return
    setSaving(true)
    await createClient().from('athletes').update({
      name: editAthleteName.trim(),
      email: editAthleteEmail.trim() || null,
      group_id: editAthleteGroup,
      active: editAthleteActive,
    }).eq('id', editAthlete.id)
    setSaving(false)
    setEditAthlete(null)
    load()
  }

  const deleteAthlete = async () => {
    if (!editAthlete) return
    setSaving(true)
    await createClient().from('athletes').delete().eq('id', editAthlete.id)
    setSaving(false)
    setEditAthlete(null)
    load()
  }

  // ── Edit group ───────────────────────────────────────────────────────────────

  const openEditGroup = (g: Group) => {
    setEditGroup(g)
    setEditGroupName(g.name)
    setEditGroupColor(g.color)
    setConfirmDeleteGroup(false)
  }

  const saveGroup = async () => {
    if (!editGroup || !editGroupName.trim()) return
    setSaving(true)
    await createClient().from('groups').update({
      name: editGroupName.trim(),
      color: editGroupColor,
    }).eq('id', editGroup.id)
    setSaving(false)
    setEditGroup(null)
    load()
  }

  const deleteGroup = async () => {
    if (!editGroup) return
    setSaving(true)
    // Unassign athletes from this group before deleting
    await createClient().from('athletes').update({ group_id: null }).eq('group_id', editGroup.id)
    await createClient().from('groups').delete().eq('id', editGroup.id)
    setSaving(false)
    setEditGroup(null)
    if (selectedGroup === editGroup.id) setSelectedGroup(null)
    load()
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const visibleAthletes = selectedGroup ? athletes.filter(a => a.group_id === selectedGroup) : athletes
  const activeCount = visibleAthletes.filter(a => a.active).length

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Laddar...</div>

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>Grupper</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowAddGroup(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 12, padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
          >
            <Users size={14} strokeWidth={2.2} /> Grupp
          </button>
          <button
            onClick={() => { setNewAthleteGroup(selectedGroup || groups[0]?.id || ''); setShowAddAthlete(true) }}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', borderRadius: 12 }}
          >
            <UserPlus size={14} strokeWidth={2.5} /> Atlet
          </button>
        </div>
      </div>

      {/* Group filter chips */}
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        <button onClick={() => setSelectedGroup(null)} className={selectedGroup === null ? 'chip chip-active' : 'chip chip-inactive'}>
          Alla ({athletes.length})
        </button>
        {groups.map(g => {
          const count = athletes.filter(a => a.group_id === g.id).length
          const isSelected = selectedGroup === g.id
          return (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(isSelected ? null : g.id)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 9999, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: isSelected ? g.color : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(8px)',
                color: isSelected ? 'white' : '#64748B',
                boxShadow: isSelected ? `0 2px 8px ${g.color}40` : '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'all 0.15s ease',
              }}
            >
              {g.name} ({count})
            </button>
          )
        })}
      </div>

      {/* Stats row */}
      <div style={{ padding: '0 16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(13,115,119,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} color="#0D7377" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em', lineHeight: 1 }}>{visibleAthletes.length}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>Totalt</div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(13,115,119,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={18} color="#0D7377" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0D7377', letterSpacing: '-0.04em', lineHeight: 1 }}>{activeCount}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>Aktiva</div>
          </div>
        </div>
      </div>

      {/* Athletes list grouped */}
      <div style={{ padding: '0 16px' }}>
        <DndContext sensors={sensors} onDragEnd={handleGroupDragEnd}>
          <SortableContext items={groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
            {groups.filter(g => !selectedGroup || g.id === selectedGroup).map(group => {
              const groupAthletes = visibleAthletes.filter(a => a.group_id === group.id)
              if (groupAthletes.length === 0 && selectedGroup) return null
              return (
                <SortableGroupSection key={group.id} id={group.id}>{dragListeners => (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '0 2px' }}>
                      <button {...dragListeners} style={{ background: 'none', border: 'none', cursor: 'grab', padding: 2, display: 'flex', touchAction: 'none' }}>
                        <GripVertical size={14} color="#CBD5E1" strokeWidth={2} />
                      </button>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: group.color }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>{group.name}</span>
                      <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{groupAthletes.length} atleter</span>
                      <button onClick={() => openEditGroup(group)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 6 }}>
                        <Pencil size={13} color="#CBD5E1" strokeWidth={2} />
                      </button>
                    </div>

                    {groupAthletes.length === 0 ? (
                      <div className="glass-card" style={{ padding: 20, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                        Inga atleter i denna grupp
                      </div>
                    ) : (
                      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        {groupAthletes.map((athlete, ii) => (
                          <button
                            key={athlete.id}
                            onClick={() => openEditAthlete(athlete)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: ii < groupAthletes.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <div style={{ width: 40, height: 40, borderRadius: 13, background: `${group.color}18`, border: `1.5px solid ${group.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 14 }}>
                              <span style={{ fontSize: 16, fontWeight: 800, color: group.color }}>{athlete.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: athlete.active ? '#0F172A' : '#94A3B8' }}>{athlete.name}</div>
                              {athlete.email && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{athlete.email}</div>}
                            </div>
                            <span style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: athlete.active ? 'rgba(13,115,119,0.1)' : 'rgba(0,0,0,0.05)', color: athlete.active ? '#0D7377' : '#94A3B8', flexShrink: 0 }}>
                              {athlete.active ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}</SortableGroupSection>
              )
            })}
          </SortableContext>
        </DndContext>

        {visibleAthletes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(13,115,119,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Users size={26} color="#0D7377" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Inga atleter ännu</p>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>Tryck + Atlet för att lägga till</p>
          </div>
        )}
      </div>

      {/* ── Add athlete sheet ───────────────────────────────────────────────────── */}
      {showAddAthlete && (
        <>
          <div onClick={() => setShowAddAthlete(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, padding: '16px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Ny atlet</h2>
              <button onClick={() => setShowAddAthlete(false)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>
            <input value={newAthleteName} onChange={e => setNewAthleteName(e.target.value)} placeholder="Namn *" className="glass-input" style={{ width: '100%', padding: '12px 14px', fontSize: 15, marginBottom: 10 }} autoFocus />
            <input value={newAthleteEmail} onChange={e => setNewAthleteEmail(e.target.value)} placeholder="E-post (valfritt)" className="glass-input" style={{ width: '100%', padding: '12px 14px', fontSize: 15, marginBottom: 16 }} />
            <div style={{ marginBottom: 22 }}>
              <div className="text-label" style={{ marginBottom: 8 }}>Grupp</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {groups.map(g => (
                  <button key={g.id} onClick={() => setNewAthleteGroup(g.id)} style={{ padding: '8px 16px', borderRadius: 9999, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: newAthleteGroup === g.id ? g.color : 'rgba(0,0,0,0.06)', color: newAthleteGroup === g.id ? 'white' : '#64748B', transition: 'all 0.15s ease' }}>
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={addAthlete} disabled={saving || !newAthleteName.trim() || !newAthleteGroup} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, cursor: 'pointer', opacity: newAthleteName.trim() && newAthleteGroup ? 1 : 0.4 }}>
              {saving ? 'Sparar...' : 'Lägg till atlet'}
            </button>
          </div>
        </>
      )}

      {/* ── Add group sheet ─────────────────────────────────────────────────────── */}
      {showAddGroup && (
        <>
          <div onClick={() => setShowAddGroup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, padding: '16px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Ny grupp</h2>
              <button onClick={() => setShowAddGroup(false)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>
            <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Namn på gruppen..." className="glass-input" style={{ width: '100%', padding: '12px 14px', fontSize: 15, marginBottom: 18 }} autoFocus />
            <div style={{ marginBottom: 22 }}>
              <div className="text-label" style={{ marginBottom: 10 }}>Färg</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {GROUP_COLORS.map(c => (
                  <button key={c} onClick={() => setNewGroupColor(c)} style={{ width: 36, height: 36, borderRadius: '50%', background: c, border: newGroupColor === c ? '3px solid #0F172A' : '3px solid transparent', cursor: 'pointer', boxShadow: newGroupColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none', transition: 'all 0.15s ease' }} />
                ))}
              </div>
            </div>
            <button onClick={addGroup} disabled={saving || !newGroupName.trim()} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, cursor: 'pointer', opacity: newGroupName.trim() ? 1 : 0.4 }}>
              {saving ? 'Sparar...' : 'Skapa grupp'}
            </button>
          </div>
        </>
      )}

      {/* ── Edit athlete sheet ──────────────────────────────────────────────────── */}
      {editAthlete && (
        <>
          <div onClick={() => setEditAthlete(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, padding: '16px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Redigera atlet</h2>
              <button onClick={() => setEditAthlete(null)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>
            <input value={editAthleteName} onChange={e => setEditAthleteName(e.target.value)} placeholder="Namn *" className="glass-input" style={{ width: '100%', padding: '12px 14px', fontSize: 15, marginBottom: 10 }} autoFocus />
            <input value={editAthleteEmail} onChange={e => setEditAthleteEmail(e.target.value)} placeholder="E-post (valfritt)" className="glass-input" style={{ width: '100%', padding: '12px 14px', fontSize: 15, marginBottom: 16 }} />
            <div style={{ marginBottom: 16 }}>
              <div className="text-label" style={{ marginBottom: 8 }}>Grupp</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {groups.map(g => (
                  <button key={g.id} onClick={() => setEditAthleteGroup(g.id)} style={{ padding: '8px 16px', borderRadius: 9999, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: editAthleteGroup === g.id ? g.color : 'rgba(0,0,0,0.06)', color: editAthleteGroup === g.id ? 'white' : '#64748B', transition: 'all 0.15s ease' }}>
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setEditAthleteActive(a => !a)}
                style={{ padding: '9px 18px', borderRadius: 9999, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: editAthleteActive ? 'rgba(13,115,119,0.1)' : 'rgba(0,0,0,0.06)', color: editAthleteActive ? '#0D7377' : '#94A3B8', transition: 'all 0.15s ease' }}
              >
                {editAthleteActive ? 'Aktiv' : 'Inaktiv'}
              </button>
            </div>
            <button onClick={saveAthlete} disabled={saving || !editAthleteName.trim()} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, cursor: 'pointer', opacity: editAthleteName.trim() ? 1 : 0.4, marginBottom: 10 }}>
              {saving ? 'Sparar...' : 'Spara ändringar'}
            </button>
            {!confirmDeleteAthlete ? (
              <button onClick={() => setConfirmDeleteAthlete(true)} style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', borderRadius: 14, background: 'rgba(220,38,38,0.08)', border: 'none', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Trash2 size={14} strokeWidth={2.5} /> Ta bort atlet
              </button>
            ) : (
              <div style={{ background: 'rgba(220,38,38,0.07)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', marginBottom: 12, textAlign: 'center' }}>Ta bort {editAthlete.name}?</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDeleteAthlete(false)} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(0,0,0,0.06)', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Avbryt</button>
                  <button onClick={deleteAthlete} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: 12, background: '#DC2626', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'white' }}>
                    {saving ? 'Tar bort...' : 'Ta bort'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Edit group sheet ────────────────────────────────────────────────────── */}
      {editGroup && (
        <>
          <div onClick={() => setEditGroup(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100 }} />
          <div className="glass-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, padding: '16px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Redigera grupp</h2>
              <button onClick={() => setEditGroup(null)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748B" strokeWidth={2.5} />
              </button>
            </div>
            <input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} placeholder="Namn på gruppen..." className="glass-input" style={{ width: '100%', padding: '12px 14px', fontSize: 15, marginBottom: 18 }} autoFocus />
            <div style={{ marginBottom: 22 }}>
              <div className="text-label" style={{ marginBottom: 10 }}>Färg</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {GROUP_COLORS.map(c => (
                  <button key={c} onClick={() => setEditGroupColor(c)} style={{ width: 36, height: 36, borderRadius: '50%', background: c, border: editGroupColor === c ? '3px solid #0F172A' : '3px solid transparent', cursor: 'pointer', boxShadow: editGroupColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none', transition: 'all 0.15s ease' }} />
                ))}
              </div>
            </div>
            <button onClick={saveGroup} disabled={saving || !editGroupName.trim()} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, cursor: 'pointer', opacity: editGroupName.trim() ? 1 : 0.4, marginBottom: 10 }}>
              {saving ? 'Sparar...' : 'Spara ändringar'}
            </button>
            {!confirmDeleteGroup ? (
              <button onClick={() => setConfirmDeleteGroup(true)} style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', borderRadius: 14, background: 'rgba(220,38,38,0.08)', border: 'none', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Trash2 size={14} strokeWidth={2.5} /> Ta bort grupp
              </button>
            ) : (
              <div style={{ background: 'rgba(220,38,38,0.07)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', marginBottom: 4, textAlign: 'center' }}>Ta bort {editGroup.name}?</p>
                <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, textAlign: 'center' }}>Atleterna i gruppen behålls men blir otilldelade</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDeleteGroup(false)} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(0,0,0,0.06)', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Avbryt</button>
                  <button onClick={deleteGroup} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: 12, background: '#DC2626', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'white' }}>
                    {saving ? 'Tar bort...' : 'Ta bort'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
