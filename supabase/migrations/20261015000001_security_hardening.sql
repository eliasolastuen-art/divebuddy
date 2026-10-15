-- ==========================================
-- Säkerhetshärdning (etapp 0)
-- Återställning: supabase/rollback/20261015000001_security_hardening.sql
-- ==========================================

-- Hjälpare: är anroparen servern (service role) eller databasen själv?
CREATE OR REPLACE FUNCTION is_trusted_caller()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(auth.role(), '') = 'service_role'
      OR current_user IN ('postgres', 'supabase_admin');
$$;

-- ==========================================
-- 1. profiles: användare får inte byta klubb själva
--    (klubbtillhörighet sätts bara av servern via inbjudan)
-- ==========================================
CREATE OR REPLACE FUNCTION protect_profile_club()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.club_id IS DISTINCT FROM OLD.club_id AND NOT is_trusted_caller() THEN
    RAISE EXCEPTION 'club_id kan bara ändras av servern';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_club ON profiles;
CREATE TRIGGER protect_profile_club
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_club();

-- ==========================================
-- 2. athletes: en atlet får inte flytta sin egen rad
--    till annan klubb/grupp eller byta kopplat konto
-- ==========================================
CREATE OR REPLACE FUNCTION protect_athlete_self_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF is_trusted_caller() OR has_role('admin') OR has_role('coach') THEN
    RETURN NEW;
  END IF;
  IF NEW.club_id IS DISTINCT FROM OLD.club_id
     OR NEW.group_id IS DISTINCT FROM OLD.group_id
     OR NEW.profile_id IS DISTINCT FROM OLD.profile_id THEN
    RAISE EXCEPTION 'Atleter kan inte ändra klubb, grupp eller konto';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_athlete_self_update ON athletes;
CREATE TRIGGER protect_athlete_self_update
  BEFORE UPDATE ON athletes
  FOR EACH ROW EXECUTE FUNCTION protect_athlete_self_update();

-- ==========================================
-- 3. invites: bara admin i klubben får ändra inbjudningar
--    (att acceptera sker nu på servern)
-- ==========================================
DROP POLICY IF EXISTS "Authenticated users can accept invites" ON invites;
DROP POLICY IF EXISTS "Admin can update invites" ON invites;
CREATE POLICY "Admin can update invites" ON invites
  FOR UPDATE
  USING (club_id = get_my_club_id() AND has_role('admin'))
  WITH CHECK (club_id = get_my_club_id() AND has_role('admin'));

-- ==========================================
-- 4. Funktioner: fast search_path och inget publikt anrop av interna funktioner
-- ==========================================
ALTER FUNCTION get_my_club_id() SET search_path = public;
ALTER FUNCTION has_role(text) SET search_path = public;
ALTER FUNCTION handle_new_user() SET search_path = public;
ALTER FUNCTION update_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION rls_auto_enable() FROM PUBLIC, anon, authenticated;
