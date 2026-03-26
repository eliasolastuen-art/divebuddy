'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface Props {
  athleteId: string
  athleteName: string
  sessionId: string
  onClose: () => void
}

export default function AddDiveSheet({ athleteId, athleteName, sessionId, onClose }: Props) {
  const [diveCode, setDiveCode] = useState('')
  const [diveName, setDiveName] = useState('')
  const [dd, setDd] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!diveCode.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('live_dive_log').insert({
      session_id: sessionId,
      athlete_id: athleteId,
      dive_code: diveCode.trim().toUpperCase(),
      dive_name: diveName.trim() || null,
      dd: dd ? parseFloat(dd) : null,
      status: 'done',
    })
    setSaving(false)
    onClose()
  }

  return (
    <div
      className="glass-sheet"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 400,
        borderRadius: '24px 24px 0 0',
        padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 32px)',
        maxWidth: 520, margin: '0 auto',
      }}
    >
      <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '0 auto 20px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            Lägg till hopp
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
            {athleteName}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={16} color="#64748B" />
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
          Hoppregel *
        </label>
        <input
          value={diveCode}
          onChange={e => setDiveCode(e.target.value)}
          placeholder="t.ex. 6245D"
          autoFocus
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12,
            border: '1.5px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.03)',
            fontSize: 16, fontWeight: 700, color: '#0F172A',
            fontFamily: 'inherit', boxSizing: 'border-box',
            textTransform: 'uppercase',
          }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
          Namn (valfritt)
        </label>
        <input
          value={diveName}
          onChange={e => setDiveName(e.target.value)}
          placeholder="t.ex. Dubbel bakåt med twist"
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12,
            border: '1.5px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.03)',
            fontSize: 14, color: '#0F172A', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
          DD (valfritt)
        </label>
        <input
          value={dd}
          onChange={e => setDd(e.target.value)}
          placeholder="t.ex. 3.2"
          type="number"
          step="0.1"
          min="1"
          max="5"
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12,
            border: '1.5px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.03)',
            fontSize: 14, color: '#0F172A', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={!diveCode.trim() || saving}
        style={{
          width: '100%', padding: '14px',
          background: diveCode.trim() ? 'linear-gradient(135deg, #6366F1, #4f46e5)' : 'rgba(0,0,0,0.08)',
          color: diveCode.trim() ? 'white' : '#94A3B8',
          border: 'none', borderRadius: 16,
          fontSize: 15, fontWeight: 700, cursor: diveCode.trim() ? 'pointer' : 'default',
          boxShadow: diveCode.trim() ? '0 3px 12px rgba(99,102,241,0.3)' : 'none',
          transition: 'all 0.15s',
        }}
      >
        {saving ? 'Sparar…' : 'Spara hopp'}
      </button>
    </div>
  )
}
