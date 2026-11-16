# Plan del 1: Planning – ett pass, en sida

Designfilerna från zip-filen ligger i `docs/design/` (Planning, Bygg och Live ersatta, fem nya). Inget är committat än.

## Datamodell – ingen migration

- `trainings.updated_at` finns redan (default `now()`) med triggern `trainings_updated_at` → `update_updated_at()`.
  `saveTraining` uppdaterar alltid `trainings`-raden, även när bara block/övningar ändras, så tiden följer varje sparning. Publicera/avpublicera bumpar den också. **"Sparat idag 21:42" byggs på `updated_at`.**
- `trainings.status` är `draft | published | completed`. Inget nytt fält.
- Läget i databasen just nu: **22 pass** (13 utkast, 2 publicerade, 7 klara). 7 av dem är kopplade till schemat, 15 är inte det. Prompten nämner 13 pass; det är antalet utkast. Alla 22 ska fungera.
- `live_sessions.training_id` har `ON DELETE NO ACTION`. Ett pass som körts live går alltså inte att ta bort i dag (felet sväljs tyst). Förslag: "Ta bort" försöker, och vid FK-fel visas "Passet har körts live och kan inte tas bort." Ingen ändring i datamodellen.

## Sprint 1 – status i veckan + direktnavigering

| Fil | Ändring |
|---|---|
| `lib/schedule/types.ts` | `TrainingSummary` får `status: 'draft' \| 'published' \| 'completed'` och `updatedAt: string`. |
| `lib/schedule/queries.ts` | `loadTrainingSummaries` hämtar `status, updated_at`. |
| `app/(app)/planning/page.tsx` | Statusord före pilen (Utkast blå 800, Publicerat/Klart grå 600). `tap()`: pass med `trainingId` och inte inställt → `router.push('/planning/{trainingId}')`. Inställt → `PassSheet` som i dag. Utan innehåll → `PlanStartSheet`. |

`PassSheet` används fortfarande från Dashboard, Live och för inställda pass, så komponenten rörs inte.

## Sprint 2 – Passet-sidan i tre lägen

| Fil | Ändring |
|---|---|
| `app/(app)/planning/[id]/page.tsx` | Skrivs om efter PassetUtkast/Publicerat/Klart. Laddningen av training + block ligger kvar. `BLOCK_COLORS`, `STATUS_STYLE`, emojier, `glass-card`, lucide-ikonerna och `handleDuplicate` tas bort. |
| `lib/schedule/trainingSummary.ts` (ny) | En funktion som räknar "2 block · 6 övningar · 11 hopp · 15 min" och radtexten per block (hopp visas med sin kod via `exerciseLabel`/`code`). Används av både Passet-sidan och byggaren så att siffrorna är lika. |

Hur sidan får sina värden:
- **Schemakoppling**: passet hittas i `useSchedule()` via `pairPasses(...).find(p => p.trainingId === id)`. Storen laddar alla schemarader för klubben, så ingen extra fråga behövs.
- Kopplat: datum, `pairTime`, `pairGroups`, och raden "Land 17:00, vatten 17:45 · Maria och Elias" (alla tränare, inte "med …" som `pairSummary`; en liten variant läggs i `pairing.ts`).
- Okopplat: `scheduled_date` eller "Inget datum", gruppnamn från `group_id`, ingen upplägg-rad och ingen länk till "Ändra tid …".
- **Tillbaka**: `/planning?week={mondayOf(datum)}`, och utan datum aktuell vecka. Rubriken är "Vecka N" för samma datum.
- **Statusruta**: Publicera/Avpublicera skriver `status` direkt och laddar om (`useSchedule().reload()` så att veckan visar rätt ord). Utan grupp blir knappen bara "Publicera".
- **Klart**: bara "Klart" och "Kopiera till ett annat pass". Ingen resultatrad, ingen "Kör igen", ingen redigera-knapp.
- **⋯-menyn**: Duplicera (öppnar kopiera-bladet från sprint 4), Spara som mall (befintlig `saveAsTemplate`), Ta bort. Den byggs med befintliga `BottomSheet`.
- Fram till sprint 4 är Duplicera/Kopiera dolda.

## Sprint 3 – byggaren

