# PLAN – Enklare planering och nytt bibliotek

Status: **utkast, väntar på OK.** Ingen kod skriven. Design: `docs/design/` skärm 7–11.

## 0. Vad jag hittade (avviker från briefen)

| Brief | Verklighet (kontrollerat 16 nov) |
|---|---|
| 100 har 13 övningar | 100 har **20**: 13 hopp + 7 `custom` (101A, 102, 1,5 volt i pik, Dubbel volt fram, Fall bakåt i rak stil, hej 1 …). Övriga grupper stämmer. |
| `categories` per klubb | **Ingen `club_id`** och bara en SELECT-policy. Kategorierna är globala (1 klubb i prod) och kan inte skapas från appen. Grupperna skapas därför i migrationen. |
| Spara pass utan dataförlust | `handleSave` raderar alla block och lägger in dem igen. `exercise_scores` (4 rader) har `ON DELETE CASCADE` mot `training_block_items`, så **varje sparning raderar poängen i dag**. Det nya sparandet måste uppdatera befintliga rader på id. |
| Mallar ("Block · 4 övningar") | `training_templates` och `block_templates` syns bara om `group_id` tillhör klubben. En mall utan grupp är osynlig för alla. |
| Emoji- och färgredigering | Ligger i en egen tabell, `block_categories`. Den slutar användas men tas inte bort. |
| `trainings.created_by` | Finns. Förifyllt antal från samma coach kan alltså räknas fram utan ny kolumn. |
| Två passbyggare | `TrainingBuilder` (DB) **och** `planning/schedule/PassPlanner` (localStorage, från d854204). Båda ersätts av de nya skärmarna. |

## 1. Migration

```sql
-- 20261117000001_library_groups.sql

-- Bild på övning
alter table library_items add column image_path text;

-- Land-grupper (globala kategorier, se 0)
insert into categories (name, block_category, sort_order)
select v.name, 'land', v.ord from (values
  ('Styrka', 10), ('Stretch', 12), ('Redskap', 14)
) v(name, ord)
where not exists (select 1 from categories c where trim(c.name) = v.name);

update categories set block_category = 'land', sort_order = 11 where id = '95b330f3-e0d6-4999-a858-a4e6fc816bf8'; -- Längor
update categories set block_category = 'land', name = 'Lekar', sort_order = 13 where id = '729d7849-1539-458b-bfe9-669fcbce0c19';
-- Trimma namnen ("Skruvar ", "Armsving ")
update categories set name = trim(name) where name <> trim(name);

-- Fördelning av övningar, se avsnitt 3
```

Grupperna hamnar i ordningen Styrka, Längor, Stretch, Lekar, Redskap (som i designen). Vattengrupperna rörs inte, utom att mellanslaget i slutet av namnen tas bort.

### Storage

```sql
insert into storage.buckets (id, name, public) values ('exercise-images', 'exercise-images', false);

create policy "exercise images: club staff read" on storage.objects for select to authenticated
  using (bucket_id = 'exercise-images'
         and (storage.foldername(name))[1] = get_my_club_id()::text
         and (has_role('coach') or has_role('admin')));
create policy "exercise images: club staff write" on storage.objects for insert to authenticated
  with check (bucket_id = 'exercise-images'
         and (storage.foldername(name))[1] = get_my_club_id()::text
         and (has_role('coach') or has_role('admin')));
-- samma villkor för update och delete
```

- Sökväg: `{club_id}/{library_item_id}.jpg`. Visning sker via `createSignedUrl` (1 h), eftersom bucketen är privat.
- Bilden skalas ner i klienten med canvas till längsta sida 1 200 px och sparas som JPEG med kvalitet 0,8.

## 2. Antal eller tid

- Ingen ny kolumn.
- Tidsläge: `duration_seconds` är satt och `reps` är null. Annars är raden i antalsläge.
- Byte till tid: `reps = null`, `duration_seconds = 300`.
- Byte till antal: `duration_seconds = null`, `reps` = förifyllt värde.
- Steg: ±1 i antalsläge, ±5 min i tidsläge. Lägsta värde är 1 respektive 5 min.
- Enhet under värdet:
  - "hopp" när övningen är `type = 'dive'` eller ligger i en vattengrupp.
  - "st" för övrigt i antalsläge.
  - "min" i tidsläge.
