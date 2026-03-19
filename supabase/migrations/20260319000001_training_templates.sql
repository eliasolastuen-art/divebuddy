CREATE TABLE IF NOT EXISTS training_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_template_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_template_id uuid REFERENCES training_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  notes text,
  sort_order int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS training_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid REFERENCES training_template_blocks(id) ON DELETE CASCADE,
  library_item_id uuid REFERENCES library_items(id) ON DELETE SET NULL,
  custom_name text,
  sets int,
  reps int,
  height text,
  duration_seconds int,
  notes text,
  order_index int DEFAULT 0
);
