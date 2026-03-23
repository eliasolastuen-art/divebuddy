ALTER TABLE training_purpose_types
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS block_category text;
