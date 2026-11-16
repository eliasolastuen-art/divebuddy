'use client'

import { useState } from 'react'
import type { TrainingFields } from '@/lib/library/trainingSave'
import { Segmented } from '@/components/library/GroupTiles'
import { C } from '@/components/schedule/ui'
import BottomSheet, { fieldLabel, linkButton, textInput } from './BottomSheet'

// The ⋯ menu: everything that should not be in the main view
export default function TrainingMenu({ fields, onChange, folders, purposeTypes, groups, fromSchedule, onSaveTemplate, onClose }: {
  fields: TrainingFields
  onChange: (patch: Partial<TrainingFields>) => void
  folders: { id: string; name: string }[]
  purposeTypes: { id: string; name: string }[]
  groups: { id: string; name: string }[]
  fromSchedule: boolean
  onSaveTemplate: (name: string) => Promise<void>
  onClose: () => void
}) {
  const [tmplName, setTmplName] = useState(fields.title)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  const saveTemplate = async () => {
    if (!tmplName.trim()) return
    setSaving(true)
    try {
      await onSaveTemplate(tmplName.trim())
      setSaved('Sparad som mall.')
    } catch (e) {
      setSaved(e instanceof Error ? e.message : 'Kunde inte spara mallen')
    }
    setSaving(false)
  }

  const select: React.CSSProperties = { ...textInput, fontWeight: 600, appearance: 'auto' }

  return (
    <BottomSheet title="Mer" onClose={onClose}>
      {!fromSchedule && (
        <>
          <label style={fieldLabel}>
            Grupp
            <select value={fields.group_id ?? ''} onChange={e => onChange({ group_id: e.target.value || null })} style={select}>
              <option value="">Ingen grupp</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          <label style={fieldLabel}>
            Datum
            <input type="date" value={fields.scheduled_date ?? ''} onChange={e => onChange({ scheduled_date: e.target.value || null })} style={select} />
          </label>
        </>
      )}
      <div style={fieldLabel}>
        Status
        <Segmented label="Status" value={fields.status === 'published' ? 'published' : 'draft'}
          options={[['draft', 'Utkast'], ['published', 'Publicerat']]}
          onChange={s => onChange({ status: s })} />
      </div>
      <label style={fieldLabel}>
        Fokus
        <select value={fields.purpose_type ?? ''} onChange={e => {
          const pt = purposeTypes.find(p => p.id === e.target.value)
          onChange({ purpose_type: pt?.id ?? null, purpose: pt?.name ?? null })
        }} style={select}>
          <option value="">Inget fokus</option>
          {purposeTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label style={fieldLabel}>
        Mapp
        <select value={fields.folder_id ?? ''} onChange={e => onChange({ folder_id: e.target.value || null })} style={select}>
          <option value="">Ingen mapp</option>
          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>
      <div style={{ ...fieldLabel, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
        Spara som mall
        <input type="text" value={tmplName} onChange={e => setTmplName(e.target.value)} placeholder="Mallens namn" style={select} />
        <button type="button" onClick={saveTemplate} disabled={saving || !tmplName.trim()} style={linkButton}>
          {saving ? 'Sparar …' : '+ Spara passet som mall'}
        </button>
        {saved && <span role="status" style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{saved}</span>}
      </div>
    </BottomSheet>
  )
}
