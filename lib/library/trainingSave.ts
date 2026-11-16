import type { SupabaseClient } from '@supabase/supabase-js'

// Loading and saving a training's blocks and exercises for the pass editor.
// Saving updates rows by id instead of deleting and re-inserting them, so
// exercise_scores (ON DELETE CASCADE on training_block_items) survive.
// Only rows the coach removed are deleted.

export type BlockType = 'standard' | 'test' | 'athlete'

// Same shape as the old builder and AthleteBlockEditor use
export interface EditorItem {
  id: string // DB id for saved rows, a temporary id for new ones
  library_item_id?: string
  custom_name: string
  sets?: number
  reps?: number
  height?: string
  duration_seconds?: number
  notes: string
  isFromLibrary: boolean
  libraryItem?: { id: string; name: string; type?: string; dd?: number | null } | null
  assigned_athlete_id?: string | null
  raw?: { custom_name: string | null; notes: string | null } // as loaded, to write back unchanged
}

export interface EditorBlock {
  id: string
  savedId?: string
  category: string
  name: string
  notes: string
  block_type: BlockType
  items: EditorItem[]
  selectedAthleteIds?: string[]
}

export interface TrainingFields {
  title: string
  folder_id: string | null
  scheduled_date: string | null
  status: 'draft' | 'published' | 'completed'
  group_id: string | null
  purpose: string | null
  purpose_type: string | null
}

export interface LoadedTraining {
  fields: TrainingFields & { id: string; created_by: string | null; start_time: string | null }
  blocks: EditorBlock[]
  savedItemIds: string[]
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

const BLOCK_TYPES: BlockType[] = ['standard', 'test', 'athlete']

// Old builder's blocks (from /planning/[id]) → editor blocks
export function fromRows(rows: {
  id: string; category: string | null; name: string; notes: string | null; block_type: string | null
  items?: {
    id: string; library_item_id: string | null; custom_name: string | null; sets: number | null; reps: number | null
    height: string | null; duration_seconds: number | null; notes: string | null; assigned_athlete_id: string | null
    library_item?: { id: string; name: string; type?: string; dd?: number | null } | null
  }[]
}[]): { blocks: EditorBlock[]; savedItemIds: string[] } {
  const savedItemIds: string[] = []
  const blocks = rows.map(b => {
    const blockType = BLOCK_TYPES.includes(b.block_type as BlockType) ? (b.block_type as BlockType) : 'standard'
    const items: EditorItem[] = (b.items ?? []).map(i => {
      savedItemIds.push(i.id)
      return {
        id: i.id,
        library_item_id: i.library_item_id ?? undefined,
        custom_name: i.custom_name || i.library_item?.name || '',
        sets: i.sets ?? undefined,
        reps: i.reps ?? undefined,
        height: i.height ?? undefined,
        duration_seconds: i.duration_seconds ?? undefined,
        notes: i.notes ?? '',
        isFromLibrary: !!i.library_item_id,
        libraryItem: i.library_item ?? null,
        assigned_athlete_id: i.assigned_athlete_id,
        raw: { custom_name: i.custom_name, notes: i.notes },
      }
    })
    return {
      id: b.id, savedId: b.id, category: b.category ?? 'vatten', name: b.name, notes: b.notes ?? '', block_type: blockType, items,
      selectedAthleteIds: blockType === 'athlete'
        ? Array.from(new Set(items.map(i => i.assigned_athlete_id).filter((x): x is string => !!x)))
        : undefined,
    }
  })
  return { blocks, savedItemIds }
}

// Unchanged text fields are written back exactly as loaded ('' stays '', a name on a library row stays)
const sameText = (now: string, raw: string | null | undefined) => (raw !== undefined && (raw ?? '') === now ? raw : undefined)

const itemRow = (it: EditorItem, sort_order: number) => ({
  library_item_id: it.library_item_id ?? null,
  custom_name: it.isFromLibrary
    ? (it.raw && (it.raw.custom_name === null || it.raw.custom_name === it.custom_name) ? it.raw.custom_name : null)
    : sameText(it.custom_name, it.raw?.custom_name) ?? (it.custom_name || null),
  sets: it.sets ?? null,
  reps: it.reps ?? null,
  height: it.height ?? null,
  duration_seconds: it.duration_seconds ?? null,
  notes: sameText(it.notes, it.raw?.notes) ?? (it.notes || null),
  sort_order,
  assigned_athlete_id: it.assigned_athlete_id ?? null,
})

export async function saveTraining(db: SupabaseClient, input: {
  trainingId: string | null
  clubId: string
  profileId: string
  createdBy: string | null
  fields: TrainingFields
  blocks: EditorBlock[]
  savedBlockIds: string[] // blocks that existed when the editor opened
  savedItemIds: string[] // items that existed when the editor opened
}): Promise<{ trainingId: string; blockIds: Record<string, string> }> {
  let trainingId = input.trainingId
  if (trainingId) {
    check(await db.from('trainings').update({
      ...input.fields,
      ...(input.createdBy ? {} : { created_by: input.profileId }), // so "senaste antal" can find it
    }).eq('id', trainingId))
  } else {
    const row = check(await db.from('trainings').insert({
      ...input.fields, club_id: input.clubId, created_by: input.profileId, training_type: 'training',
    }).select('id').single()) as { id: string }
    trainingId = row.id
  }

  const savedItems = new Set(input.savedItemIds)
  const keptBlocks = new Set<string>()
  const keptItems = new Set<string>()
  const blockIds: Record<string, string> = {}

  for (let i = 0; i < input.blocks.length; i++) {
    const b = input.blocks[i]
    const blockRow = { name: b.name, category: b.category, notes: b.notes || null, sort_order: i, block_type: b.block_type }
    let blockId = b.savedId
    if (blockId) {
      check(await db.from('training_blocks').update(blockRow).eq('id', blockId))
    } else {
      const row = check(await db.from('training_blocks').insert({ ...blockRow, training_id: trainingId }).select('id').single()) as { id: string }
      blockId = row.id
    }
    keptBlocks.add(blockId)
    blockIds[b.id] = blockId

    const inserts = []
    for (let j = 0; j < b.items.length; j++) {
      const it = b.items[j]
      if (savedItems.has(it.id)) {
        // Existing row: update in place (keeps scoring_enabled, dd_override and scores)
        check(await db.from('training_block_items').update({ ...itemRow(it, j), block_id: blockId }).eq('id', it.id))
        keptItems.add(it.id)
      } else {
        inserts.push({ ...itemRow(it, j), block_id: blockId })
      }
    }
    if (inserts.length) check(await db.from('training_block_items').insert(inserts))
  }

  const goneItems = input.savedItemIds.filter(id => !keptItems.has(id))
  if (goneItems.length) check(await db.from('training_block_items').delete().in('id', goneItems))
  const goneBlocks = input.savedBlockIds.filter(id => !keptBlocks.has(id))
  if (goneBlocks.length) check(await db.from('training_blocks').delete().in('id', goneBlocks))

  return { trainingId, blockIds }
}

export async function saveAsTemplate(db: SupabaseClient, name: string, groupId: string | null, blocks: EditorBlock[]) {
  const tmpl = check(await db.from('training_templates').insert({ name, group_id: groupId }).select('id').single()) as { id: string }
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const tb = check(await db.from('training_template_blocks').insert({
      training_template_id: tmpl.id, name: b.name, category: b.category, notes: b.notes || null, sort_order: i,
    }).select('id').single()) as { id: string }
    if (b.items.length) check(await db.from('training_template_items').insert(b.items.map((it, j) => ({
      block_id: tb.id, library_item_id: it.library_item_id ?? null, custom_name: it.isFromLibrary ? null : it.custom_name || null,
      sets: it.sets ?? null, reps: it.reps ?? null, height: it.height ?? null, duration_seconds: it.duration_seconds ?? null,
      notes: it.notes || null, order_index: j,
    }))))
  }
}

