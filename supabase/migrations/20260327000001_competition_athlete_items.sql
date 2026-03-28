-- Dive list per athlete per block
CREATE TABLE competition_athlete_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES training_blocks(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  library_item_id uuid REFERENCES library_items(id) ON DELETE SET NULL,
  custom_name text,
  dd numeric(4,1),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ON competition_athlete_items(block_id);
CREATE INDEX ON competition_athlete_items(block_id, athlete_id);

-- Scores per dive per session
CREATE TABLE competition_dive_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  competition_item_id uuid NOT NULL REFERENCES competition_athlete_items(id) ON DELETE CASCADE,
  score numeric(5,2),
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, competition_item_id)
);

CREATE INDEX ON competition_dive_scores(session_id);

-- RLS
ALTER TABLE competition_athlete_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_dive_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view competition_athlete_items" ON competition_athlete_items
  FOR SELECT USING (
    block_id IN (
      SELECT tb.id FROM training_blocks tb
      JOIN trainings t ON t.id = tb.training_id
      WHERE t.club_id = get_my_club_id()
    )
  );

CREATE POLICY "Coach and admin can manage competition_athlete_items" ON competition_athlete_items
  FOR ALL USING (
    block_id IN (
      SELECT tb.id FROM training_blocks tb
      JOIN trainings t ON t.id = tb.training_id
      WHERE t.club_id = get_my_club_id()
    )
    AND (has_role('coach') OR has_role('admin'))
  );

CREATE POLICY "Club members can view competition_dive_scores" ON competition_dive_scores
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM live_sessions WHERE club_id = get_my_club_id()
    )
  );

CREATE POLICY "Coach and admin can manage competition_dive_scores" ON competition_dive_scores
  FOR ALL USING (
    session_id IN (
      SELECT id FROM live_sessions WHERE club_id = get_my_club_id()
    )
    AND (has_role('coach') OR has_role('admin'))
  );
