// Importerar HT2026-schemat till Supabase. Idempotent: befintliga rader
// (legacy_id, gruppnamn, tränarnamn) skrivs inte över.
//
//   npx tsx scripts/seed-schedule.ts --dry-run   (skriver bara ut)
//   npx tsx scripts/seed-schedule.ts
//
// Kräver NEXT_PUBLIC_SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY i .env.local.

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { BASE_SCHEDULE } from '../lib/schema/ht2026'

const DRY = process.argv.includes('--dry-run')
const CLUB_ID = 'e96934b6-446e-4d39-a820-7af3cd9521f0'

// Schemats gruppnycklar → befintliga grupper (id) eller nya (null)
const GROUPS: { key: string; name: string; existingId: string | null }[] = [
  { key: 'N1N', name: 'N1 Nybörjare', existingId: 'f576f2ff-f0b8-4e44-ad0d-882c9fe7569f' }, // Ny1
  { key: 'N1F', name: 'N1 Fortsättning', existingId: null },
  { key: 'N2', name: 'N2', existingId: '13f52d4f-4beb-404c-85a0-867de88ac529' }, // Ny2
  { key: 'FG', name: 'FG', existingId: '9e0a46d0-72ed-4889-8613-cf7caf9db91b' }, // F-grupp
  { key: 'TG', name: 'TG', existingId: '00000000-0000-0000-0000-000000000010' }, // T-Grupp
  { key: 'VUX', name: 'Vuxen', existingId: null },
]
const TRAINING = ['N1N', 'N1F', 'N2', 'FG', 'TG']
const ALL = [...TRAINING, 'VUX']

const STAFF = ['Maria', 'Anna', 'Elias', 'Ville', 'Leo', 'Vega', 'Anton']
// Profiler saknar full_name, så kopplingen görs här (klubbens admin)
const PROFILE_LINKS: Record<string, string> = { Elias: 'c7bf0f87-d58f-446e-8497-a159a81055eb' }

type EventType = 'comp' | 'camp' | 'cancelled' | 'tryout' | 'edu' | 'event'
const EVENTS: { id: string; start: string; end: string; title: string; type: EventType; note: string; groups: string[] }[] = [
  { id: 'e-1', start: '2026-08-08', end: '2026-08-09', title: 'Uppstartsläger', type: 'camp', note: 'Alla grupper · 10–16', groups: TRAINING },
  { id: 'e-2', start: '2026-08-15', end: '2026-08-16', title: 'Basutbildning tränare', type: 'edu', note: '', groups: [] },
  { id: 'e-3', start: '2026-08-20', end: '2026-08-22', title: 'Prova på simhopp', type: 'tryout', note: '20 & 22 aug · Rekrytering', groups: [] },
  { id: 'e-4', start: '2026-09-05', end: '2026-09-06', title: 'Simtävling VÖSS', type: 'cancelled', note: 'Ingen träning', groups: ['N1N', 'N2', 'FG', 'TG'] },
  { id: 'e-5', start: '2026-09-25', end: '2026-09-27', title: 'Speedo Dive', type: 'comp', note: 'Tävling · JKPG', groups: [] },
  { id: 'e-6', start: '2026-10-17', end: '2026-10-18', title: 'Simtävling VÖSS', type: 'cancelled', note: 'Ingen träning', groups: TRAINING },
  { id: 'e-7', start: '2026-10-27', end: '2026-10-27', title: 'Träning Alla', type: 'event', note: 'Gemensamt pass', groups: TRAINING },
  { id: 'e-8', start: '2026-10-29', end: '2026-11-01', title: 'Diving Lund', type: 'comp', note: 'Tävling', groups: ['FG', 'TG'] },
  { id: 'e-9', start: '2026-11-07', end: '2026-11-07', title: 'Triangel Tävling VÖSS', type: 'comp', note: 'N1, N1F, N2, FG · 09–17', groups: ['N1N', 'N1F', 'N2', 'FG'] },
  { id: 'e-10', start: '2026-11-14', end: '2026-11-15', title: 'Simtävling VÖSS', type: 'cancelled', note: 'Ingen träning', groups: TRAINING },
  { id: 'e-11', start: '2026-12-04', end: '2026-12-06', title: 'Julklappshoppet', type: 'comp', note: 'Tävling · JKPG', groups: ['FG', 'TG'] },
  { id: 'e-12', start: '2026-12-19', end: '2026-12-19', title: 'Lucia & avslutning HT', type: 'event', note: 'Vatten · Alla', groups: ALL },
]

