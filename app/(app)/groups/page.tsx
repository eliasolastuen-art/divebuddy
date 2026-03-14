'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MOCK_SESSION } from '@/lib/context/session'
import { UserPlus, Users, UserCheck, X } from 'lucide-react'

interface Group {
  id: string
  name: string
  color: string
  description: string | null
}

interface Athlete {
  id: string
  name: string
  email: string | null
  active: boolean
  group_id: string
}

const GROUP_COLORS = ['#0D7377','#D4A017','#6366F1','#EC4899','#10B981','#F97316','#3B82F6','#8B5CF6']

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [showAddAthlete, setShowAddAthlete] = useState(false)
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [newAthleteName, setNewAthleteName] = useState('')
  const [newAthleteEmail, setNewAthleteEmail] = useState('')
  const [newAthleteGroup, setNewAthleteGroup] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('#0D7377')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const supabase = createClient()
    const [{ data: g }, { data: a }] = await Promise.all([
      supabase.from('groups').select('*').eq('club_id', MOCK_SESSION.clubId).order('name'),
      supabase.from('athletes').select('*').eq('club_id', MOCK_SESSION.clubId).order('name'),
    ])
    if (g) setGroups(g)
    if (a) setAthletes(a)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const addAthlete = async () => {
    if (!newAthleteName.trim() || !newAthleteGroup) return
    setSaving(true)
    await createClient().from('athletes').insert({
      club_id: MOCK_SESSION.clubId,
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
      club_id: MOCK_SESSION.clubId,
      name: newGroupName.trim(),
      color: newGroupColor,
    })
    setNewGroupName(''); setShowAddGroup(false); setSaving(false)
    load()
  }

  const toggleActive = async (athlete: Athlete) => {
    await createClient().from('athletes').update({ active: !athlete.active }).eq('id', athlete.id)
    setAthletes(prev => prev.map(a => a.id === athlete.id ? { ...a, active: !a.active } : a))
  }

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

      {/* Athletes list */}
      <div style={{ padding: '0 16px' }}>
        {groups.filter(g => !selectedGroup || g.id === selectedGroup).map(group => {
          const groupAthletes = visibleAthletes.filter(a => a.group_id === group.id)
          if (groupAthletes.length === 0 && selectedGroup) return null
          return (
            <div key={group.id} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '0 2px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: group.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group.name}</span>
                <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{groupAthletes.length} atleter</span>
              </div>

              {groupAthletes.length === 0 ? (
                <div className="glass-card" style={{ padding: 20, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                  Inga atleter i denna grupp
                </div>
              ) : (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {groupAthletes.map((athlete, ii) => (
                    <div key={athlete.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: ii < groupAthletes.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 13, background: `${group.color}18`, border: `1.5px solid ${group.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 14 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: group.color }}>{athlete.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: athlete.active ? '#0F172A' : '#94A3B8' }}>{athlete.name}</div>
                        {athlete.email && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{athlete.email}</div>}
                      </div>
                      <button
                        onClick={() => toggleActive(athlete)}
                        style={{
                          padding: '5px 12px', borderRadius: 9999, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          background: athlete.active ? 'rgba(13,115,119,0.1)' : 'rgba(0,0,0,0.05)',
                          color: athlete.active ? '#0D7377' : '#94A3B8',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {athlete.active ? 'Aktiv' : 'Inaktiv'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

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

      {/* Add athlete modal */}
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

      {/* Add group modal */}
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
    </div>
  )
}