| Fil | Ändring |
|---|---|
| `components/planning/TrainingEditor.tsx` | Header: "… 17:00 · Utkast/Publicerat". Bottenraden: summering + "Ändringar ej sparade"/"Sparat", sedan två knappar (utkast) eller "Spara ändringar" (publicerat). `save(status?)`: Publicera sparar med `status: 'published'`. En dirty-flagga jämför block + fält mot startläget. Tillbaka med osparat öppnar "Spara ändringarna?" (Spara / Släng / Avbryt) i ett `BottomSheet`. |
| `components/planning/TrainingMenu.tsx` | Statusväxeln tas bort. Grupp/datum (för okopplade), fokus, mapp och mall ligger kvar. |

- Efter spara stängs byggaren över Passet-sidan som i dag, så man hamnar där. `onSaved` laddar om både sidan och schemastoren.
- Klara pass (`completed`) kan inte redigeras från sidan. Om byggaren ändå öppnas behåller den `completed` och visar en "Spara ändringar"-knapp.
- `BlockCard`, `AthleteBlockEditor`, test- och tävlingsblock rörs inte.

## Sprint 4 – Kopiera till ett annat pass

| Fil | Ändring |
|---|---|
| `components/planning/CopyToPassSheet.tsx` (ny) | Blad med kommande pass från storen: datum idag–idag+28, ej inställda, utan `trainingId`, och samma grupp som passet (`group_id`, annars schemaparets första grupp). Saknar passet grupp visas alla gruppers pass. Tryck → `createTrainingForPass(..., { kind: 'copy', trainingId })` med samma titel → `reload()` → `/planning/{nyttId}?edit=1`. Tom lista: "Inga kommande pass utan innehåll de närmaste fyra veckorna." |
| `app/(app)/planning/[id]/page.tsx` | "Kopiera till ett annat pass" (klart) och "Duplicera" (⋯) öppnar bladet. |

`copyFromTraining` kopierar redan `height`, `assigned_athlete_id`, `block_type`, `scoring_enabled`, `dd_override` med mera. Kopian får `status: 'draft'`.

## Sist

- `docs/design/README.md`: lägg till PassetUtkast, PassetPublicerat, PassetKlart, LivePasset och Poang i tabellen (och ändra "Elva" till rätt antal).
- `npm run build` efter varje sprint, en commit per sprint på svenska, push efter sprint 4.

## Filer

- **Nya:** `lib/schedule/trainingSummary.ts`, `components/planning/CopyToPassSheet.tsx`
- **Ändrade:** `app/(app)/planning/page.tsx`, `app/(app)/planning/[id]/page.tsx`, `components/planning/TrainingEditor.tsx`, `components/planning/TrainingMenu.tsx`, `lib/schedule/types.ts`, `lib/schedule/queries.ts`, `lib/schedule/pairing.ts`, `docs/design/README.md`
- **Borttaget:** ingen fil. Inne i `[id]/page.tsx` försvinner `BLOCK_COLORS`, `STATUS_STYLE`, `handleDuplicate` och det gamla utseendet.

## Risker

1. **Ta bort på körda pass** blockeras av FK:n från `live_sessions` (se ovan). Felet visas i stället för att sväljas.
2. **Okopplade pass (15 st)** saknar schemadata. Sidan och byggaren faller tillbaka på `scheduled_date`/`group_id`. Jag testar ett okopplat pass av varje status.
3. **Två pass i samma par** med olika `training_id`: `makePair` tar den första delen som har ett pass. Det fungerar som i dag och ändras inte.
4. **Dirty-flaggan** måste ignorera ändringar som byggaren gör vid öppning (`fromRows` normaliserar). Jag jämför mot ögonblicksbilden efter första render, inte mot DB-raderna.
5. **`?edit=1`** från `PlanStartSheet` och kopiera-bladet ska fortsätta öppna byggaren direkt. Det beteendet behålls.
6. Live, Dashboard och `PassSheet` rörs inte. Live använder fortfarande `PassSheet` fram till del 2.

## Ingen fråga om datamodellen

Inget val påverkar datamodellen, eftersom `updated_at` redan finns. Säg OK så börjar jag på sprint 1.
