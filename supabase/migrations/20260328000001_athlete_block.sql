ALTER TABLE training_block_items
  ADD COLUMN IF NOT EXISTS assigned_athlete_id uuid
  REFERENCES athletes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tbi_assigned_athlete
  ON training_block_items(assigned_athlete_id)
  WHERE assigned_athlete_id IS NOT NULL;