function loadEnv() {
  const file = path.join(process.cwd(), '.env.local')
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

function fail(what: string, error: { message: string } | null): never {
  console.error(`Fel vid ${what}:`, error?.message)
  process.exit(1)
}

const legacy = (id: string) => `ht2026:${id}`
const cancelledBy = (date: string, keys: string[]) =>
  EVENTS.find(e => e.type === 'cancelled' && e.start <= date && date <= e.end &&
    (e.groups.length === 0 || keys.some(k => e.groups.includes(k))))

async function main() {
  loadEnv()

  // ── Sammanfattning (oberoende av databasen) ────────────────────────────
  const sessions = BASE_SCHEDULE.sessions
  const perGroup = new Map<string, number>()
  const perCoach = new Map<string, number>()
  let cancelled = 0
  for (const s of sessions) {
    s.groups.forEach(g => perGroup.set(g, (perGroup.get(g) ?? 0) + 1))
    s.coaches.forEach(c => perCoach.set(c, (perCoach.get(c) ?? 0) + 1))
    if (cancelledBy(s.date, s.groups)) cancelled++
  }
  const unknownCoaches = Array.from(perCoach.keys()).filter(c => !STAFF.includes(c))
  const unknownGroups = Array.from(perGroup.keys()).filter(g => !GROUPS.some(x => x.key === g))

  console.log(`Pass (delar): ${sessions.length}, varav inställda: ${cancelled}`)
  console.log('Per grupp:', Object.fromEntries(Array.from(perGroup).sort()))
  console.log('Per tränare:', Object.fromEntries(Array.from(perCoach).sort((a, b) => b[1] - a[1])))
  console.log(`Viktiga datum: ${EVENTS.length}`)
  if (unknownCoaches.length || unknownGroups.length) {
    console.error('Okända namn i schemat:', { unknownCoaches, unknownGroups })
    process.exit(1)
  }
  if (DRY) { console.log('\n--dry-run: inget skrivet.'); return }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('Saknar NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
  const db = createClient(url, key, { auth: { persistSession: false } })

  // ── 1. Grupper ─────────────────────────────────────────────────────────
  const groupId: Record<string, string> = {}
  for (let i = 0; i < GROUPS.length; i++) {
    const g = GROUPS[i]
    if (g.existingId) {
      const { error } = await db.from('groups').update({ name: g.name, sort_order: i }).eq('id', g.existingId)
      if (error) fail(`grupp ${g.name}`, error)
      groupId[g.key] = g.existingId
      continue
    }
    const { data: found } = await db.from('groups').select('id').eq('club_id', CLUB_ID).eq('name', g.name).maybeSingle()
    if (found) { groupId[g.key] = found.id; continue }
    const { data, error } = await db.from('groups').insert({ club_id: CLUB_ID, name: g.name, sort_order: i }).select('id').single()
    if (error || !data) fail(`grupp ${g.name}`, error)
    groupId[g.key] = data.id
  }

  // ── 2. Tränare ─────────────────────────────────────────────────────────
  const { error: staffErr } = await db.from('club_staff').upsert(
    STAFF.map((name, i) => ({ club_id: CLUB_ID, name, sort_order: i, profile_id: PROFILE_LINKS[name] ?? null })),
    { onConflict: 'club_id,name', ignoreDuplicates: true },
  )
  if (staffErr) fail('tränare', staffErr)
  const { data: staffRows, error: staffReadErr } = await db.from('club_staff').select('id, name').eq('club_id', CLUB_ID)
  if (staffReadErr || !staffRows) fail('läsa tränare', staffReadErr)
  const staffId = Object.fromEntries(staffRows.map(s => [s.name, s.id]))

  // ── 3. Viktiga datum ───────────────────────────────────────────────────
  const { error: evErr } = await db.from('club_events').upsert(
    EVENTS.map(e => ({
      club_id: CLUB_ID, legacy_id: legacy(e.id), start_date: e.start, end_date: e.end,
      title: e.title, type: e.type, note: e.note || null, group_ids: e.groups.map(k => groupId[k]),
    })),
    { onConflict: 'legacy_id', ignoreDuplicates: true },
  )
  if (evErr) fail('viktiga datum', evErr)

  // ── 4. Pass, grupper, tränare ──────────────────────────────────────────
  const { error: sErr } = await db.from('schedule_sessions').upsert(
    sessions.map(s => {
      const c = cancelledBy(s.date, s.groups)
      return {
        club_id: CLUB_ID, legacy_id: legacy(s.id), session_date: s.date,
        start_time: s.start || null, end_time: s.end || null, place: s.place,
        status: c ? 'cancelled' : 'planned', cancel_reason: c?.title ?? null,
      }
    }),
    { onConflict: 'legacy_id', ignoreDuplicates: true },
  )
  if (sErr) fail('pass', sErr)

  const { data: sRows, error: sReadErr } = await db.from('schedule_sessions')
    .select('id, legacy_id').eq('club_id', CLUB_ID).like('legacy_id', 'ht2026:%')
  if (sReadErr || !sRows) fail('läsa pass', sReadErr)
  const sessionId = Object.fromEntries(sRows.map(r => [r.legacy_id, r.id]))

  const links = sessions.flatMap(s => s.groups.map(k => ({ session_id: sessionId[legacy(s.id)], group_id: groupId[k] })))
  const { error: gErr } = await db.from('schedule_session_groups').upsert(links, { onConflict: 'session_id,group_id', ignoreDuplicates: true })
  if (gErr) fail('passgrupper', gErr)

  const coaches = sessions.flatMap(s => s.coaches.map(c => ({ session_id: sessionId[legacy(s.id)], staff_id: staffId[c] })))
  const { error: cErr } = await db.from('schedule_session_coaches').upsert(coaches, { onConflict: 'session_id,staff_id', ignoreDuplicates: true })
  if (cErr) fail('passtränare', cErr)

  console.log(`\nKlart: ${sRows.length} pass, ${links.length} gruppkopplingar, ${coaches.length} tränarkopplingar, ${staffRows.length} tränare.`)
}

main()
