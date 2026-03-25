-- Fix has_role(): remove ::user_role cast (type never existed)
CREATE OR REPLACE FUNCTION has_role(r text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE profile_id = auth.uid() AND role = r
  );
$$;
