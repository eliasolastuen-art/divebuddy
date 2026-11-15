'use client'
import { useState } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'

function genId() { return Math.random().toString(36).slice(2) }

interface BlockItem {
  id: string
  library_item_id?: string
  custom_name: string
  sets?: number
  reps?: number
  height?: string
  duration_seconds?: number
  notes: string
  isFromLibrary: boolean
  libraryItem?: unknown
  assigned_athlete_id?: string | null
}

interface Props {
  items: BlockItem[]
  athletes: { id: string; name: string }[]
  onChange: (items: BlockItem[]) => void
  onOpenPicker: (athleteId: string) => void
}

export default function AthleteBlockEditor({ items, athletes, onChange, onOpenPicker }: Props) {
  const [customInputFor, setCustomInputFor] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')

  const addCustom = (athleteId: string) => {
    if (!customName.trim()) return
    onChange([...items, {
      id: genId(),
      custom_name: customName.trim(),
      notes: '',
      isFromLibrary: false,
      assigned_athlete_id: athleteId,
    }])
    setCustomInputFor(null)
    setCustomName('')
  }

  const removeDive = (id: string) =>
    onChange(items.filter(i => i.id !== id))

  if (athletes.length === 0) {
    return (
      <div style={{ padding: '14px 0', textAlign: 'center', color: '#56637A', fontSize: 13 }}>
        Välj en grupp för att se atleter
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {athletes.map(athlete => {
        const athleteItems = items.filter(i => i.assigned_athlete_id === athlete.id)
        return (
          <div
            key={athlete.id}
            style={{ background: 'rgba(43,92,158,0.04)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(43,92,158,0.12)' }}
          >
            {/* Athlete header */}
            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15 }}>🏊</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1E2B42', flex: 1 }}>{athlete.name}</span>
              {athleteItems.length > 0 && (
                <span style={{ fontSize: 11, color: '#2B5C9E', fontWeight: 600 }}>{athleteItems.length} hopp</span>
              )}
            </div>

            {/* Dive rows */}
            {athleteItems.map((item, idx) => (
              <div
                key={item.id}
                style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderTop: '1px solid rgba(43,92,158,0.08)', gap: 8, background: '#FFFFFF' }}
              >
                <span style={{ fontSize: 13, flex: 1, color: '#1E2B42' }}>
                  {idx + 1}. {item.custom_name}
                </span>
                <button
                  onClick={() => removeDive(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', opacity: 0.35, flexShrink: 0 }}
                >
                  <Trash2 size={13} color="#56637A" strokeWidth={2} />
                </button>
              </div>
            ))}

            {/* Custom input row */}
            {customInputFor === athlete.id && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(43,92,158,0.08)', background: '#FFFFFF', display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  autoFocus
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustom(athlete.id)}
                  placeholder="Övningsnamn"
                  style={{ flex: 1, minWidth: 110, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(43,92,158,0.2)', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: 'white' }}
                />
                <button
                  onClick={() => addCustom(athlete.id)}
                  disabled={!customName.trim()}
                  style={{ padding: '7px 12px', borderRadius: 8, background: customName.trim() ? '#2B5C9E' : 'rgba(0,0,0,0.08)', color: customName.trim() ? 'white' : '#56637A', border: 'none', fontWeight: 700, fontSize: 13, cursor: customName.trim() ? 'pointer' : 'default' }}
                >
                  Lägg till
                </button>
                <button
                  onClick={() => { setCustomInputFor(null); setCustomName('') }}
                  style={{ padding: '7px 10px', borderRadius: 8, background: 'transparent', color: '#56637A', border: 'none', fontSize: 13, cursor: 'pointer' }}
                >
                  Avbryt
                </button>
              </div>
            )}

            {/* Add buttons */}
            {customInputFor !== athlete.id && (
              <div style={{ display: 'flex', gap: 6, padding: '8px 12px', borderTop: '1px solid rgba(43,92,158,0.06)' }}>
                <button
                  onClick={() => onOpenPicker(athlete.id)}
                  style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1.5px dashed rgba(43,92,158,0.3)', background: 'rgba(43,92,158,0.04)', fontSize: 12, fontWeight: 600, color: '#2B5C9E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                >
                  <Search size={12} /> Bibliotek
                </button>
                <button
                  onClick={() => { setCustomInputFor(athlete.id); setCustomName('') }}
                  style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1.5px dashed rgba(0,0,0,0.1)', background: 'transparent', fontSize: 12, fontWeight: 600, color: '#56637A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                >
                  <Plus size={12} /> Eget hopp
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
