-- ============================================================
-- DiveBuddy cleanup: coaches table removal + data consistency
-- ============================================================

-- Step 1: Drop all FK constraints that point TO coaches
ALTER TABLE planning_folders  DROP CONSTRAINT IF EXISTS planning_folders_coach_id_fkey;
ALTER TABLE library_items     DROP CONSTRAINT IF EXISTS library_items_created_by_fkey;
ALTER TABLE trainings         DROP CONSTRAINT IF EXISTS trainings_created_by_fkey;
ALTER TABLE planner_entries   DROP CONSTRAINT IF EXISTS planner_entries_coach_id_fkey;

-- Step 2: Repoint those columns to profiles(id) instead
ALTER TABLE planning_folders  ADD CONSTRAINT planning_folders_coach_id_fkey    FOREIGN KEY (coach_id)    REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE library_items     ADD CONSTRAINT library_items_created_by_fkey     FOREIGN KEY (created_by)  REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE trainings         ADD CONSTRAINT trainings_created_by_fkey         FOREIGN KEY (created_by)  REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE planner_entries   ADD CONSTRAINT planner_entries_coach_id_fkey     FOREIGN KEY (coach_id)    REFERENCES profiles(id) ON DELETE SET NULL;

-- Step 3: Migrate live_sessions.coach_id from text → uuid FK → profiles(id)
-- (existing mock values 'coach-001' cannot be cast to uuid; they become NULL)
ALTER TABLE live_sessions ADD COLUMN coach_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE live_sessions DROP COLUMN coach_id;
ALTER TABLE live_sessions RENAME COLUMN coach_profile_id TO coach_id;

-- Step 4: Drop coaches RLS policies (all variants used across migrations)
DROP POLICY IF EXISTS "Coaches can view own row"           ON coaches;
DROP POLICY IF EXISTS "Coaches can manage own row"         ON coaches;
DROP POLICY IF EXISTS "Admin can view club coaches"        ON coaches;
DROP POLICY IF EXISTS "Coach and admin can view coaches"   ON coaches;
DROP POLICY IF EXISTS "Coach and admin can insert coaches" ON coaches;
DROP POLICY IF EXISTS "Coach and admin can update coaches" ON coaches;
DROP POLICY IF EXISTS "Admin can delete coaches"           ON coaches;

-- Step 5: Drop the coaches table (empty, legacy orphan)
DROP TABLE IF EXISTS coaches;

-- Step 6: Drop training_scores (confirmed 0 rows, no frontend usage)
DROP TABLE IF EXISTS training_scores;

-- Step 7: Fix 17 library_items rows with NULL club_id
-- Set to the real Växjö Simhopp club UUID
UPDATE library_items
SET club_id = (SELECT id FROM clubs LIMIT 1)
WHERE club_id IS NULL;
