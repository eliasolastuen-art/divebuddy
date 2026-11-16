'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { createExercise, updateExercise, type Exercise, type LibraryArea, type LibraryGroup } from '@/lib/library/queries'
import { exerciseImageUrl, uploadExerciseImage } from '@/lib/library/image'
import { C } from '@/components/schedule/ui'

// Design screen 10 "Ny övning": photo first (camera opens directly on a phone),
// name (the only required field), where (Land/Vatten) and group.
// Also used to edit an exercise from the library (adds height).

const HEIGHTS = ['1', '3', '5', '7,5', '10']

const chip = (on: boolean): React.CSSProperties => ({
  minHeight: 44, padding: '0 18px', borderRadius: 999, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
  background: on ? C.primary : '#fff', color: on ? '#fff' : C.text, border: `1px solid ${on ? C.primary : '#C9D5E3'}`,
})
const label: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: C.muted }

export default function ExerciseForm({ groups, exercise, initialArea = 'vatten', initialGroupId, saveLabel, onSaved, onClose }: {
  groups: LibraryGroup[]
  exercise?: Exercise | null // edit when set
  initialArea?: LibraryArea
  initialGroupId?: string | null
  saveLabel: string
  onSaved: (e: Exercise) => void
  onClose: () => void
}) {
  const { profile } = useUser()
  const db = useMemo(() => createClient(), [])
  const fileRef = useRef<HTMLInputElement>(null)
  const startGroup = groups.find(g => g.id === (exercise?.groupId ?? initialGroupId))
  const [area, setArea] = useState<LibraryArea>(startGroup?.area ?? initialArea)
  const [groupId, setGroupId] = useState<string | null>(startGroup?.id ?? null)
  const [name, setName] = useState(exercise?.name ?? '')
  const [height, setHeight] = useState(exercise?.defaultHeight ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const areaGroups = groups.filter(g => g.area === area)
  // Default group: the one we came from, else the first in the area
  useEffect(() => {
    if (!groupId || !areaGroups.some(g => g.id === groupId)) setGroupId(areaGroups[0]?.id ?? null)
  }, [area, groups.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Existing photo (private bucket → signed URL)
  useEffect(() => {
    if (!exercise?.imagePath) return
    exerciseImageUrl(db, exercise.imagePath).then(url => setPreview(p => p ?? url))
  }, [db, exercise?.imagePath])

  const pick = (f: File | null) => {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const save = async () => {
    if (!name.trim() || !groupId || !profile?.club_id) return
    setSaving(true)
    setError(null)
    try {
      let saved: Exercise
      if (exercise) {
        await updateExercise(db, exercise.id, { name, groupId, defaultHeight: height.trim() || null })
        saved = { ...exercise, name: name.trim(), groupId, defaultHeight: height.trim() || null }
      } else {
        saved = await createExercise(db, profile.club_id, profile.id, { name, groupId }, area)
      }
      if (file) {
        try {
          const path = await uploadExerciseImage(db, profile.club_id, saved.id, file)
          await updateExercise(db, saved.id, { imagePath: path })
          saved = { ...saved, imagePath: path }
        } catch (e) {
          // The exercise is saved; tell the coach the photo did not make it
          setError(`Övningen sparades, men bilden gick inte att ladda upp: ${e instanceof Error ? e.message : 'okänt fel'}`)
          setSaving(false)
          onSaved(saved)
          return
        }
      }
      onSaved(saved)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara övningen')
      setSaving(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={exercise ? 'Ändra övning' : 'Ny övning'} style={{
      position: 'fixed', inset: 0, zIndex: 10300, display: 'flex', flexDirection: 'column',
      background: C.bg, color: C.text, paddingTop: 'var(--safe-top)',
    }}>
      <header style={{ flex: 'none', height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, background: C.bg, borderBottom: `1px solid ${C.line}` }}>
        <button type="button" onClick={onClose} aria-label="Tillbaka" style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.line}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}>
          <ArrowLeft size={18} color={C.text} strokeWidth={2.2} aria-hidden />
        </button>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>{exercise ? 'Ändra övning' : 'Ny övning'}</span>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={e => pick(e.target.files?.[0] ?? null)} />
        <button type="button" onClick={() => fileRef.current?.click()} style={{
          height: 170, flex: 'none', borderRadius: 18, border: preview ? `1px solid ${C.line}` : '2px dashed #9DB3CF', background: '#fff',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit',
          color: C.primary, cursor: 'pointer', overflow: 'hidden', padding: 0, position: 'relative',
        }}>
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', bottom: 10, right: 10, background: '#fff', borderRadius: 10, padding: '6px 10px', fontSize: 13.5, fontWeight: 700 }}>Byt bild</span>
            </>
          ) : (
            <>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></svg>
              <span style={{ fontSize: 17, fontWeight: 800 }}>Ta bild</span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: C.muted }}>eller välj en bild från mobilen</span>
            </>
          )}
        </button>

        <label style={{ ...label, display: 'flex', flexDirection: 'column', gap: 6 }}>
          Namn
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="T.ex. Volt på matta" style={{
            minHeight: 50, borderRadius: 14, border: '1px solid #C9D5E3', background: '#fff', padding: '0 14px', fontSize: 16,
            fontWeight: 600, color: C.text, fontFamily: 'inherit',
          }} />
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={label}>Var</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['land', 'vatten'] as LibraryArea[]).map(a => (
              <button key={a} type="button" aria-pressed={area === a} onClick={() => setArea(a)} style={chip(area === a)}>{a === 'land' ? 'Land' : 'Vatten'}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={label}>Grupp</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {areaGroups.map(g => (
              <button key={g.id} type="button" aria-pressed={groupId === g.id} onClick={() => setGroupId(g.id)} style={chip(groupId === g.id)}>{g.name}</button>
            ))}
          </div>
        </div>

        {exercise && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={label}>Höjd (meter)</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {HEIGHTS.map(h => (
                <button key={h} type="button" aria-pressed={height === h} onClick={() => setHeight(height === h ? '' : h)} style={chip(height === h)}>{h} m</button>
              ))}
            </div>
          </div>
        )}

        {!exercise && <p style={{ margin: 0, fontSize: 13.5, color: C.muted, fontWeight: 500 }}>Bara namnet måste fyllas i. Gruppen är förvald efter var du kom ifrån.</p>}
        {error && <p role="alert" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{error}</p>}
      </div>

      <div style={{ flex: 'none', padding: '12px 16px calc(22px + var(--safe-bottom))', background: '#fff', borderTop: `1px solid ${C.line}` }}>
        <button type="button" onClick={save} disabled={saving || !name.trim() || !groupId} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 54, borderRadius: 14, border: 'none',
          background: C.primary, color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          opacity: saving || !name.trim() ? 0.6 : 1,
        }}>{saving ? 'Sparar …' : saveLabel}</button>
      </div>
    </div>
  )
}
