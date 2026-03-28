ALTER TABLE training_blocks DROP CONSTRAINT training_blocks_block_type_check;
ALTER TABLE training_blocks ADD CONSTRAINT training_blocks_block_type_check
  CHECK (block_type = ANY (ARRAY['standard', 'test', 'athlete', 'competition_athlete', 'competition_exercise']));
