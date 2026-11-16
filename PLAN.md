# PLAN – HT2026-schemat i Supabase

Status: **utkast, väntar på OK.** Ingen kod skriven.

## 0. Vad jag hittade (avviker från briefen)

| Brief | Verklighet |
|---|---|
| `supabase/seed/ht2026-schedule.json` (271 pass + närvaro) | **Finns inte.** Det som finns är `lib/schema/ht2026-data.ts` (DSL): 276 passrader, 7 tränare, 12 viktiga datum, **ingen närvaro**. |
| `groups` är tom i prod | 4 grupper: T-Grupp (8 atleter, 8 trainings), F-grupp (3, 4), Ny2 (0, 0), Ny1 (0, 1). |
| Next.js 14 | Next 16.1, React 19, Tailwind v4 (`@tailwindcss/postcss`). `tailwind.config.js` laddas inte av v4 (ingen `@config`), så den är i praktiken död. |
| Ny logik i `lib/schedule/` | `lib/schedule/` finns redan (commit d854204): typer, en store som sparar i localStorage, viewer/roller, kopiering och mallar. Planning (Vecka/Period/Bank), `/schema` och `CoachToday` läser allt från den. |
| `profiles.full_name` → tränare | Bara 2 profiler i prod, så 5–6 av 7 tränare saknar konto. |
| Teal på några ställen | 394 träffar i 64 filer (hex, `rgba(13,115,119,…)`, `UI.teal`), plus 122 skuggor. |

Slutsats: jag **byter källa för den befintliga storen** (localStorage → Supabase) i stället för att bygga en parallell modell. Typerna i `lib/schedule/types.ts` var redan skrivna för att motsvara framtida tabeller.

## 1. Datamodell (förslaget, med ändringar)

Ändringar jämfört med briefen:
1. **`club_staff`** i stället för `profile_id`/`coach_name` på varje tränarrad. En tränare utan konto blir en stabil rad som kopplas till en profil i efterhand: en rad uppdateras, inte 270. Det stämmer med `Staff` i `types.ts`.
2. **`live_sessions.schedule_session_id`**: utan den går det inte att visa "Pågår" eller "Klart" på ett schemalagt pass, eller veta vilket pass ett live-pass gällde. Status *Klart* och *Pågår* härleds alltså och lagras inte.
3. **Land + vatten** paras ihop i `lib/schedule` (samma datum, samma gruppuppsättning, tiderna överlappar eller ligger kant i kant). Inget eget kolumnfält. "Planera innehåll" sätter samma `training_id` på båda delarna.
4. `club_events.staff_ids uuid[]` i stället för fritext `coaches`.
5. `cancel_reason` och `is_extra` på passet (för "Lägg till ett pass" i Närvaro).

```sql
-- 20261116000001_schedule.sql

create table club_staff (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null,
  profile_id uuid unique references profiles(id) on delete set null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (club_id, name)
);

create table schedule_sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  session_date date not null,
  start_time time,                 -- null = tid ej satt (finns i schemat)
  end_time time,
  place text not null default '',
  status text not null default 'planned' check (status in ('planned','cancelled')),
  cancel_reason text,
  training_id uuid references trainings(id) on delete set null,
  is_extra boolean not null default false,
  note text,                       -- synlig för atleter
  legacy_id text unique,           -- t.ex. 'ht2026:2026-08-25#2'
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on schedule_sessions (club_id, session_date);
create index on schedule_sessions (training_id);

create table schedule_session_groups (
  session_id uuid not null references schedule_sessions(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  primary key (session_id, group_id)
);
create index on schedule_session_groups (group_id);

create table schedule_session_coaches (
  session_id uuid not null references schedule_sessions(id) on delete cascade,
  staff_id uuid not null references club_staff(id) on delete cascade,
  attendance text check (attendance in ('narvarande','franvarande','ersatt')),
  actual_start time,
  actual_end time,
  note text,                       -- tränarens egen, aldrig för atleter
  primary key (session_id, staff_id)
);
create index on schedule_session_coaches (staff_id);

create table club_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  title text not null,
  type text not null check (type in ('comp','camp','cancelled','tryout','edu','event')),
  note text,
  group_ids uuid[] not null default '{}',   -- tom = alla grupper
  staff_ids uuid[] not null default '{}',
  legacy_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on club_events (club_id, start_date);

alter table live_sessions
  add column schedule_session_id uuid references schedule_sessions(id) on delete set null;

create trigger schedule_sessions_updated before update on schedule_sessions
  for each row execute function update_updated_at();
create trigger club_events_updated before update on club_events
  for each row execute function update_updated_at();

-- Atletens grupp (security definer, samma mönster som get_my_club_id)
create or replace function get_my_group_id() returns uuid
language sql stable security definer set search_path = public as $$
  select group_id from athletes where profile_id = auth.uid() limit 1
$$;
```

