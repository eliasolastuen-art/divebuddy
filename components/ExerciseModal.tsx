'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

export interface ExerciseData {
  id: string
  name: string
  code: string | null
  group_name: string | null
  notes: string | null
  category_id: string
}

interface ExerciseForm {
  name: string
  code: string
  group_name: string
  notes: string
  category_id: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  categories: { id: string; name: string }[]
  initialCategoryId?: string
  exercise?: ExerciseData | null
}

const GROUP_OPTIONS = ['A', 'B', 'C', 'D']

export default function ExerciseModal({ open, onClose, onSaved, categories, initialCategoryId, exercise }: Props) {
  const supabase = createClient()

  const [form, setForm] = useState<ExerciseForm>({
    name: '', code: '', group_name: '', notes: '', category_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Reset form whenever the modal opens or the exercise changes
  useEffect(() => {
    if (!open) return
    if (exercise) {
      setForm({
        name: exercise.name,
        code: exercise.code ?? '',
        group_name: exercise.group_name ?? '',
        notes: exercise.notes ?? '',
        category_id: exercise.category_id,
      })
    } else {
      setForm({
        name: '',
        code: '',
        group_name: '',
        notes: '',
        category_id: initialCategoryId ?? categories[0]?.id ?? '',
      })
    }
    setShowDeleteConfirm(false)
  }, [open, exercise?.id, initialCategoryId])

  if (!open) return null

  const handleSave = async () => {
    if (!form.name.trim()) return
    console.log('Saving exercise:', form)
    setSaving(true)

    // Note: DB column is `description`, not `notes`
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      group_name: form.group_name || null,
      description: form.notes.trim() || null,
      category_id: form.category_id,
    }

    if (exercise) {
      const { error } = await supabase.from('library_items').update(payload).eq('id', exercise.id)
      if (error) console.error('Update failed:', error)
    } else {
      const { error } = await supabase.from('library_items').insert({
        ...payload,
        type: 'custom',
        archived: false,
      })
      if (error) console.error('Insert failed:', error)
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  const handleDelete = async () => {
    if (!exercise) return
    setDeleting(true)
    const { error } = await supabase.from('library_items').update({ archived: true }).eq('id', exercise.id)
    if (error) console.error('Delete failed:', error)
    setDeleting(false)
    onSaved()
    onClose()
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100 }}
      />
      <div
        className="glass-sheet"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, padding: '16px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)', maxHeight: '94vh', overflowY: 'auto' }}
      >
        <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
            {exercise ? 'Edit Exercise' : 'New Exercise'}
          </h2>
          <button
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} color="#64748B" strokeWidth={2.5} />
          </button>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <div className="text-label" style={{ marginBottom: 8 }}>Name *</div>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Forward Dive Pike"
            className="glass-input"
            style={{ width: '100%', padding: '12px 14px', fontSize: 15 }}
            autoFocus
          />
        </div>

        {/* Code + Group */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div className="text-label" style={{ marginBottom: 8 }}>Code</div>
            <input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder="e.g. 101B"
              className="glass-input"
              style={{ width: '100%', padding: '12px 14px', fontSize: 15 }}
            />
          </div>
          <div>
            <div className="text-label" style={{ marginBottom: 8 }}>Group</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {GROUP_OPTIONS.map(g => (
                <button
                  key={g}
                  onClick={() => setForm(f => ({ ...f, group_name: f.group_name === g ? '' : g }))}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 700,
                    background: form.group_name === g ? '#0D7377' : 'rgba(0,0,0,0.06)',
                    color: form.group_name === g ? 'white' : '#64748B',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom: 16 }}>
          <div className="text-label" style={{ marginBottom: 8 }}>Category</div>
          <select
            value={form.category_id}
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
            className="glass-input"
            style={{ width: '100%', padding: '12px 14px', fontSize: 15 }}
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 24 }}>
          <div className="text-label" style={{ marginBottom: 8 }}>Notes</div>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Coaching notes, technique cues…"
            rows={3}
            className="glass-input"
            style={{ width: '100%', padding: '12px 14px', fontSize: 14, resize: 'none', fontFamily: 'inherit', borderRadius: 14 }}
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          className="btn-primary"
          style={{ width: '100%', padding: '15px', fontSize: 15, cursor: 'pointer', opacity: form.name.trim() ? 1 : 0.4, marginBottom: exercise ? 10 : 0 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {/* Delete (edit mode only) */}
        {exercise && !showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', borderRadius: 14, background: 'rgba(220,38,38,0.08)', border: 'none', color: '#DC2626' }}
          >
            Delete Exercise
          </button>
        )}

        {exercise && showDeleteConfirm && (
          <div style={{ background: 'rgba(220,38,38,0.07)', borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', marginBottom: 12, textAlign: 'center' }}>Delete this exercise?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(0,0,0,0.06)', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 1, padding: '11px', borderRadius: 12, background: '#DC2626', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'white' }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
