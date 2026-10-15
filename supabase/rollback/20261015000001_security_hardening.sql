-- Återställer supabase/migrations/20261015000001_security_hardening.sql
-- till läget före migrationen. Kör bara om något slutat fungera.

DROP TRIGGER IF EXISTS protect_profile_club ON profiles;
DROP FUNCTION IF EXISTS protect_profile_club();

DROP TRIGGER IF EXISTS protect_athlete_self_update ON athletes;
DROP FUNCTION IF EXISTS protect_athlete_self_update();

DROP FUNCTION IF EXISTS is_trusted_caller();

DROP POLICY IF EXISTS "Admin can update invites" ON invites;
CREATE POLICY "Authenticated users can accept invites" ON invites
  FOR UPDATE USING (auth.uid() IS NOT NULL);

ALTER FUNCTION get_my_club_id() RESET search_path;
ALTER FUNCTION has_role(text) RESET search_path;
ALTER FUNCTION handle_new_user() RESET search_path;
ALTER FUNCTION update_updated_at() RESET search_path;

GRANT EXECUTE ON FUNCTION handle_new_user() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rls_auto_enable() TO PUBLIC, anon, authenticated;