// ── Count or time per row (no own column) ──────────────────────────────────
// Time mode: duration_seconds set and reps empty. Switching clears the other field.

export const isTimeMode = (it: Pick<EditorItem, 'reps' | 'duration_seconds'>) => it.duration_seconds != null && it.reps == null

export function switchMode(it: EditorItem, defaultReps: number): EditorItem {
  return isTimeMode(it)
    ? { ...it, duration_seconds: undefined, reps: defaultReps }
    : { ...it, reps: undefined, duration_seconds: 300 }
}

export function step(it: EditorItem, dir: 1 | -1): EditorItem {
  if (isTimeMode(it)) return { ...it, duration_seconds: Math.max(300, (it.duration_seconds ?? 300) + dir * 300) }
  return { ...it, reps: Math.max(1, (it.reps ?? 0) + dir) }
}

// A saved pass or block template as unsaved editor blocks (opens in the pass editor)
export async function templateToBlocks(db: SupabaseClient, kind: 'pass' | 'block', id: string): Promise<{ name: string; groupId: string | null; blocks: EditorBlock[] }> {
  type Item = { library_item_id: string | null; custom_name: string | null; sets: number | null; reps: number | null; height: string | null; duration_seconds: number | null; notes: string | null; order_index: number | null; library_items: { id: string; name: string; type: string; dd: number | null } | null }
  const toItems = (items: Item[]): EditorItem[] => [...items].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map(i => ({
    id: `new-${Math.random().toString(36).slice(2)}`,
    library_item_id: i.library_item_id ?? undefined,
    custom_name: i.library_items?.name ?? i.custom_name ?? '',
    sets: i.sets ?? undefined, reps: i.reps ?? undefined, height: i.height ?? undefined,
    duration_seconds: i.duration_seconds ?? undefined, notes: i.notes ?? '',
    isFromLibrary: !!i.library_item_id, libraryItem: i.library_items,
  }))
  const itemCols = 'library_item_id, custom_name, sets, reps, height, duration_seconds, notes, order_index, library_items(id, name, type, dd)'
  if (kind === 'block') {
    const t = check(await db.from('block_templates').select(`name, category, group_id, block_template_items(${itemCols})`).eq('id', id).single()) as unknown as
      { name: string; category: string | null; group_id: string | null; block_template_items: Item[] }
    return { name: t.name, groupId: t.group_id, blocks: [{ id: `new-${id}`, category: t.category ?? 'vatten', name: t.name, notes: '', block_type: 'standard', items: toItems(t.block_template_items) }] }
  }
  const t = check(await db.from('training_templates').select(`name, group_id, training_template_blocks(id, name, category, notes, sort_order, training_template_items(${itemCols}))`).eq('id', id).single()) as unknown as
    { name: string; group_id: string | null; training_template_blocks: { id: string; name: string; category: string | null; notes: string | null; sort_order: number | null; training_template_items: Item[] }[] }
  const blocks = [...t.training_template_blocks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(b => ({
    id: `new-${b.id}`, category: b.category ?? 'vatten', name: b.name, notes: b.notes ?? '', block_type: 'standard' as const, items: toItems(b.training_template_items),
  }))
  return { name: t.name, groupId: t.group_id, blocks }
}
