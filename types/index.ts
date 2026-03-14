export type LibraryItemType = 'dive' | 'dryland' | 'strength' | 'mobility' | 'warmup' | 'custom'
export type BlockCategory = 'vatten' | 'land' | 'styrka' | 'rorlighet' | 'uppvarmning' | 'tavling'

export interface Category {
  id: string
  name: string
  sort_order: number
  created_at: string
  exercise_count?: number
}

export interface Club {
  id: string
  name: string
  created_at: string
}

export interface Coach {
  id: string
  club_id: string
  name: string
  email: string
  role: string
}

export interface Group {
  id: string
  club_id: string
  name: string
  color: string
  description?: string
}

export interface Athlete {
  id: string
  club_id: string
  group_id?: string
  name: string
  birth_year?: number
}

export interface LibraryItem {
  id: string
  club_id: string
  name: string
  type: LibraryItemType
  code?: string
  group_name?: string
  category_id?: string
  category?: Category
  dd?: number
  tags?: string[]
  description?: string
  notes?: string
  archived: boolean
  created_at: string
}

export interface PlanningFolder {
  id: string
  club_id: string
  coach_id: string
  name: string
  color?: string
  sort_order: number
  created_at: string
}

export interface Training {
  id: string
  club_id: string
  folder_id?: string
  group_id?: string
  title: string
  status: 'draft' | 'published' | 'completed'
  training_type: string
  scheduled_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface TrainingBlock {
  id: string
  training_id: string
  category: BlockCategory
  name: string
  sort_order: number
  notes?: string
  created_at: string
  items?: TrainingBlockItem[]
}

export interface TrainingBlockItem {
  id: string
  block_id: string
  library_item_id?: string
  custom_name?: string
  reps?: number
  sets?: number
  duration_seconds?: number
  notes?: string
  sort_order: number
  library_item?: LibraryItem
}