-- Period templates (week-cycle / periodisering)
CREATE TABLE period_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  weeks int NOT NULL DEFAULT 4,
  club_id uuid REFERENCES clubs(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE period_template_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES period_templates(id) ON DELETE CASCADE,
  week_number int NOT NULL,
  day_of_week int NOT NULL, -- 1=Monday ... 7=Sunday
  title text NOT NULL,
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  block_data jsonb NOT NULL DEFAULT '[]',
  sort_order int DEFAULT 0
);

-- RLS
ALTER TABLE period_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_template_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view period_templates" ON period_templates
  FOR SELECT USING (club_id = get_my_club_id());

CREATE POLICY "Coach and admin can insert period_templates" ON period_templates
  FOR INSERT WITH CHECK (club_id = get_my_club_id() AND (has_role('coach') OR has_role('admin')));

CREATE POLICY "Coach and admin can update period_templates" ON period_templates
  FOR UPDATE USING (club_id = get_my_club_id() AND (has_role('coach') OR has_role('admin')));

CREATE POLICY "Coach and admin can delete period_templates" ON period_templates
  FOR DELETE USING (club_id = get_my_club_id() AND (has_role('coach') OR has_role('admin')));

CREATE POLICY "Club members can view period_template_entries" ON period_template_entries
  FOR SELECT USING (
    template_id IN (SELECT id FROM period_templates WHERE club_id = get_my_club_id())
  );

CREATE POLICY "Coach and admin can insert period_template_entries" ON period_template_entries
  FOR INSERT WITH CHECK (
    template_id IN (SELECT id FROM period_templates WHERE club_id = get_my_club_id())
    AND (has_role('coach') OR has_role('admin'))
  );

CREATE POLICY "Coach and admin can update period_template_entries" ON period_template_entries
  FOR UPDATE USING (
    template_id IN (SELECT id FROM period_templates WHERE club_id = get_my_club_id())
    AND (has_role('coach') OR has_role('admin'))
  );

CREATE POLICY "Coach and admin can delete period_template_entries" ON period_template_entries
  FOR DELETE USING (
    template_id IN (SELECT id FROM period_templates WHERE club_id = get_my_club_id())
    AND (has_role('coach') OR has_role('admin'))
  );
