import type { SupabaseClient } from '@supabase/supabase-js'

// "Planera pass" from the schedule (design screen 7): create a `training`
// for a scheduled pass — copied from the group's latest pass, from a
// template, or empty — and set training_id on every part of the pass.

export interface LatestTraining {
  id: string
  title: string
  date: string | null
  items: number
}

export interface TemplateOption {
  id: string
  name: string
  items: number
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// The group's most recent training that has at least one exercise
export async function latestTrainingForGroup(db: SupabaseClient, groupId: string, beforeDate: string): Promise<LatestTraining | null> {
  const rows = check(await db.from('trainings')
    .select('id, title, scheduled_date, training_blocks(training_block_items(count))')
    .eq('group_id', groupId)
    .lte('scheduled_date', beforeDate)
    .order('scheduled_date', { ascending: false })
    .limit(10)) as unknown as { id: string; title: string; scheduled_date: string | null; training_blocks: { training_block_items: { count: number }[] }[] }[]
  for (const t of rows) {
    const items = t.training_blocks.reduce((s, b) => s + (b.training_block_items[0]?.count ?? 0), 0)
    if (items > 0) return { id: t.id, title: t.title, date: t.scheduled_date, items }
  }
  return null
}

// Saved pass templates for the group, plus those without a group
export async function templatesForGroup(db: SupabaseClient, groupId: string): Promise<TemplateOption[]> {
  const rows = check(await db.from('training_templates')
    .select('id, name, group_id, training_template_blocks(training_template_items(count))')
    .or(`group_id.eq.${groupId},group_id.is.null`)
    .order('created_at', { ascending: false })) as unknown as { id: string; name: string; training_template_blocks: { training_template_items: { count: number }[] }[] }[]
  return rows.map(t => ({
    id: t.id, name: t.name,
    items: t.training_template_blocks.reduce((s, b) => s + (b.training_template_items[0]?.count ?? 0), 0),
  }))
}

interface BlockRow {
  name: string; category: string | null; notes: string | null; sort_order: number | null
  block_type: string | null; time_estimate: number | null; color_tag: string | null
  training_block_items: {
    library_item_id: string | null; custom_name: string | null; sets: number | null; reps: number | null
    height: string | null; duration_seconds: number | null; notes: string | null; sort_order: number | null
    scoring_enabled: boolean | null; dd_override: number | null; assigned_athlete_id: string | null
  }[]
}

async function copyFromTraining(db: SupabaseClient, fromId: string, toId: string) {
  const blocks = check(await db.from('training_blocks')
    .select('name, category, notes, sort_order, block_type, time_estimate, color_tag, training_block_items(library_item_id, custom_name, sets, reps, height, duration_seconds, notes, sort_order, scoring_enabled, dd_override, assigned_athlete_id)')
    .eq('training_id', fromId).order('sort_order')) as unknown as BlockRow[]
  for (const b of blocks) {
    const { training_block_items: items, ...block } = b
    const saved = check(await db.from('training_blocks').insert({ ...block, training_id: toId }).select('id').single()) as { id: string }
    if (items.length) check(await db.from('training_block_items').insert(items.map(i => ({ ...i, block_id: saved.id }))))
  }
}

async function copyFromTemplate(db: SupabaseClient, templateId: string, toId: string) {
  const blocks = check(await db.from('training_template_blocks')
    .select('name, category, notes, sort_order, training_template_items(library_item_id, custom_name, sets, reps, height, duration_seconds, notes, order_index)')
    .eq('training_template_id', templateId).order('sort_order')) as unknown as {
      name: string; category: string | null; notes: string | null; sort_order: number | null
      training_template_items: { library_item_id: string | null; custom_name: string | null; sets: number | null; reps: number | null; height: string | null; duration_seconds: number | null; notes: string | null; order_index: number | null }[]
    }[]
  for (const b of blocks) {
    const saved = check(await db.from('training_blocks').insert({
      training_id: toId, name: b.name, category: b.category, notes: b.notes, sort_order: b.sort_order, block_type: 'standard',
    }).select('id').single()) as { id: string }
    const items = [...b.training_template_items].sort((x, y) => (x.order_index ?? 0) - (y.order_index ?? 0))
    if (items.length) check(await db.from('training_block_items').insert(items.map((i, n) => ({
      block_id: saved.id, library_item_id: i.library_item_id, custom_name: i.custom_name, sets: i.sets, reps: i.reps,
      height: i.height, duration_seconds: i.duration_seconds, notes: i.notes, sort_order: n,
    }))))
  }
}

export type PlanSource = { kind: 'empty' } | { kind: 'copy'; trainingId: string } | { kind: 'template'; templateId: string }

export async function createTrainingForPass(db: SupabaseClient, input: {
  clubId: string
  profileId: string
  sessionIds: string[]
  groupId: string | null
  date: string
  start: string
  end: string
  title: string
  source: PlanSource
}): Promise<string> {
  const training = check(await db.from('trainings').insert({
    club_id: input.clubId, created_by: input.profileId, title: input.title, group_id: input.groupId,
    scheduled_date: input.date, start_time: input.start || null, end_time: input.end || null,
    status: 'draft', training_type: 'training',
  }).select('id').single()) as { id: string }

  try {
    if (input.source.kind === 'copy') await copyFromTraining(db, input.source.trainingId, training.id)
    if (input.source.kind === 'template') await copyFromTemplate(db, input.source.templateId, training.id)
    check(await db.from('schedule_sessions').update({ training_id: training.id }).in('id', input.sessionIds))
  } catch (e) {
    await db.from('trainings').delete().eq('id', training.id) // don't leave a half-copied pass behind
    throw e
  }
  return training.id
}
