# Plan del 2: Live – publicerade pass, start, fortsätt och klart

## Läget i databasen (kontrollerat 17 nov)

- `live_sessions`: id, club_id, group_id, status (`active`/`ended`), started_at, ended_at, training_id, coach_id, schedule_session_id. Coacher får hantera, klubbens medlemmar får läsa.
- `exercise_scores`: session_id, training_block_item_id, athlete_id, score, **notes**. Unik per (session, övning, atlet). RLS via `live_sessions.club_id`.
- `live_dive_log`: hopp som lagts till för en atlet under passet (AddDiveSheet). Samma RLS.
- `session_logs` (AthleteLogging): poäng och anteckning per atlet, men nyckeln är **training_id, inte session**. En ny körning skriver alltså över den förra. Se fråga 3.
- **16 sessioner står som `active`** från 26–28 mars. Ingen av dem är kopplad till schemat, och alla har ett pass. Utan åtgärd hamnar de under "Inte avslutat" i Alla pass. Se fråga 1.

## Migration (sprint 1)

`supabase/migrations/20261117000001_live_session_checks.sql`

```sql
create table live_session_checks (
  session_id uuid not null references live_sessions(id) on delete cascade,
  training_block_item_id uuid not null references training_block_items(id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (session_id, training_block_item_id)
);

alter table live_session_checks enable row level security;

create policy "Club members can view session checks" on live_session_checks
  for select using (session_id in (select id from live_sessions where club_id = get_my_club_id()));

create policy "Coach and admin can manage session checks" on live_session_checks
  for all
  using (session_id in (select id from live_sessions where club_id = get_my_club_id())
         and (has_role('coach') or has_role('admin')))
  with check (session_id in (select id from live_sessions where club_id = get_my_club_id())
         and (has_role('coach') or has_role('admin')));

-- Fråga 1, om du säger ja: stäng de gamla testsessionerna från mars
-- update live_sessions set status = 'ended', ended_at = started_at
--   where status = 'active' and started_at < '2026-04-01';
```

- Bocka i lägger till en rad (upsert) och bocka ur tar bort den. När en övning tas bort i byggaren försvinner bocken automatiskt via cascade.
- Poäng och bockar ligger per session. "Kör igen" skapar en ny session och skriver aldrig över något. Klart-sidan läser den senaste avslutade sessionen. Därför går det att ändra regeln senare, till exempel för att slå ihop sessioner, utan ny datamodell.

## Sprint 1 – spara avbockningar

| Fil | Ändring |
|---|---|
| migrationen ovan | ny |
| `lib/live/checks.ts` (ny) | `loadChecks(sessionId)`, `setCheck(sessionId, itemId, on)` |
| `app/(app)/live/session/[id]/page.tsx` | `checked` läses från tabellen vid start. Bocka och timer som går ut skriver till tabellen (optimistiskt, med återställning vid fel). Inget annat ändras i den här sprinten. |

## Sprint 2 – Live-fliken

| Fil | Ändring |
|---|---|
| `app/(app)/live/page.tsx` | Skrivs om efter Live.dc.html: rubrik ("Idag" eller veckodag), datum och vecka, veckopilar, Mina/Alla (`Segmented`, samma regel som Planning: mina = jag är tränare på passet), dagremsa med prick, blå rutor och en tom dag-ruta med länk till Planning. "Pass utan schema" ligger kvar. `PassSheet` används inte längre härifrån. |
| `lib/live/queries.ts` (ny) | `activeSessions(clubId)`: alla aktiva sessioner med pass, grupp, schemakoppling, coach, antal bockar och antal övningar. Används för "Inte avslutat" och "pågår". |
| `components/live/LiveCard.tsx` (ny) | Den blå rutan: rad 1 tid och "pågår N min", grupp, passnamn, plats och tränare, vit knapp. |

Regler för listan:
- **Vald dag:** schemapass som inte är inställda och där `trainings.status = 'published'`, eller som har en aktiv session som startade idag (gäller också "Kör igen" på ett klart pass). Knappen visar "Fortsätt passet" om passet pågår, annars "Starta passet".
- **Inte avslutat** visas alltid överst: aktiva sessioner som startade före idag, plus aktiva sessioner utan schemakoppling. Raden visar dag och "4 av 6 övningar klara". Mina visar sessioner där jag är coach eller tränare på passet, Alla visar klubbens.
- **Starta:** knappen anropar `useStartLive(pair)` direkt, som markerar mig närvarande precis som i dag.
- **Dagremsan:** förvald är idag. Pilarna byter vecka och väljer måndag, eller idag när veckan är den aktuella.

## Sprint 3 – sessionssidan och poängbladet

