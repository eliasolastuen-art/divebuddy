CREATE TABLE IF NOT EXISTS training_purpose_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#0D7377',
  sort_order int DEFAULT 0
);

INSERT INTO training_purpose_types (name, color, sort_order) VALUES
  ('Teknik',       '#0D7377', 0),
  ('Kondition',    '#DC2626', 1),
  ('Styrka',       '#D4A017', 2),
  ('Test',         '#6366F1', 3),
  ('Tävling',      '#EC4899', 4),
  ('Återhämtning', '#16A34A', 5)
ON CONFLICT DO NOTHING;