### RLS

`is_staff()` = `has_role('coach') or has_role('admin')` (inline, samma mönster som `trainings`).

| Tabell | Coach/admin i klubben | Atlet |
|---|---|---|
| `club_staff` | läs; skriv bara admin | – |
| `schedule_sessions` | läs + skriv | läs om `exists (select 1 from schedule_session_groups g where g.session_id = id and g.group_id = get_my_group_id())` |
| `schedule_session_groups` | läs + skriv | läs egna gruppens rader |
| `schedule_session_coaches` | läs + skriv | – (ingen närvaro, inga tränare) |
| `club_events` | läs + skriv | läs om `group_ids = '{}' or get_my_group_id() = any(group_ids)` (staff_ids filtreras bort i queryn) |

Alla policyer kräver även `club_id = get_my_club_id()` (via sessionen för join-tabellerna).

## 2. Import – `scripts/seed-schedule.ts`

Körs med `npx tsx scripts/seed-schedule.ts` (+ `tsx` som devDependency), service role från `.env.local`. Idempotent: upsert på `legacy_id`, `(club_id, name)` och PK.

1. Grupper: mappa mot **befintliga** rader (se fråga 2), skapa bara de som saknas. Sätt namn och sort_order, men inte färg (färger används inte längre).
2. `club_staff`: 7 namn, koppla `profile_id` om förnamnet matchar `profiles.full_name` (skiftlägesokänsligt).
3. Pass, gruppkopplingar och tränare. `ALLA` = N1N, N1F, N2, FG, TG (som i dagens parser).
4. `club_events` (12 st, från `demoSeed.ts`). Pass inom ett `cancelled`-event för gruppen → `status='cancelled'`, `cancel_reason = titel`.
5. Utskrift: pass per grupp, per tränare, antal inställda. `--dry-run` skriver bara ut.

## 3. Filer

**Nya**
- `supabase/migrations/20261116000001_schedule.sql`
- `scripts/seed-schedule.ts`
- `lib/schedule/queries.ts`: load per vecka eller termin, mutationer, `startScheduledPass`
- `lib/schedule/pairing.ts`: land och vatten → ett pass
- `components/schedule/`: `PassRow`, `PassSheet` (skärm 2), `WeekStrip`, `HeroCard`, `ListCard`, `Segmented`, `EventRow`, `EventForm`
- `app/(app)/narvaro/page.tsx` (skärm 5)
- `app/(app)/viktiga-datum/page.tsx` (skärm 6)

**Ändrade**
- Sprint 0: `app/globals.css` (tokens, `.glass-*` → platt kort), `tailwind.config.js` (teal → blå, eller ta bort om död), `lib/schedule/format.ts` (`UI`), och hårdkodade färger i 64 filer (mekaniskt hex→token)
- `lib/schedule/store.tsx`, `types.ts`, `viewer.ts`: Supabase som källa, `me` via `club_staff.profile_id`, "Visa som" kvar för admin
- `app/(app)/dashboard/page.tsx`, `CoachToday.tsx` → skärm 1
- `app/(app)/live/page.tsx`, `TodayTrainings.tsx`, `LiveOverview.tsx`, `ActiveSessionCard.tsx` → skärm 4
- `app/(app)/planning/page.tsx`, `planning/schedule/WeekView.tsx` (+ `PassSheet` ersätts) → skärm 3
- `app/(app)/athlete/page.tsx` → skärm 7 (bara sidan, inte athlete-*blocken*)
- `components/nav/HamburgerMenu.tsx`: Närvaro (coach/admin), Viktiga datum
- `types/index.ts`: nya radtyper