- Summa i bottenraden: "11 hopp · 15 min". "st" räknas inte med, precis som i designen.

**Förifyllt vid "Lägg till":**
- Höjd: `default_height`.
- Antal: senaste `reps` för samma `library_item_id` i en `training` med `created_by = jag`. Finns inget blir det 4 för hopp och 10 för övrigt.
- Värdena hämtas i en enda query för alla valda övningar.

## 3. Fördelning av befintliga övningar (förslag)

| Övningar | Nu | Förslag |
|---|---|---|
| 84 hopp + `custom` med kod i vattengrupperna | 100–400, Skruvar, Armsving, Fall | Oförändrat |
| Fall bakåt i rak stil (kod 020) | 100 | → **Fall** |
| hej 1 (kod "asax") | 100 | → `archived = true` (ser ut som test) |
| Hoppa på ett ben, Pikgång, Indianhopp | Längor | Oförändrat |
| Indianhopp | Uppvärmning | → **Lekar** (dubblett av Längor-raden, behålls) |
| springa, indian smyg, Elefantgång, Bygga tak | ingen grupp | → **Lekar** |
| Sparka pik | ingen grupp | → **Stretch** |
| Warmup - Stretch (`warmup`) | ingen grupp | → **Stretch** |
| Dryland - Jump Training (`dryland`) | ingen grupp | → **Redskap** |

- Gruppen **Uppvärmning** tas bort när den är tom. Uppvärmning är ett *blocknamn* (förslag i "Nytt block"), inte en övningsgrupp.
- **stadsmtchen** (tävling, 0 övningar) tas bort.
- Inga övningar raderas, så `training_block_items` påverkas inte (FK `RESTRICT`).

## 4. Filer

**Nya: `components/library/`** (delas av biblioteket och passbyggaren)
- `GroupTiles.tsx`: Vatten/Land-växel och grupprutor i två kolumner, med "2 valda".
- `ExerciseList.tsx`: rader med bock eller pil, och "+ Ny övning här".
- `ExercisePicker.tsx`: skärm 9 (sök, flerval och "Lägg till N övningar"). Valen ligger kvar mellan grupper och sökning.
- `ExerciseForm.tsx`: skärm 10. Används för både ny övning och redigering (namn, var, grupp, höjd, bild).
- `TemplateList.tsx`: Mallar-fliken.

**Nya: passbyggaren** (`components/planning/`)
- `PlanStartSheet.tsx`: skärm 7.
- `TrainingEditor.tsx`: skärm 8, med header, namn, block och bottenrad.
- `BlockCard.tsx`, `ExerciseRow.tsx`: räknare och "Byt till tid".
- `ExerciseDetailSheet.tsx`: set, höjd, anteckning och ta bort.
- `NewBlockSheet.tsx`: namn med förslagen Uppvärmning, Land, Vatten, Styrka, plus "Testblock" och "Atletblock".
- `TrainingMenu.tsx`: ⋯-menyn med mapp, fokus/syfte, status och "Spara som mall".

**Nya: logik** (`lib/library/`)
- `queries.ts`: grupper, övningar, sök, mallar, `lastUsedReps`.
- `image.ts`: nedskalning, uppladdning och signerad URL.
- `trainingSave.ts`: diff-sparning. Rader uppdateras på id, nya läggs in och borttagna raderas. Det skyddar `exercise_scores`. Om passet hör till ett schemalagt pass sätts `training_id` på båda delarna.

**Ändrade**
- `app/(app)/library/page.tsx`: skärm 11 (Vatten, Land, Mallar). Utforska, stämningsfilter, AI-raden, inspirationskort och redigering av emoji och färg tas bort.
- `app/(app)/planning/[id]/page.tsx`, `CalendarWeekView.tsx`, `PlanningListView.tsx`: öppnar `TrainingEditor` i stället för `TrainingBuilder`.
- Schemats Pass-blad (från PLAN.md): "Planera innehåll" öppnar `PlanStartSheet`.
- `app/(app)/library/[categoryId]/page.tsx`: ersätts av gruppvyn i `library/page.tsx`. Routen pekas om eller tas bort.

