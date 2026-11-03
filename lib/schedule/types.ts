// Domain model for the term schedule. Mirrors the planned Supabase tables
// (trainings + training_groups + training_staff, club_staff, club_events,
// schedule_terms) so the in-memory demo source can be swapped for Supabase.

export type ContentStatus = 'none' | 'draft' | 'planned'

// What a pass looks like to a coach right now
export type PassStatus = 'unplanned' | 'draft' | 'planned' | 'completed' | 'cancelled' | 'past'

export type EventType = 'camp' | 'edu' | 'tryout' | 'cancelled' | 'comp' | 'event'

export interface Term {
  id: string
  name: string
  startsOn: string // YYYY-MM-DD
  endsOn: string
}

export interface ScheduleGroup {
  id: string
  name: string
  color: string // hex
}

export interface Staff {
  id: string
  name: string
  color: string // hex
  profileId: string | null
  groupIds: string[] // groups this person coaches (club_staff_groups)
}

// "Så gick det" after a pass (training_reviews)
export interface PassReview {
  rating: 'up' | 'down' | null
  note: string
  repeat: boolean // "den här kör vi igen"
}

// Focus for one group's week (group_week_focus)
export interface WeekFocus {
  groupId: string
  monday: string
  text: string
}

// A saved week (or several) of planned content that can be laid onto real passes.
// Same shape as period_templates / period_template_entries.
export interface PlanTemplate {
  id: string
  name: string
  weeks: number
  source: 'local' | 'club'
  entries: {
    weekNumber: number // 1-based
    dayOfWeek: number // 0 = Monday … 6 = Sunday
    start: string // '' when unknown → matched by order
    place: string // '' when unknown
    content: PassContent
  }[]
}

// Same categories as training_blocks.category / TrainingBuilder
export type BlockCategory = 'vatten' | 'land' | 'styrka' | 'rorlighet' | 'uppvarmning' | 'tavling'

export interface PassItem {
  id: string
  libraryItemId: string | null
  name: string
  sets: number | null
  reps: number | null
  notes: string
}

export interface PassBlock {
  id: string
  category: BlockCategory
  name: string
  items: PassItem[]
}

// What the coach plans for a pass (maps to training_blocks + training_block_items)
export interface PassContent {
  blocks: PassBlock[]
  notes: string
  source: string // "Mall: …", "Kopierat från 13 okt", "Eget"
}

export interface SchedulePass {
  id: string
  date: string // YYYY-MM-DD
  start: string // HH:MM or ''
  end: string
  place: string
  groupIds: string[]
  staffIds: string[]
  contentStatus: ContentStatus
  content?: PassContent | null
  review?: PassReview | null
  completed: boolean
  cancelledReason: string | null
  isExtra: boolean
  removed: boolean
}

export interface ClubEvent {
  id: string
  startsOn: string
  endsOn: string
  title: string
  type: EventType
  note: string
  groupIds: string[]
  staffIds: string[]
}

export interface ScheduleData {
  term: Term
  groups: ScheduleGroup[]
  staff: Staff[]
  passes: SchedulePass[]
  events: ClubEvent[]
  weekFocus: WeekFocus[]
  templates: PlanTemplate[] // saved weeks (local until etapp 3)
}