**Rörs inte**: test, competition, athlete-block, TrainingBuilder (bara länkas till).

## 4. Sprintar (en commit per sprint, `npm run build` före)

| # | Innehåll | Klart när |
|---|---|---|
| 0 | Blå palett i hela appen, inga skuggor eller glas. Bara färg och yta. | Inga teal-träffar kvar (`grep`), build grön. |
| 1 | Migration, typer, seed, store läser Supabase. Lokala demodata och "Återställ testdata" tas bort. | Seedens sammanfattning stämmer mot schemat; Planning visar DB-data. |
| 2 | Dashboard, Pass-blad, Live (start med `training_id`, `group_id`, `schedule_session_id` + närvaro). | Starta från pass → live-session kopplad, tränaren markerad närvarande. |
| 3 | Planning vecka: Mina/Alla, Planera innehåll → skapa eller välj `training`, inställda pass överstrukna. | |
| 4 | Närvaro: mina pass med bock och summa; laget med staplar och CSV. | |
| 5 | Atlet och Viktiga datum. | Atlet ser bara sin grupp, inga tränare eller närvaro (testat med atletkonto). |

## 5. Risker

- **Lokalt planerat innehåll försvinner.** `PassContent`, veckofokus, utvärderingar och lokala mallar ligger i localStorage. Innehåll ska nu bo i `trainings`/`training_blocks`. Förslag: inget migreras; veckofokus, utvärderingar och lokala mallar göms tills vidare (Period och Bank behålls men läser bara DB-data).
- **`/schema` (Översikt, Per grupp, Kalender, Tränare, Ledare)** följer inte den nya designen. Förslag: redirect `/schema` → `/planning`; Ledare (koppla tränare till konto) flyttar till `/admin`. Säg till om ni vill behålla den.
- **Sprint 0 är stor** (64 filer) och rör färg i test-, competition- och athlete-filer. Jag tolkar "rör inte" som *ingen funktionsändring*; bara färgvärden byts.
- **Hopparning av land och vatten** är heuristisk. Pass som inte går ihop visas som två rader. Seedens utskrift listar antal par.
- **Timmar i Närvaro**: ett ihopslaget pass räknas som 1 pass, och tiden = `actual_*` annars första start → sista slut.
- **Prod-data**: seeden skriver till prod (enda projektet). Kör `--dry-run` först; jag kör inget mot prod utan ditt OK.

## 5b. Avstämning mot designen (`docs/design/`, skärm 1–6)

- **Gruppnamn** i designen: TG, FG, N1 Nybörjare, N1 Fortsättning, N2, Vuxen. Det ger sex grupper, och VUX blir "Vuxen".
- **Närvaro räknas per del, inte per ihopslaget pass.** I designen har Elias bara vattendelen 17:45–19:00 på torsdagen. Det stämmer med `schedule_session_coaches` per rad. Risken "ett ihopslaget pass räknas som 1" stryks: timmar = summan av mina delar.
- **Pass-bladet** visar innehållet som "3 block · 18 övningar". Det räknas från `training_blocks` och `training_block_items`.
- **Planning** har bara vecka med "Mina pass" / "Alla pass", och inga flikar för Period eller Bank. Förslag: Period och Bank försvinner från Planning i sprint 3.
- **"Planera innehåll"** öppnar skärm 7 (Planera pass, start) från PLAN-bibliotek.md.
- **Bottenmenyn**: coach har Dashboard, Live, Planning, Library. Atlet har Hem, Dagbok, Mål, Meddelanden.

## 6. Frågor (påverkar datamodell eller import)

1. **Källa**: JSON-filen saknas. Ska jag seeda från `lib/schema/ht2026-data.ts` (276 rader, ingen närvaro), eller lägger du in JSON:en? Närvaro finns bara i JSON:en.
2. **Gruppmappning** mot befintliga rader (atleter och trainings hänger på dem). Förslag:
   - T-Grupp → TG, F-grupp → FG (byter namn).
   - Ny1 → N1 Nybörjare, Ny2 → N2.
   - N1 Fortsättning och Vuxen skapas.
3. **`club_staff`** i stället för `profile_id`/`coach_name` per pass. OK?
