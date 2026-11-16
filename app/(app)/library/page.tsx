'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchTemplates, type Exercise, type LibraryArea, type LibraryGroup, type TemplateSummary } from '@/lib/library/queries'
import { templateToBlocks, type EditorBlock } from '@/lib/library/trainingSave'
import GroupTiles, { Segmented } from '@/components/library/GroupTiles'
import ExerciseList from '@/components/library/ExerciseList'
import ExerciseForm from '@/components/library/ExerciseForm'
import { useLibrary } from '@/components/library/useLibrary'
import TrainingEditor from '@/components/planning/TrainingEditor'
import { C, Empty, ListCard } from '@/components/schedule/ui'

type Tab = LibraryArea | 'mall'

// Design screen 11: Vatten, Land and Mallar. Same group tiles and lists as
// the exercise picker; tapping an exercise edits it, a template opens the
// pass editor with its content.
export default function LibraryPage() {
  const router = useRouter()
  const db = useMemo(() => createClient(), [])
  const { groups, exercises, loading, error, refresh, addLocal } = useLibrary()
  const [tab, setTab] = useState<Tab>('vatten')
  const [groupId, setGroupId] = useState<string | null>(null)
  const [form, setForm] = useState<{ exercise: Exercise | null; group: LibraryGroup | null } | null>(null)
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null)
  const [openTemplate, setOpenTemplate] = useState<{ name: string; groupId: string | null; blocks: EditorBlock[] } | null>(null)
  const [groupNames, setGroupNames] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (tab !== 'mall' || templates) return
    fetchTemplates(db).then(setTemplates).catch(() => setTemplates([]))
    db.from('groups').select('id, name').then(({ data }) => setGroupNames(Object.fromEntries((data ?? []).map(g => [g.id, g.name]))))
  }, [db, tab, templates])

  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    exercises.forEach(e => { if (e.groupId) out[e.groupId] = (out[e.groupId] ?? 0) + 1 })
    return out
  }, [exercises])

  const group = groupId ? groups.find(g => g.id === groupId) ?? null : null
  const tileSub = (g: LibraryGroup) => {
    if (g.area === 'land') return g.description
    const n = counts[g.id] ?? 0
    // Design: "Framåt · 13 hopp" for the dive groups, otherwise just the count
    if (['100', '200', '300', '400'].includes(g.name)) return `${g.description} · ${n} hopp`
    return `${n} ${g.name === 'Skruvar' ? 'hopp' : 'övningar'}`
  }

  const openMall = async (t: TemplateSummary) => {
    setBusy(true)
    try { setOpenTemplate(await templateToBlocks(db, t.kind, t.id)) } finally { setBusy(false) }
  }

  const switchTab = (t: Tab) => { setTab(t); setGroupId(null) }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14, color: C.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0, flex: 1, fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>Bibliotek</h1>
        <button type="button" onClick={() => setForm({ exercise: null, group })} style={{
          display: 'flex', alignItems: 'center', minHeight: 44, padding: '0 18px', borderRadius: 14, border: 'none',
          background: C.primary, color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
        }}>+ Ny övning</button>
      </div>
      <Segmented label="Bibliotek" value={tab} onChange={switchTab} options={[['vatten', 'Vatten'], ['land', 'Land'], ['mall', 'Mallar']]} />

      <div style={{ paddingTop: 4 }}>
        {error && <p style={{ margin: 0, color: C.muted }}>{error}</p>}
        {loading && tab !== 'mall' && <ListCard><Empty>Laddar övningar …</Empty></ListCard>}

        {!loading && tab !== 'mall' && !group && (
          <GroupTiles groups={groups.filter(g => g.area === tab)} subtitle={tileSub} onOpen={g => setGroupId(g.id)} />
        )}

        {!loading && tab !== 'mall' && group && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" onClick={() => setGroupId(null)} style={{ alignSelf: 'flex-start', minHeight: 44, border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: C.primary, cursor: 'pointer' }}>
              ‹ {tab === 'vatten' ? 'Vatten' : 'Land'}
            </button>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em' }}>{group.name}</h2>
            <ExerciseList exercises={exercises.filter(e => e.groupId === group.id)}
              onOpen={e => setForm({ exercise: e, group })}
              onNew={() => setForm({ exercise: null, group })} />
          </div>
        )}

        {tab === 'mall' && (
          <ListCard>
            {templates === null && <Empty>Hämtar mallar …</Empty>}
            {templates?.length === 0 && <Empty>Inga sparade mallar. Spara ett pass som mall via ⋯ i passbyggaren.</Empty>}
            {templates?.map((t, i) => (
              <button key={`${t.kind}-${t.id}`} type="button" disabled={busy} onClick={() => openMall(t)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', minHeight: 56, background: 'none', border: 'none',
                borderBottom: i < templates.length - 1 ? `1px solid ${C.line}` : 'none', textAlign: 'left', fontFamily: 'inherit', color: C.text, cursor: 'pointer',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
                    {[t.kind === 'pass' ? 'Pass' : 'Block', t.groupId ? groupNames[t.groupId] : null, `${t.exerciseCount} övningar`].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span aria-hidden style={{ fontSize: 20, color: '#8A96A8', lineHeight: 1 }}>›</span>
              </button>
            ))}
          </ListCard>
        )}
      </div>

      {form && (
        <ExerciseForm groups={groups} exercise={form.exercise}
          initialArea={form.group?.area ?? (tab === 'land' ? 'land' : 'vatten')} initialGroupId={form.group?.id ?? null}
          saveLabel="Spara"
          onSaved={e => { if (form.exercise) refresh(); else addLocal(e); setForm(null) }}
          onClose={() => setForm(null)} />
      )}

      {openTemplate && (
        <TrainingEditor folders={[]} template={openTemplate}
          onClose={() => setOpenTemplate(null)}
          onSaved={id => router.push(`/planning/${id}`)} />
      )}
    </div>
  )
}