**Borttagna** (sprint 5, när ingen importerar dem längre)
- `planning/TrainingBuilder.tsx`
- `components/ExerciseModal.tsx`
- `planning/schedule/PassPlanner.tsx`
- `library/[categoryId]/page.tsx`

**Rörs inte**
- `AthleteBlockEditor.tsx` och logiken för test-, tävlings- och atletblock. De renderas i editorn precis som i dag. Bara tillägget sker via "Nytt block".
- `library/blocks/[id]`, `library/trainings/[id]`, `library/groups/[groupId]`: blir kvar som redigering av mallar. De öppnas från Mallar.

## 5. Sprintar (en commit per sprint, `npm run build` före)

| # | Innehåll | Klart när |
|---|---|---|
| 1 | Migration, grupper, fördelning och bucket med policy. `lib/library/queries.ts` + `image.ts`. | Varje övning har en grupp; uppladdning till fel `club_id` nekas. |
| 2 | `ExercisePicker` med grupper, sök, flerval och förifyllda värden (kopplad till dagens builder via en adapter). | Fem övningar ur tre grupper läggs till i ett svep med höjd och antal. |
| 3 | `TrainingEditor`, rader, antal/tid, `PlanStartSheet`, ⋯-meny och diff-sparning. | Alla 13 befintliga pass öppnas och sparas utan att block, rader eller `exercise_scores` försvinner (räknas före och efter). |
| 4 | `ExerciseForm` med kamera och bild. | Ny övning från väljaren blir vald och hamnar i passet. |
| 5 | Biblioteket (skärm 11) och städning av gamla filer. | Inga importer av `TrainingBuilder` eller `ExerciseModal` kvar. |

**Beroende:** `PlanStartSheet` och "sätt `training_id` på schemalagt pass" kräver `schedule_sessions` från PLAN.md sprint 1. Förslag på ordning:
1. Schema sprint 1.
2. Bibliotek sprint 1–2.
3. Schema sprint 2–3.
4. Bibliotek sprint 3–5.
5. Schema sprint 4–5.

### Status sprint 1 (17 nov)

- Migrationen är körd. Fördelningen följer avsnitt 3.
- Följande var redan arkiverade innan migrationen, fick rätt grupp och syns fortfarande inte: 101A, 102, 1,5 volt i pik, Dubbel volt fram, Fall bakåt i rak stil, springa, indian smyg, Elefantgång, Bygga tak, Sparka pik, Warmup - Stretch och Dryland - Jump Training.
- Aktiva övningar per grupp: 100 (13), 200 (14), 300 (13), 400 (11), Skruvar (27), Armsving (6), Fall (4), Längor (3) och Lekar (1).
- Mallarna har `club_id`, och grupp är valfri.
- Bucketen och policyn är testade: egen klubb tillåts, fel klubb nekas.
- **`trainings.created_by` är tomt på alla 13 pass**, eftersom gamla `TrainingBuilder` inte sätter det. "Senaste antal" börjar därför fungera först när `trainingSave.ts` (sprint 3) sätter `created_by`.

## 6. Risker

- **Kategorier är globala.** Det fungerar med en klubb. En andra klubb skulle dela grupperna (övningarna är fortfarande per klubb).
- **"Kopiera senaste passet"** kopierar block och rader till en ny `training`, inte poäng eller loggar.
- **`purpose_type` och mapp** finns kvar i ⋯-menyn. Befintliga värden sparas oförändrade.
- **Bildstorlek**: HEIC från iPhone läses via `<img>`/canvas i Safari. I andra webbläsare kan HEIC misslyckas, och då visas ett felmeddelande och övningen sparas utan bild.
- **Prod-data**: migrationen flyttar 9 övningar och tar bort 2 tomma grupper. Jag kör den inte utan ditt OK.

## 7. Frågor (påverkar datamodellen)

1. **Fördelningen i avsnitt 3**: OK, särskilt att "hej 1" arkiveras och att Uppvärmning och stadsmtchen tas bort?
2. **Mallar utan grupp** ("Block · 4 övningar" i designen): ska block- och passmallar få finnas utan grupp? I så fall lägger jag till `club_id` på `block_templates` och `training_templates` och byter policyn till `club_id = get_my_club_id()`.
