-- Länka athletes till auth-användare
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id);
CREATE UNIQUE INDEX IF NOT EXISTS athletes_profile_id_idx ON athletes(profile_id) WHERE profile_id IS NOT NULL;

-- Atleter kan se sin egen rad
CREATE POLICY "Athletes can view own record" ON athletes
  FOR SELECT USING (profile_id = auth.uid());

-- Atleter kan uppdatera begränsad info om sig själva
CREATE POLICY "Athletes can update own record" ON athletes
  FOR UPDATE USING (profile_id = auth.uid());
