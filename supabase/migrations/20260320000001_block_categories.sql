CREATE TABLE IF NOT EXISTS block_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  emoji text NOT NULL,
  color text NOT NULL,
  sort_order int DEFAULT 0
);

INSERT INTO block_categories (id, name, emoji, color, sort_order) VALUES
  ('vatten',      'Vatten',      '💧', '#0D7377', 0),
  ('land',        'Land',        '🏃', '#D4A017', 1),
  ('styrka',      'Styrka',      '💪', '#DC2626', 2),
  ('rorlighet',   'Rörlighet',   '🧘', '#16A34A', 3),
  ('uppvarmning', 'Uppvärmning', '🔥', '#F97316', 4),
  ('tavling',     'Tävling',     '🏆', '#6366F1', 5)
ON CONFLICT (id) DO NOTHING;
