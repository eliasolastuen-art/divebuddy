import type { SupabaseClient } from '@supabase/supabase-js'

// Exercise library: area (Vatten/Land) → group (categories) → exercise
// (library_items). Shared by the library page and the exercise picker.

export type LibraryArea = 'vatten' | 'land'

export interface LibraryGroup {
  id: string
  name: string
  area: LibraryArea
  description: string
}

export interface Exercise {
  id: string
  name: string
  code: string
  groupId: string | null
  type: string
  defaultHeight: string | null
  dd: number | null
  imagePath: string | null
}

export interface TemplateSummary {
  id: string
  kind: 'pass' | 'block'
  name: string
  groupId: string | null
  exerciseCount: number
}

// Short descriptions under each group tile (from the approved design)
const DESCRIPTIONS: Record<string, string> = {
  '100': 'Framåt', '200': 'Bakåt', '300': 'Isander', '400': 'Inåt',
  Skruvar: '5000-hopp', Armsving: 'Ansats och sving', Fall: 'Fall och nedslag',
  Styrka: 'Kropp och bål', 'Längor': 'Volter på matta', Stretch: 'Rörlighet',
  Lekar: 'Uppvärmning och avslut', Redskap: 'Trampett, torrbräda, bälte',
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export async function fetchGroups(db: SupabaseClient): Promise<LibraryGroup[]> {
  const rows = check(await db.from('categories').select('id, name, block_category')
    .in('block_category', ['vatten', 'land']).order('sort_order'))
  return (rows as { id: string; name: string; block_category: LibraryArea }[]).map(r => ({
    id: r.id, name: r.name, area: r.block_category, description: DESCRIPTIONS[r.name] ?? '',
  }))
}

interface ExerciseRow {
  id: string
  name: string
  code: string | null
  category_id: string | null
  type: string
  default_height: string | null
  dd: number | null
  image_path: string | null
}

const toExercise = (r: ExerciseRow): Exercise => ({
  id: r.id, name: r.name, code: r.code ?? '', groupId: r.category_id, type: r.type,
  defaultHeight: r.default_height, dd: r.dd, imagePath: r.image_path,
})

const EXERCISE_COLUMNS = 'id, name, code, category_id, type, default_height, dd, image_path'

// The club's exercises (RLS limits to the club), archived ones excluded
export async function fetchExercises(db: SupabaseClient): Promise<Exercise[]> {
  const rows = check(await db.from('library_items').select(EXERCISE_COLUMNS)
    .or('archived.is.null,archived.eq.false').order('code').order('name'))
  return (rows as ExerciseRow[]).map(toExercise)
}

// Label as shown in lists: "105B Framåt 2½ volt" when the name lacks the code
export function exerciseLabel(e: Pick<Exercise, 'name' | 'code'>) {
  if (!e.code || e.name.toLowerCase().startsWith(e.code.toLowerCase())) return e.name
  return `${e.code} ${e.name}`
}

// Search all exercises regardless of group, on name and code (e.g. "105B")
export function searchExercises(all: Exercise[], query: string): Exercise[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return all.filter(e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q) ||
    exerciseLabel(e).toLowerCase().includes(q))
}

export const isDive = (e: Pick<Exercise, 'type' | 'groupId'>, groups: LibraryGroup[]) =>
  e.type === 'dive' || groups.find(g => g.id === e.groupId)?.area === 'vatten'

// Latest reps per exercise in trainings created by this coach
export async function lastUsedReps(db: SupabaseClient, profileId: string, exerciseIds: string[]): Promise<Record<string, number>> {
  if (!exerciseIds.length) return {}
  const rows = check(await db.from('training_block_items')
    .select('library_item_id, reps, created_at, training_blocks!inner(trainings!inner(created_by))')
    .in('library_item_id', exerciseIds)
    .eq('training_blocks.trainings.created_by', profileId)
    .not('reps', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500))
  const out: Record<string, number> = {}
  for (const r of rows as unknown as { library_item_id: string; reps: number }[]) {
    if (!(r.library_item_id in out)) out[r.library_item_id] = r.reps
  }
  return out
}

export interface PrefilledItem {
  exercise: Exercise
  reps: number
  height: string | null
  durationSeconds: null
}

// Values a new row starts with: height from the exercise, reps from my last use (else 4 dives / 10 other)
export function prefill(exercises: Exercise[], groups: LibraryGroup[], last: Record<string, number>): PrefilledItem[] {
  return exercises.map(e => ({
    exercise: e,
    reps: last[e.id] ?? (isDive(e, groups) ? 4 : 10),
    height: e.defaultHeight,
    durationSeconds: null,
  }))
}

export interface ExerciseInput {
  name: string
  groupId: string
  defaultHeight?: string | null
  imagePath?: string | null
}

export async function createExercise(db: SupabaseClient, clubId: string, profileId: string, input: ExerciseInput, area: LibraryArea): Promise<Exercise> {
  const row = check(await db.from('library_items').insert({
    club_id: clubId, created_by: profileId, name: input.name.trim(), category_id: input.groupId,
    type: area === 'vatten' ? 'custom' : 'dryland', default_height: input.defaultHeight ?? null,
    image_path: input.imagePath ?? null,
  }).select(EXERCISE_COLUMNS).single())
  return toExercise(row as unknown as ExerciseRow)
}

export async function updateExercise(db: SupabaseClient, id: string, input: Partial<ExerciseInput>) {
  const row: Record<string, unknown> = {}
  if (input.name !== undefined) row.name = input.name.trim()
  if (input.groupId !== undefined) row.category_id = input.groupId
  if (input.defaultHeight !== undefined) row.default_height = input.defaultHeight
  if (input.imagePath !== undefined) row.image_path = input.imagePath
  check(await db.from('library_items').update(row).eq('id', id))
}

// Saved passes and blocks for the "Mallar" tab and "Använd en mall"
export async function fetchTemplates(db: SupabaseClient): Promise<TemplateSummary[]> {
  const [passes, blocks] = await Promise.all([
    db.from('training_templates').select('id, name, group_id, training_template_blocks(training_template_items(count))').order('created_at', { ascending: false }),
    db.from('block_templates').select('id, name, group_id, block_template_items(count)').order('created_at', { ascending: false }),
  ])
  const p = check(passes) as unknown as { id: string; name: string; group_id: string | null; training_template_blocks: { training_template_items: { count: number }[] }[] }[]
  const b = check(blocks) as unknown as { id: string; name: string; group_id: string | null; block_template_items: { count: number }[] }[]
  return [
    ...p.map(t => ({
      id: t.id, kind: 'pass' as const, name: t.name, groupId: t.group_id,
      exerciseCount: t.training_template_blocks.reduce((s, bl) => s + (bl.training_template_items[0]?.count ?? 0), 0),
    })),
    ...b.map(t => ({
      id: t.id, kind: 'block' as const, name: t.name, groupId: t.group_id,
      exerciseCount: t.block_template_items[0]?.count ?? 0,
    })),
  ]
}
