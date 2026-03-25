-- ==========================================
-- Ta bort gamla coaches-baserade dubbelapolicies
-- ==========================================
DROP POLICY IF EXISTS "groups_club_only" ON groups;
DROP POLICY IF EXISTS "athletes_club_only" ON athletes;

-- ==========================================
-- RLS: coaches (legacy-tabell, fortfarande i bruk via FK)
-- ==========================================
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coaches_club_only" ON coaches;

CREATE POLICY "Coaches can view own row" ON coaches
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Coaches can manage own row" ON coaches
  FOR ALL USING (id = auth.uid());

CREATE POLICY "Admin can view club coaches" ON coaches
  FOR SELECT USING (
    club_id = get_my_club_id() AND has_role('admin')
  );

-- ==========================================
-- RLS: trainings
-- ==========================================
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trainings_club_only" ON trainings;

CREATE POLICY "Club members can view trainings" ON trainings
  FOR SELECT USING (club_id = get_my_club_id());

CREATE POLICY "Coach and admin can manage trainings" ON trainings
  FOR ALL USING (
    club_id = get_my_club_id()
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: training_blocks
-- ==========================================
ALTER TABLE training_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_blocks_club_only" ON training_blocks;

CREATE POLICY "Club members can view training blocks" ON training_blocks
  FOR SELECT USING (
    training_id IN (
      SELECT id FROM trainings WHERE club_id = get_my_club_id()
    )
  );

CREATE POLICY "Coach and admin can manage training blocks" ON training_blocks
  FOR ALL USING (
    training_id IN (
      SELECT id FROM trainings WHERE club_id = get_my_club_id()
    )
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: training_block_items
-- ==========================================
ALTER TABLE training_block_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "block_items_club_only" ON training_block_items;

CREATE POLICY "Club members can view training block items" ON training_block_items
  FOR SELECT USING (
    block_id IN (
      SELECT tb.id FROM training_blocks tb
      JOIN trainings t ON t.id = tb.training_id
      WHERE t.club_id = get_my_club_id()
    )
  );

CREATE POLICY "Coach and admin can manage training block items" ON training_block_items
  FOR ALL USING (
    block_id IN (
      SELECT tb.id FROM training_blocks tb
      JOIN trainings t ON t.id = tb.training_id
      WHERE t.club_id = get_my_club_id()
    )
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: training_scores
-- ==========================================
ALTER TABLE training_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scores_club_only" ON training_scores;

CREATE POLICY "Club members can view training scores" ON training_scores
  FOR SELECT USING (
    training_id IN (
      SELECT id FROM trainings WHERE club_id = get_my_club_id()
    )
  );

CREATE POLICY "Coach and admin can manage training scores" ON training_scores
  FOR ALL USING (
    training_id IN (
      SELECT id FROM trainings WHERE club_id = get_my_club_id()
    )
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: exercise_scores
-- ==========================================
ALTER TABLE exercise_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view exercise scores" ON exercise_scores
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM live_sessions WHERE club_id = get_my_club_id()
    )
  );

CREATE POLICY "Coach and admin can manage exercise scores" ON exercise_scores
  FOR ALL USING (
    session_id IN (
      SELECT id FROM live_sessions WHERE club_id = get_my_club_id()
    )
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: session_logs
-- ==========================================
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view session logs" ON session_logs
  FOR SELECT USING (
    training_id IN (
      SELECT id FROM trainings WHERE club_id = get_my_club_id()
    )
  );

CREATE POLICY "Coach and admin can manage session logs" ON session_logs
  FOR ALL USING (
    training_id IN (
      SELECT id FROM trainings WHERE club_id = get_my_club_id()
    )
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: library_items
-- ==========================================
ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "library_items_club_only" ON library_items;

CREATE POLICY "Club members can view library items" ON library_items
  FOR SELECT USING (club_id = get_my_club_id());

CREATE POLICY "Coach and admin can manage library items" ON library_items
  FOR ALL USING (
    club_id = get_my_club_id()
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: planning_folders
-- ==========================================
ALTER TABLE planning_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "folders_club_only" ON planning_folders;

CREATE POLICY "Club members can view planning folders" ON planning_folders
  FOR SELECT USING (club_id = get_my_club_id());

CREATE POLICY "Coach and admin can manage planning folders" ON planning_folders
  FOR ALL USING (
    club_id = get_my_club_id()
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: planner_entries
-- ==========================================
ALTER TABLE planner_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planner_entries_club_only" ON planner_entries;

CREATE POLICY "Club members can view planner entries" ON planner_entries
  FOR SELECT USING (club_id = get_my_club_id());

CREATE POLICY "Coach and admin can manage planner entries" ON planner_entries
  FOR ALL USING (
    club_id = get_my_club_id()
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: purposes
-- ==========================================
ALTER TABLE purposes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purposes_club_only" ON purposes;

CREATE POLICY "Club members can view purposes" ON purposes
  FOR SELECT USING (club_id = get_my_club_id());

CREATE POLICY "Coach and admin can manage purposes" ON purposes
  FOR ALL USING (
    club_id = get_my_club_id()
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: training_purpose_types
-- ==========================================
ALTER TABLE training_purpose_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view purpose types" ON training_purpose_types
  FOR SELECT USING (
    group_id IN (
      SELECT id FROM groups WHERE club_id = get_my_club_id()
    )
  );

CREATE POLICY "Coach and admin can manage purpose types" ON training_purpose_types
  FOR ALL USING (
    group_id IN (
      SELECT id FROM groups WHERE club_id = get_my_club_id()
    )
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: block_templates
-- ==========================================
ALTER TABLE block_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view block templates" ON block_templates
  FOR SELECT USING (
    group_id IN (
      SELECT id FROM groups WHERE club_id = get_my_club_id()
    )
  );

CREATE POLICY "Coach and admin can manage block templates" ON block_templates
  FOR ALL USING (
    group_id IN (
      SELECT id FROM groups WHERE club_id = get_my_club_id()
    )
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: block_template_items
-- ==========================================
ALTER TABLE block_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view block template items" ON block_template_items
  FOR SELECT USING (
    template_id IN (
      SELECT bt.id FROM block_templates bt
      JOIN groups g ON g.id = bt.group_id
      WHERE g.club_id = get_my_club_id()
    )
  );

CREATE POLICY "Coach and admin can manage block template items" ON block_template_items
  FOR ALL USING (
    template_id IN (
      SELECT bt.id FROM block_templates bt
      JOIN groups g ON g.id = bt.group_id
      WHERE g.club_id = get_my_club_id()
    )
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: categories (delade uppslagstabeller – alla inloggade kan läsa)
-- ==========================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories" ON categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ==========================================
-- RLS: block_categories (delade uppslagstabeller)
-- ==========================================
ALTER TABLE block_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view block categories" ON block_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);
