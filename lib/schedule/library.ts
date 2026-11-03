'use client'

import { createClient } from '@/lib/supabase/client'
import { newId } from './content'
import type { BlockCategory, PassContent, PlanTemplate } from './types'

// Read-only access to the club's existing training templates and exercise
// library, used as sources when planning a pass. Nothing is written here.

export interface TemplateOption {
  id: string
  name: string
  groupId: string | null
  blockCount: number
  content: PassContent
}

export interface LibraryOption {
  id: string
  name: string
  code: string
  category: string | null
}

const CATEGORIES: BlockCategory[] = ['vatten', 'land', 'styrka', 'rorlighet', 'uppvarmning', 'tavling']
const asCategory = (c: string | null): BlockCategory => (CATEGORIES.includes(c as BlockCategory) ? (c as BlockCategory) : 'vatten')

interface TemplateRow {
  id: string
  name: string
  group_id: string | null
  training_template_blocks: {
    name: string
    category: string | null
    sort_order: number | null
    training_template_items: {
      library_item_id: string | null
      custom_name: string | null
      sets: number | null
      reps: number | null
      notes: string | null
      order_index: number | null
      library_items: { name: string } | null
    }[]
  }[]
}

export async function fetchTemplates(): Promise<TemplateOption[]> {
  const { data, error } = await createClient()
    .from('training_templates')
    .select('id, name, group_id, training_template_blocks(name, category, sort_order, training_template_items(library_item_id, custom_name, sets, reps, notes, order_index, library_items(name)))')
    .order('created_at', { ascending: false })
  if (error || !data) return []

  return (data as unknown as TemplateRow[]).map(t => {
    const blocks = [...(t.training_template_blocks ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    return {
      id: t.id,
      name: t.name,
      groupId: t.group_id,
      blockCount: blocks.length,
      content: {
        notes: '',
        source: `Mall: ${t.name}`,
        blocks: blocks.map(b => ({
          id: newId(),
          category: asCategory(b.category),
          name: b.name,
          items: [...(b.training_template_items ?? [])]
            .sort((a, c) => (a.order_index ?? 0) - (c.order_index ?? 0))
            .map(i => ({
              id: newId(),
              libraryItemId: i.library_item_id,
              name: i.library_items?.name ?? i.custom_name ?? 'Övning',
              sets: i.sets,
              reps: i.reps,
              notes: i.notes ?? '',
            })),
        })),
      },
    }
  })
}

interface LibraryRow {
  id: string
  name: string
  code: string | null
  group_name: string | null
  categories: { name: string } | null
}

export async function fetchLibrary(): Promise<LibraryOption[]> {
  const { data, error } = await createClient()
    .from('library_items')
    .select('id, name, code, group_name, categories(name)')
    .eq('archived', false)
    .order('name')
  if (error || !data) return []
  return (data as unknown as LibraryRow[]).map(r => ({
    id: r.id,
    name: r.name,
    code: r.code && r.group_name ? `${r.code}${r.group_name}` : r.code ?? '',
    category: r.categories?.name ?? null,
  }))
}

interface PeriodTemplateRow {
  id: string
  name: string
  weeks: number
  period_template_entries: {
    week_number: number
    day_of_week: number // 1 = Monday … 7 = Sunday
    title: string | null
    sort_order: number | null
    block_data: { category: string | null; name: string; items?: { custom_name: string; library_item_id?: string | null }[] }[] | null
  }[]
}

// The club's period templates (PeriodBuilder), converted so they can be laid onto real passes
export async function fetchPeriodTemplates(): Promise<PlanTemplate[]> {
  const { data, error } = await createClient()
    .from('period_templates')
    .select('id, name, weeks, period_template_entries(week_number, day_of_week, title, sort_order, block_data)')
    .order('created_at', { ascending: false })
  if (error || !data) return []

  return (data as unknown as PeriodTemplateRow[]).map(t => ({
    id: t.id,
    name: t.name,
    weeks: t.weeks,
    source: 'club' as const,
    entries: [...(t.period_template_entries ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(e => ({
        weekNumber: e.week_number,
        dayOfWeek: Math.min(6, Math.max(0, e.day_of_week - 1)),
        start: '',
        place: '',
        content: {
          notes: e.title ?? '',
          source: t.name,
          blocks: (e.block_data ?? []).map(b => ({
            id: newId(),
            category: asCategory(b.category),
            name: b.name,
            items: (b.items ?? []).map(i => ({
              id: newId(), libraryItemId: i.library_item_id ?? null, name: i.custom_name, sets: null, reps: null, notes: '',
            })),
          })),
        },
      })),
  }))
}
