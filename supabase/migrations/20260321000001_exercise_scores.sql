CREATE TABLE IF NOT EXISTS exercise_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  training_block_item_id uuid NOT NULL REFERENCES training_block_items(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  score numeric(5,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, training_block_item_id, athlete_id)
);
