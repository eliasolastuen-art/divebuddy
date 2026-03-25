-- Allow admins/coaches to see athletes with NULL group_id (Option B)
DROP POLICY IF EXISTS "Admin and coach can see ungrouped athletes" ON athletes;
CREATE POLICY "Admin and coach can see ungrouped athletes" ON athletes
  FOR SELECT USING (
    club_id = get_my_club_id()
    AND (has_role('admin') OR has_role('coach'))
  );
