'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { DAY_LONG, shortDate, weekdayIndex } from '@/lib/schedule/format'
import { isDive, type PrefilledItem } from '@/lib/library/queries'
import { fromRows, isTimeMode, saveAsTemplate, saveTraining, type EditorBlock, type EditorItem, type TrainingFields } from '@/lib/library/trainingSave'
import AthleteBlockEditor from '@/app/(app)/planning/AthleteBlockEditor'
import ExercisePicker from '@/components/library/ExercisePicker'
import { useLibrary } from '@/components/library/useLibrary'
import { C } from '@/components/schedule/ui'
import BlockCard, { type RowContext } from './BlockCard'
import { BlockSheet, ExerciseDetailSheet, NewBlockSheet, type NewBlockKind } from './EditorSheets'
import TrainingMenu from './TrainingMenu'
import Portal from '@/components/Portal'

// Design screen 8 "Bygg passet". Replaces TrainingBuilder: one name field,
// blocks as cards with − value + rows, everything else in the ⋯ menu.

const genId = () => `new-${Math.random().toString(36).slice(2)}`
const LAND_CATEGORIES = ['land', 'styrka', 'rorlighet', 'uppvarmning']
const CATEGORY_BY_NAME: Record<string, string> = { 'Uppvärmning': 'uppvarmning', Land: 'land', Vatten: 'vatten', Styrka: 'styrka' }

interface ScheduleLink { date: string; start: string | null; groupNames: string[] }

