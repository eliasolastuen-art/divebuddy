-- ==========================================
-- CLEANUP: Ta bort testdata
-- ==========================================
DELETE FROM invites;
DELETE FROM user_roles WHERE profile_id = '98ee6384-5d33-4ab6-9366-ec77bac082af';
DELETE FROM profiles WHERE id = '98ee6384-5d33-4ab6-9366-ec77bac082af';
DELETE FROM clubs WHERE id != 'e96934b6-446e-4d39-a820-7af3cd9521f0';

-- ==========================================
-- Ge admin-användaren alla 3 roller
-- ==========================================
INSERT INTO user_roles (profile_id, role)
VALUES
  ('5033ed5b-57e7-41c8-a8d3-9fda7816194a', 'coach'),
  ('5033ed5b-57e7-41c8-a8d3-9fda7816194a', 'athlete')
ON CONFLICT (profile_id, role) DO NOTHING;

-- ==========================================
-- Ta bort deprecated role-kolumn från profiles
-- ==========================================
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- ==========================================
-- RLS helper functions
-- ==========================================
CREATE OR REPLACE FUNCTION get_my_club_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT club_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION has_role(r text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE profile_id = auth.uid() AND role = r::user_role
  );
$$;

-- ==========================================
-- RLS: clubs
-- ==========================================
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their club" ON clubs;
CREATE POLICY "Members can view their club" ON clubs
  FOR SELECT USING (id = get_my_club_id());

-- ==========================================
-- RLS: profiles (uppdatera befintliga policies)
-- ==========================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view club members" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admin can view club members" ON profiles
  FOR SELECT USING (
    club_id = get_my_club_id() AND has_role('admin')
  );

-- ==========================================
-- RLS: user_roles (uppdatera befintliga policies)
-- ==========================================
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can view club roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can delete roles" ON user_roles;

CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Admin can view club roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = user_roles.profile_id
        AND p.club_id = get_my_club_id()
        AND has_role('admin')
    )
  );

CREATE POLICY "Admin can insert roles" ON user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = profile_id
        AND p.club_id = get_my_club_id()
    ) AND has_role('admin')
  );

CREATE POLICY "Admin can delete roles" ON user_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = profile_id
        AND p.club_id = get_my_club_id()
    ) AND has_role('admin')
  );

-- ==========================================
-- RLS: invites (ersätt gamla öppna policies)
-- ==========================================
DROP POLICY IF EXISTS "Anyone can read invites by email" ON invites;
DROP POLICY IF EXISTS "Authenticated users can insert invites" ON invites;
DROP POLICY IF EXISTS "Authenticated users can update invites" ON invites;
DROP POLICY IF EXISTS "Club members can view invites" ON invites;
DROP POLICY IF EXISTS "Admin can insert invites" ON invites;
DROP POLICY IF EXISTS "Authenticated users can accept invites" ON invites;

CREATE POLICY "Club members can view invites" ON invites
  FOR SELECT USING (club_id = get_my_club_id());

CREATE POLICY "Admin can insert invites" ON invites
  FOR INSERT WITH CHECK (
    club_id = get_my_club_id() AND has_role('admin')
  );

CREATE POLICY "Authenticated users can accept invites" ON invites
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ==========================================
-- RLS: groups
-- ==========================================
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club members can view groups" ON groups;
DROP POLICY IF EXISTS "Admin and coach can manage groups" ON groups;

CREATE POLICY "Club members can view groups" ON groups
  FOR SELECT USING (club_id = get_my_club_id());

CREATE POLICY "Admin and coach can manage groups" ON groups
  FOR ALL USING (
    club_id = get_my_club_id()
    AND (has_role('admin') OR has_role('coach'))
  );

-- ==========================================
-- RLS: athletes
-- ==========================================
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club members can view athletes" ON athletes;
DROP POLICY IF EXISTS "Admin and coach can manage athletes" ON athletes;

CREATE POLICY "Club members can view athletes" ON athletes
  FOR SELECT USING (
    group_id IN (
      SELECT id FROM groups WHERE club_id = get_my_club_id()
    )
  );

CREATE POLICY "Admin and coach can manage athletes" ON athletes
  FOR ALL USING (
    group_id IN (
      SELECT id FROM groups WHERE club_id = get_my_club_id()
    )
    AND (has_role('admin') OR has_role('coach'))
  );