| Fil | Ändring |
|---|---|
| `app/(app)/live/session/[id]/page.tsx` | Skrivs om efter LivePasset.dc.html. Header: tillbaka, grupp, "Pågår · N min". Rubrik med passets namn och raden "Vatten till 19:00 · Maria och Elias" (från schemat; utan koppling bara gruppen). Block med "x av y" och en rad per övning: bock 44 px, namn (grått när klar), underrad ("4 hopp · 3 m" / "5 min"), och till höger "Sätt poäng", "Poäng 6 av 6" eller "Starta tid" (nedräkningen visas i raden). "+ Lägg till hopp för en atlet". Bottenrad med "3 av 6 övningar klara", stapel och "Avsluta pass" (kantad, fylld när allt är klart). `glass-card`, `BLOCK_COLORS`, emojier, röd och grön färg tas bort. |
| `components/live/ScoreSheet.tsx` (ny) | Efter Poang.dc.html. En rad per atlet med −, värde och +, steg 0,5 mellan 0 och 10. Värdet är "–" tills man trycker, och första trycket (− eller +) ger 7,0 som prompten säger; i designens skript ger − 6,5. Bottenraden visar "3 av 6 har poäng" och "Spara poäng" (upsert i `exercise_scores` som i dag). En övning med `assigned_athlete_id` visar bara den atleten. |
| `AthleteBlockLive.tsx` | Logiken rörs inte. Blockrubriken och kortet runt komponenten får samma stil som övriga block. |
| `AddDiveSheet.tsx` | Logiken rörs inte. "+ Lägg till hopp för en atlet" öppnar först ett litet blad där man väljer atlet (det steget saknas i dag; `addDiveTarget` sätts aldrig) och sedan befintligt `AddDiveSheet`. |
| `AthleteLogging.tsx` | Se fråga 3. |

Andra detaljer:
- **Vilka övningar får "Sätt poäng":** hopp (samma `isDive` som i byggaren). Tidsövningar får "Starta tid". Övriga får ingen knapp. I dag kan alla övningar få poäng.
- **Atleter:** alla grupper i schemaparet (TG + FG). I dag används bara sessionens första grupp, så FG-atleterna saknas.
- **Efter Avsluta:** tillbaka till `/live`. `handleEnd` gör samma sak som i dag.

## Sprint 4 – Passet, klart

| Fil | Ändring |
|---|---|
| `app/(app)/planning/[id]/page.tsx` | Statusrutan får raden "Kördes idag 15:32–17:00. 5 av 6 övningar, poäng på 3 hopp." från senaste avslutade sessionen. Innehållskortet visar per block "2 av 2 klara" eller "3 av 4 klara · 401B hanns inte". Under kortet kommer "Kör igen" (kantad) och textknappen "Visa poäng och anteckningar". |
| `lib/live/queries.ts` | `latestRun(trainingId)`: sessionen, bockarna och poängen. |
| `components/live/ResultsSheet.tsx` (ny) | En lista per övning med atlet, poäng och anteckning, plus anteckningar per atlet från `session_logs`. |

**Kör igen:** för ett schemakopplat pass används `useStartLive(pair)`. För ett okopplat pass skapas en `live_sessions`-rad med `training_id` och `group_id`. Sidan öppnas sedan direkt. Gamla poäng och bockar ligger kvar på den gamla sessionen. Passet syns som "pågår" i Live tills det avslutas.

## Filer

- **Nya:** migrationen, `lib/live/checks.ts`, `lib/live/queries.ts`, `components/live/LiveCard.tsx`, `components/live/ScoreSheet.tsx`, `components/live/ResultsSheet.tsx`
- **Ändrade:** `app/(app)/live/page.tsx`, `app/(app)/live/session/[id]/page.tsx`, `AthleteBlockLive.tsx` (bara omslaget), `AthleteLogging.tsx` (enligt fråga 3), `app/(app)/planning/[id]/page.tsx`
- **Oförändrade:** `PassSheet` och Dashboard, `useStartLive`, `store.startLive`, `/live/vecka`
- **Borttaget:** ingen fil. Inne i sessionssidan försvinner `BLOCK_COLORS`, emojier och den gamla poängdialogen.

## Risker

1. **Migrationen måste köras före sprint 1 går ut.** Jag kör den med Supabase-verktyget på ditt projekt när du sagt OK, och lägger SQL-filen i repot.
2. **"Mina" för sessioner utan schema** bygger på `coach_id`. Den som startade passet äger det.
3. **Poängbladet för stora grupper:** TG + FG kan ge 15–20 rader. Bladet scrollar, och bottenraden ligger fast som flex-barn.
4. **Timer:** den finns bara i minnet, som i dag. Lämnar man sidan stoppas nedräkningen, men bocken sparas.

## Frågor (påverkar data)

1. **De 16 aktiva sessionerna från mars:** ska migrationen avsluta dem (`status = 'ended'`)? *Förslag: ja.* Annars ligger 16 gamla pass under "Inte avslutat" i Alla pass.
2. **"Starta om passet"** från förra ändringen sätter passet till publicerat igen. Del 2 har i stället "Kör igen", som startar en ny session direkt och låter passet stå som klart. *Förslag: byt "Starta om passet" mot "Kör igen" och behåll frågan "Är du säker?".*
3. **AthleteLogging** (poäng och anteckning per atlet för hela passet, sparas per pass) finns inte i designen och har en egen Avsluta-knapp. *Förslag: behåll den under övningarna som en hopfälld rad "Anteckningar per atlet", utan Avsluta-knappen. Låt nyckeln vara som den är nu.*