export default function TrainingEditor({ folders, onClose, onSaved, existingTraining, existingBlocks, template }: {
  folders: { id: string; name: string }[]
  onClose: () => void
  onSaved: (trainingId: string) => void
  template?: { name: string; groupId: string | null; blocks: EditorBlock[] } // new pass from a template
  existingTraining?: {
    id: string; title: string | null; folder_id: string | null; scheduled_date: string | null; status: string | null
    group_id: string | null; purpose: string | null; purpose_type: string | null; created_by: string | null; start_time: string | null
  } | null
  existingBlocks?: Parameters<typeof fromRows>[0]
}) {
  const db = useMemo(() => createClient(), [])
  const { profile } = useUser()
  const { groups: libGroups, exercises } = useLibrary()

  const initial = useMemo(() => fromRows(existingBlocks ?? []), [existingBlocks])
  const [blocks, setBlocks] = useState<EditorBlock[]>(template?.blocks ?? initial.blocks)
  const [savedBlockIds] = useState(() => initial.blocks.map(b => b.savedId!).filter(Boolean))
  const [savedItemIds] = useState(initial.savedItemIds)
  const [fields, setFields] = useState<TrainingFields>({
    title: existingTraining?.title ?? template?.name ?? '',
    folder_id: existingTraining?.folder_id ?? null,
    scheduled_date: existingTraining?.scheduled_date ?? null,
    status: existingTraining?.status === 'published' ? 'published' : existingTraining?.status === 'completed' ? 'completed' : 'draft',
    group_id: existingTraining?.group_id ?? template?.groupId ?? null,
    purpose: existingTraining?.purpose ?? null,
    purpose_type: existingTraining?.purpose_type ?? null,
  })

  const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
  const [purposeTypes, setPurposeTypes] = useState<{ id: string; name: string }[]>([])
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([])
  const [link, setLink] = useState<ScheduleLink | null>(null)

  const [picker, setPicker] = useState<{ blockId: string; athleteId: string | null } | null>(null)
  const [detail, setDetail] = useState<{ blockId: string; itemId: string } | null>(null)
  const [blockSheet, setBlockSheet] = useState<string | null>(null)
  const [newBlock, setNewBlock] = useState(false)
  const [menu, setMenu] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.club_id) return
    db.from('groups').select('id, name').eq('club_id', profile.club_id).order('sort_order').then(({ data }) => setGroups(data ?? []))
    db.from('training_purpose_types').select('id, name').order('sort_order').then(({ data }) => setPurposeTypes(data ?? []))
  }, [db, profile?.club_id])

  // Header info from the schedule when this training belongs to a scheduled pass
  useEffect(() => {
    if (!existingTraining?.id) return
    db.from('schedule_sessions').select('session_date, start_time, schedule_session_groups(groups(name, sort_order))')
      .eq('training_id', existingTraining.id).order('start_time')
      .then(({ data }) => {
        const rows = (data ?? []) as unknown as { session_date: string; start_time: string | null; schedule_session_groups: { groups: { name: string; sort_order: number } | null }[] }[]
        if (!rows.length) return
        const names = rows[0].schedule_session_groups.map(g => g.groups).filter((g): g is { name: string; sort_order: number } => !!g)
          .sort((a, b) => a.sort_order - b.sort_order).map(g => g.name)
        setLink({ date: rows[0].session_date, start: rows[0].start_time?.slice(0, 5) ?? null, groupNames: names })
      })
  }, [db, existingTraining?.id])

  useEffect(() => {
    if (!fields.group_id) { setAthletes([]); return }
    db.from('athletes').select('id, name').eq('group_id', fields.group_id).order('name').then(({ data }) => setAthletes(data ?? []))
  }, [db, fields.group_id])

  // ── Units and defaults ───────────────────────────────────────────────────
  const exById = useMemo(() => Object.fromEntries(exercises.map(e => [e.id, e])), [exercises])
  const dive = (it: EditorItem) => {
    const ex = it.library_item_id ? exById[it.library_item_id] : null
    return ex ? isDive(ex, libGroups) : it.libraryItem?.type === 'dive'
  }
  const ctx: RowContext = { unitFor: it => (dive(it) ? 'hopp' : 'st'), defaultReps: it => (dive(it) ? 4 : 10) }

  const allItems = blocks.flatMap(b => b.items)
  const hopp = allItems.filter(it => !isTimeMode(it) && dive(it)).reduce((s, it) => s + (it.reps ?? 0), 0)
  const min = Math.round(allItems.filter(isTimeMode).reduce((s, it) => s + (it.duration_seconds ?? 0), 0) / 60)
  const summary = [hopp ? `${hopp} hopp` : '', min ? `${min} min` : ''].filter(Boolean).join(' · ') || `${allItems.length} övningar`

  // ── Edits ────────────────────────────────────────────────────────────────
  const patchBlock = (id: string, fn: (b: EditorBlock) => EditorBlock) => setBlocks(bs => bs.map(b => (b.id === id ? fn(b) : b)))
  const patchItem = (blockId: string, it: EditorItem) => patchBlock(blockId, b => ({ ...b, items: b.items.map(x => (x.id === it.id ? it : x)) }))
  const removeItem = (blockId: string, itemId: string) => patchBlock(blockId, b => ({ ...b, items: b.items.filter(x => x.id !== itemId) }))

  const addPicked = (blockId: string, athleteId: string | null, picked: PrefilledItem[]) => {
    patchBlock(blockId, b => ({
      ...b,
      items: [...b.items, ...picked.map(p => ({
        id: genId(),
        library_item_id: p.exercise.id,
        custom_name: p.exercise.name,
        reps: p.reps,
        height: p.height ?? undefined,
        notes: '',
        isFromLibrary: true,
        libraryItem: { id: p.exercise.id, name: p.exercise.name, type: p.exercise.type, dd: p.exercise.dd },
        ...(athleteId ? { assigned_athlete_id: athleteId } : {}),
      }))],
    }))
    setPicker(null)
  }

  const createBlock = (k: NewBlockKind) => {
    const id = genId()
    if (k.kind === 'test') {
      setBlocks(bs => [...bs, { id, category: 'tavling', name: 'Testblock', notes: '', block_type: 'test', items: [] }])
    } else if (k.kind === 'athlete') {
      setBlocks(bs => [...bs, { id, category: 'vatten', name: 'Individuella hopp', notes: '', block_type: 'athlete', items: [], selectedAthleteIds: athletes.map(a => a.id) }])
    } else {
      setBlocks(bs => [...bs, { id, category: CATEGORY_BY_NAME[k.name] ?? 'vatten', name: k.name, notes: '', block_type: 'standard', items: [] }])
      setPicker({ blockId: id, athleteId: null })
    }
  }

  const save = async () => {
    if (!profile?.club_id) return
    if (!fields.title.trim()) { setError('Ge passet ett namn.'); return }
    setSaving(true)
    setError(null)
    try {
      const { trainingId } = await saveTraining(db, {
        trainingId: existingTraining?.id ?? null, clubId: profile.club_id, profileId: profile.id,
        createdBy: existingTraining?.created_by ?? null, fields: { ...fields, title: fields.title.trim() },
        blocks, savedBlockIds, savedItemIds,
      })
      onSaved(trainingId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara passet')
      setSaving(false)
    }
  }

  // ── Header text ──────────────────────────────────────────────────────────
  const groupName = groups.find(g => g.id === fields.group_id)?.name
  const headTitle = link?.groupNames.join(' + ') || groupName || 'Pass'
  const date = link?.date ?? fields.scheduled_date
  const start = link?.start ?? existingTraining?.start_time?.slice(0, 5) ?? null
  const headSub = date ? `${DAY_LONG[weekdayIndex(date)]} ${shortDate(date)}${start ? ` ${start}` : ''}` : 'Inget datum'

  const pickerBlock = picker ? blocks.find(b => b.id === picker.blockId) : null
  const detailBlock = detail ? blocks.find(b => b.id === detail.blockId) : null
  const detailItem = detailBlock?.items.find(i => i.id === detail?.itemId)
  const sheetBlock = blockSheet ? blocks.find(b => b.id === blockSheet) : null

  return (
    <Portal>
      <div role="dialog" aria-modal="true" aria-label="Bygg passet" style={{
        position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', flexDirection: 'column',
        background: C.bg, color: C.text, paddingTop: 'var(--safe-top)',
      }}>
        <header style={{ flex: 'none', height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, background: C.bg, borderBottom: `1px solid ${C.line}` }}>
          <button type="button" onClick={onClose} aria-label="Tillbaka" style={iconButton}>
            <ArrowLeft size={18} color={C.text} strokeWidth={2.2} aria-hidden />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{headTitle}</div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{headSub}</div>
          </div>
          <button type="button" onClick={() => setMenu(true)} aria-label="Mer" style={iconButton}>
            <MoreHorizontal size={18} color={C.text} strokeWidth={2.2} aria-hidden />
          </button>
        </header>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700, color: C.muted }}>
            Passets namn
            <input type="text" value={fields.title} onChange={e => setFields(f => ({ ...f, title: e.target.value }))}
              style={{ minHeight: 48, borderRadius: 14, border: '1px solid #C9D5E3', background: '#fff', padding: '0 14px', fontSize: 16, fontWeight: 700, color: C.text, fontFamily: 'inherit' }} />
          </label>

          {blocks.map(b => (
            <BlockCard key={b.id} block={b} ctx={ctx}
              onChangeItem={it => patchItem(b.id, it)}
              onOpenItem={it => setDetail({ blockId: b.id, itemId: it.id })}
              onAdd={() => setPicker({ blockId: b.id, athleteId: null })}
              onOpenBlock={() => setBlockSheet(b.id)}>
              {b.block_type === 'athlete' ? (
                <AthleteBlockEditor
                  items={b.items}
                  athletes={b.selectedAthleteIds?.length ? athletes.filter(a => b.selectedAthleteIds!.includes(a.id)) : athletes}
                  onChange={items => patchBlock(b.id, x => ({ ...x, items: items as EditorItem[] }))}
                  onOpenPicker={athleteId => setPicker({ blockId: b.id, athleteId })}
                />
              ) : undefined}
            </BlockCard>
          ))}

          <button type="button" onClick={() => setNewBlock(true)} style={{ minHeight: 50, borderRadius: 14, border: `1.5px solid ${C.primary}`, background: '#fff', color: C.primary, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
            + Nytt block
          </button>
          {error && <p role="alert" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{error}</p>}
        </div>

        <div style={{ flex: 'none', padding: '12px 16px calc(22px + var(--safe-bottom))', background: '#fff', borderTop: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.muted }}>{summary}</div>
          <button type="button" onClick={save} disabled={saving} style={{ minHeight: 52, padding: '0 28px', borderRadius: 14, border: 'none', background: C.primary, color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Sparar …' : 'Spara pass'}
          </button>
        </div>

        {picker && pickerBlock && (
          <ExercisePicker
            initialArea={LAND_CATEGORIES.includes(pickerBlock.category) ? 'land' : 'vatten'}
            onClose={() => setPicker(null)}
            onAdd={items => addPicked(picker.blockId, picker.athleteId, items)}
          />
        )}
        {detail && detailItem && (
          <ExerciseDetailSheet item={detailItem}
            onSave={it => patchItem(detail.blockId, it)}
            onRemove={() => removeItem(detail.blockId, detail.itemId)}
            onClose={() => setDetail(null)} />
        )}
        {sheetBlock && (
          <BlockSheet block={sheetBlock}
            onRename={name => patchBlock(sheetBlock.id, b => ({ ...b, name }))}
            onRemove={() => setBlocks(bs => bs.filter(b => b.id !== sheetBlock.id))}
            onClose={() => setBlockSheet(null)} />
        )}
        {newBlock && <NewBlockSheet onCreate={createBlock} onClose={() => setNewBlock(false)} />}
        {menu && (
          <TrainingMenu fields={fields} onChange={patch => setFields(f => ({ ...f, ...patch }))}
            folders={folders} purposeTypes={purposeTypes} groups={groups} fromSchedule={!!link}
            onSaveTemplate={name => saveAsTemplate(db, name, fields.group_id, blocks)}
            onClose={() => setMenu(false)} />
        )}
      </div>
    </Portal>
  )
}

const iconButton: React.CSSProperties = {
  width: 44, height: 44, flex: 'none', borderRadius: 12, border: `1px solid ${C.line}`, background: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer',
}