-- ==========================================
-- RLS: live_sessions
-- ==========================================
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club members can view sessions" ON live_sessions;
DROP POLICY IF EXISTS "Coach and admin can manage sessions" ON live_sessions;

CREATE POLICY "Club members can view sessions" ON live_sessions
  FOR SELECT USING (club_id = get_my_club_id());

CREATE POLICY "Coach and admin can manage sessions" ON live_sessions
  FOR ALL USING (
    club_id = get_my_club_id()
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: live_session_athletes
-- ==========================================
ALTER TABLE live_session_athletes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club members can view session athletes" ON live_session_athletes;
DROP POLICY IF EXISTS "Coach and admin can manage session athletes" ON live_session_athletes;

CREATE POLICY "Club members can view session athletes" ON live_session_athletes
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM live_sessions WHERE club_id = get_my_club_id()
    )
  );

CREATE POLICY "Coach and admin can manage session athletes" ON live_session_athletes
  FOR ALL USING (
    session_id IN (
      SELECT id FROM live_sessions WHERE club_id = get_my_club_id()
    )
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: live_dive_log
-- ==========================================
ALTER TABLE live_dive_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club members can view dive log" ON live_dive_log;
DROP POLICY IF EXISTS "Coach and admin can manage dive log" ON live_dive_log;

CREATE POLICY "Club members can view dive log" ON live_dive_log
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM live_sessions WHERE club_id = get_my_club_id()
    )
  );

CREATE POLICY "Coach and admin can manage dive log" ON live_dive_log
  FOR ALL USING (
    session_id IN (
      SELECT id FROM live_sessions WHERE club_id = get_my_club_id()
    )
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: training_templates
-- ==========================================
ALTER TABLE training_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club members can view templates" ON training_templates;
DROP POLICY IF EXISTS "Coach and admin can manage templates" ON training_templates;

CREATE POLICY "Club members can view templates" ON training_templates
  FOR SELECT USING (
    group_id IN (
      SELECT id FROM groups WHERE club_id = get_my_club_id()
    )
  );

CREATE POLICY "Coach and admin can manage templates" ON training_templates
  FOR ALL USING (
    group_id IN (
      SELECT id FROM groups WHERE club_id = get_my_club_id()
    )
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: training_template_blocks
-- ==========================================
ALTER TABLE training_template_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club members can view template blocks" ON training_template_blocks;
DROP POLICY IF EXISTS "Coach and admin can manage template blocks" ON training_template_blocks;

CREATE POLICY "Club members can view template blocks" ON training_template_blocks
  FOR SELECT USING (
    training_template_id IN (
      SELECT id FROM training_templates
      WHERE group_id IN (
        SELECT id FROM groups WHERE club_id = get_my_club_id()
      )
    )
  );

CREATE POLICY "Coach and admin can manage template blocks" ON training_template_blocks
  FOR ALL USING (
    training_template_id IN (
      SELECT id FROM training_templates
      WHERE group_id IN (
        SELECT id FROM groups WHERE club_id = get_my_club_id()
      )
    )
    AND (has_role('coach') OR has_role('admin'))
  );

-- ==========================================
-- RLS: training_template_items
-- ==========================================
ALTER TABLE training_template_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club members can view template items" ON training_template_items;
DROP POLICY IF EXISTS "Coach and admin can manage template items" ON training_template_items;

CREATE POLICY "Club members can view template items" ON training_template_items
  FOR SELECT USING (
    block_id IN (
      SELECT id FROM training_template_blocks
      WHERE training_template_id IN (
        SELECT id FROM training_templates
        WHERE group_id IN (
          SELECT id FROM groups WHERE club_id = get_my_club_id()
        )
      )
    )
  );

CREATE POLICY "Coach and admin can manage template items" ON training_template_items
  FOR ALL USING (
    block_id IN (
      SELECT id FROM training_template_blocks
      WHERE training_template_id IN (
        SELECT id FROM training_templates
        WHERE group_id IN (
          SELECT id FROM groups WHERE club_id = get_my_club_id()
        )
      )
    )
    AND (has_role('coach') OR has_role('admin'))
  );
