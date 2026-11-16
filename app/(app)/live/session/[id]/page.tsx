'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { useSchedule } from '@/lib/schedule/store'
import { useLibrary } from '@/components/library/useLibrary'
import { isDive } from '@/lib/library/queries'
import { pairGroups, pairNowLine, pairPasses } from '@/lib/schedule/pairing'
import { loadChecks, setCheck } from '@/lib/live/checks'
import { minutesSince } from '@/lib/live/queries'
import BottomSheet from '@/components/planning/BottomSheet'
import ScoreSheet from '@/components/live/ScoreSheet'
import { C } from '@/components/schedule/ui'
import Portal from '@/components/Portal'
import AthleteLogging from './AthleteLogging'
import AthleteBlockLive from './AthleteBlockLive'
import AddDiveSheet from './AddDiveSheet'

// Design LivePasset.dc.html: the pass while it runs. Blocks as in the builder,
// a checkbox per exercise (saved), "Sätt poäng" for dives, "Starta tid" for
// time exercises, and the progress with "Avsluta pass" at the bottom.

interface SessionItem {
  id: string
  name: string
  reps?: number
  sets?: number
  height?: string
  duration_seconds?: number
  assigned_athlete_id?: string | null
  dive: boolean
}

interface SessionBlock {
  id: string
  name: string
  block_type: string
  items: SessionItem[]
}

interface SessionInfo {
  id: string
  status: string
  startedAt: string
  trainingId: string | null
  groupId: string | null
  groupName: string | null
  scheduleSessionId: string | null
  title: string | null
}

type Scores = Record<string, Record<string, number>> // item id → athlete id → score

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function LiveSessionPage() {
  const { id } = useParams()
  const sid = Array.isArray(id) ? id[0] : (id as string)
  const router = useRouter()
  const db = useMemo(() => createClient(), [])
  const { profile } = useUser()
  const { data, reload } = useSchedule()
  const { groups: libGroups } = useLibrary()

  const [info, setInfo] = useState<SessionInfo | null>(null)
  const [rawBlocks, setRawBlocks] = useState<RawBlock[]>([])
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([])
  const [scores, setScores] = useState<Scores>({})
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [ending, setEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [scoring, setScoring] = useState<SessionItem | null>(null)
  const [pickAthlete, setPickAthlete] = useState(false)
  const [addDiveFor, setAddDiveFor] = useState<{ id: string; name: string } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [showLogging, setShowLogging] = useState(false)
  const [timer, setTimer] = useState<{ itemId: string; remaining: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [, tick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const pair = useMemo(() => info?.scheduleSessionId
    ? pairPasses(data.passes).find(p => p.parts.some(x => x.id === info.scheduleSessionId)) ?? null
    : null, [data.passes, info?.scheduleSessionId])
  const groupIds = useMemo(() => (pair?.groupIds.length ? pair.groupIds : info?.groupId ? [info.groupId] : []), [pair, info?.groupId])

  // ── Load the session, its pass, scores and checks ─────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: s } = await db.from('live_sessions')
        .select('id, status, started_at, training_id, group_id, schedule_session_id, groups(name), trainings(title)')
        .eq('id', sid).maybeSingle()
      if (!s) { setLoading(false); return }
      const row = s as unknown as { id: string; status: string; started_at: string; training_id: string | null; group_id: string | null; schedule_session_id: string | null; groups: { name: string } | null; trainings: { title: string | null } | null }
      setInfo({
        id: row.id, status: row.status, startedAt: row.started_at, trainingId: row.training_id, groupId: row.group_id,
        groupName: row.groups?.name ?? null, scheduleSessionId: row.schedule_session_id, title: row.trainings?.title ?? null,
      })
      if (!row.training_id) { setLoading(false); return }

      const [blocks, sc, ch] = await Promise.all([
        db.from('training_blocks')
          .select('id, name, sort_order, block_type, training_block_items(id, custom_name, reps, sets, height, duration_seconds, sort_order, assigned_athlete_id, library_item:library_items(name, type, category_id))')
          .eq('training_id', row.training_id).order('sort_order'),
        db.from('exercise_scores').select('training_block_item_id, athlete_id, score').eq('session_id', sid),
        loadChecks(db, sid).catch(() => new Set<string>()),
      ])
      setRawBlocks((blocks.data ?? []) as unknown as RawBlock[])
      const map: Scores = {}
      for (const r of (sc.data ?? []) as { training_block_item_id: string; athlete_id: string; score: number }[]) {
        (map[r.training_block_item_id] ??= {})[r.athlete_id] = Number(r.score)
      }
      setScores(map)
      setChecked(ch)
      setLoading(false)
    }
    load()
  }, [db, sid])

  // Athletes in every group of the pass (TG + FG), not only the first
  useEffect(() => {
    if (!profile?.club_id || !groupIds.length) return
    db.from('athletes').select('id, name').eq('club_id', profile.club_id).in('group_id', groupIds).order('name')
      .then(({ data: a }) => setAthletes(a ?? []))
  }, [db, profile?.club_id, groupIds])

  const blocks: SessionBlock[] = useMemo(() => rawBlocks.map(b => ({
    id: b.id, name: b.name, block_type: b.block_type ?? 'standard',
    items: [...b.training_block_items].sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0)).map(it => ({
      id: it.id,
      name: it.custom_name || it.library_item?.name || 'Övning',
      reps: it.reps ?? undefined, sets: it.sets ?? undefined, height: it.height ?? undefined,
      duration_seconds: it.duration_seconds ?? undefined, assigned_athlete_id: it.assigned_athlete_id,
      dive: it.library_item ? isDive({ type: it.library_item.type ?? '', groupId: it.library_item.category_id ?? null } as Parameters<typeof isDive>[0], libGroups) : false,
    })),
  })), [rawBlocks, libGroups])

  // ── Checks (saved) and the timer ──────────────────────────────────────────
  const writeCheck = (itemId: string, on: boolean) => {
    const apply = (value: boolean) => setChecked(prev => {
      const next = new Set(Array.from(prev))
      if (value) next.add(itemId)
      else next.delete(itemId)
      return next
    })
    apply(on)
    setCheck(db, sid, itemId, on).catch(() => apply(!on))
  }

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimer(null)
  }
  const startTimer = (itemId: string, seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimer({ itemId, remaining: seconds })
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (!prev) return null
        if (prev.remaining <= 1) {
          clearInterval(timerRef.current!)
          const done = prev.itemId
          queueMicrotask(() => writeCheck(done, true)) // outside the state updater
          return null
        }
        return { ...prev, remaining: prev.remaining - 1 }
      })
    }, 1000)
  }
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const toggle = (itemId: string) => {
    writeCheck(itemId, !checked.has(itemId))
    if (timer?.itemId === itemId) stopTimer()
  }

  // ── Scores ────────────────────────────────────────────────────────────────
  const athletesFor = (it: SessionItem) => (it.assigned_athlete_id ? athletes.filter(a => a.id === it.assigned_athlete_id) : athletes)
  const saveScores = async (item: SessionItem, values: Record<string, number>) => {
    const rows = Object.entries(values).map(([athlete_id, score]) => ({ session_id: sid, training_block_item_id: item.id, athlete_id, score }))
    if (!rows.length) return
    const { error: e } = await db.from('exercise_scores').upsert(rows, { onConflict: 'session_id,training_block_item_id,athlete_id' })
    if (e) throw new Error(e.message)
    setScores(prev => ({ ...prev, [item.id]: { ...prev[item.id], ...values } }))
  }

  // ── End ───────────────────────────────────────────────────────────────────
  const end = async () => {
    setEnding(true)
    setError(null)
    stopTimer()
    const now = new Date().toISOString()
    const [a, b] = await Promise.all([
      db.from('live_sessions').update({ status: 'ended', ended_at: now }).eq('id', sid),
      info?.trainingId
        ? db.from('trainings').update({ is_active: false, ended_at: now, status: 'completed' }).eq('id', info.trainingId)
        : Promise.resolve({ error: null }),
    ])
    const e = a.error ?? b.error
    if (e) { setError(e.message); setEnding(false); return }
    reload()
    router.push('/live')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const checkable = blocks.filter(b => b.block_type !== 'athlete').flatMap(b => b.items)
  const doneCount = checkable.filter(it => checked.has(it.id)).length
  const allDone = checkable.length > 0 && doneCount === checkable.length
  const running = info?.status === 'active'
  const group = pair ? pairGroups(data, pair) : info?.groupName ?? 'Pass'
  const line = pair ? pairNowLine(data, pair) : info?.groupName ?? ''

  const subText = (it: SessionItem) => {
    const time = it.duration_seconds != null && it.reps == null
    const amount = time ? `${Math.round((it.duration_seconds ?? 0) / 60)} min` : it.reps ? `${it.reps} ${it.dive ? 'hopp' : 'st'}` : ''
    return [it.sets ? `${it.sets} set` : '', amount, it.height ? `${it.height} m` : ''].filter(Boolean).join(' · ')
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', color: C.text, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.line}` }}>
        <button type="button" onClick={() => router.push('/live')} aria-label="Tillbaka till Live" style={iconButton}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>{group}</div>
          {info && (
            <div style={{ fontSize: 13, fontWeight: 700, color: running ? C.primary : C.muted }}>
              {running ? `Pågår · ${minutesSince(info.startedAt)} min` : 'Avslutat'}
            </div>
          )}
        </div>
      </header>

      <div style={{ flex: 1, padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading ? (
          <p style={{ margin: 0, fontSize: 15, color: C.muted, fontWeight: 500 }}>Hämtar passet …</p>
        ) : !info ? (
          <p style={{ margin: 0, fontSize: 15, color: C.muted, fontWeight: 500 }}>Passet finns inte.</p>
        ) : (
          <>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15 }}>{info.title ?? 'Fritt pass'}</h1>
              {line && <div style={{ fontSize: 14, fontWeight: 500, color: C.muted, marginTop: 2 }}>{line}</div>}
            </div>

            {!info.trainingId && <Card><p style={emptyText}>Inget innehåll är planerat för det här passet.</p></Card>}
            {info.trainingId && blocks.length === 0 && <Card><p style={emptyText}>Passet har inga övningar ännu.</p></Card>}

            {blocks.map(b => {
              if (b.block_type === 'athlete') {
                return (
                  <section key={b.id} style={sectionStyle}>
                    <h2 style={blockTitle}>{b.name}</h2>
                    <Card padding={8}>
                      <AthleteBlockLive block={b} athletes={athletes}
                        savedScores={Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Object.entries(v).map(([athleteId, score]) => ({ athleteId, score }))]))}
                        onScore={it => setScoring(b.items.find(x => x.id === it.id) ?? { ...it, dive: true })} />
                    </Card>
                  </section>
                )
              }
              const done = b.items.filter(it => checked.has(it.id)).length
              return (
                <section key={b.id} style={sectionStyle}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <h2 style={{ ...blockTitle, flex: 1 }}>{b.name}</h2>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{done} av {b.items.length}</span>
                  </div>
                  <div style={{ borderRadius: 18, background: '#fff', border: `1px solid ${C.line}`, padding: '0 12px 0 10px' }}>
                    {b.items.map((it, i) => {
                      const on = checked.has(it.id)
                      const time = it.duration_seconds != null && it.reps == null
                      const scored = Object.keys(scores[it.id] ?? {}).length
                      const timing = timer?.itemId === it.id
                      return (
                        <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', minHeight: 60, boxSizing: 'border-box', borderBottom: i < b.items.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                          <button type="button" onClick={() => toggle(it.id)} aria-pressed={on} aria-label={`${on ? 'Klar' : 'Markera klar'}: ${it.name}`} style={{
                            width: 44, height: 44, flex: 'none', borderRadius: 12, fontSize: 20, fontWeight: 800, padding: 0, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', color: '#fff', cursor: 'pointer',
                            background: on ? C.primary : '#fff', border: `2px solid ${on ? C.primary : '#B9C6D8'}`,
                          }}>✓</button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: on ? C.muted : C.text }}>{it.name}</div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, marginTop: 1 }}>{subText(it)}</div>
                          </div>
                          {time ? (
                            <button type="button" onClick={() => (timing ? stopTimer() : startTimer(it.id, it.duration_seconds ?? 0))} style={action(false)}>
                              {timing ? `Stoppa ${mmss(timer!.remaining)}` : 'Starta tid'}
                            </button>
                          ) : it.dive && athletesFor(it).length > 0 ? (
                            <button type="button" onClick={() => setScoring(it)} style={action(scored > 0)}>
                              {scored > 0 ? `Poäng ${scored} av ${athletesFor(it).length}` : 'Sätt poäng'}
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}

            {athletes.length > 0 && (
              <button type="button" onClick={() => setPickAthlete(true)} style={{ minHeight: 50, borderRadius: 14, border: `1.5px solid ${C.primary}`, background: '#fff', color: C.primary, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                + Lägg till hopp för en atlet
              </button>
            )}
            {note && <p role="status" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{note}</p>}

            {info.trainingId && athletes.length > 0 && (
              <section style={sectionStyle}>
                <button type="button" onClick={() => setShowLogging(s => !s)} aria-expanded={showLogging} style={{
                  display: 'flex', alignItems: 'center', minHeight: 48, padding: '0 16px', borderRadius: 18, border: `1px solid ${C.line}`,
                  background: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: C.text, cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ flex: 1 }}>Anteckningar per atlet</span>
                  <span aria-hidden style={{ fontSize: 20, color: '#8A96A8', transform: showLogging ? 'rotate(90deg)' : 'none' }}>›</span>
                </button>
                {showLogging && <AthleteLogging trainingId={info.trainingId} groupId={info.groupId} />}
              </section>
            )}
            {error && <p role="alert" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{error}</p>}
          </>
        )}
      </div>

      {info && running && (
        <div style={{ position: 'sticky', bottom: 0, padding: '12px 16px', background: '#fff', borderTop: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{doneCount} av {checkable.length} övningar klara</span>
            <span style={{ height: 6, borderRadius: 3, background: C.primarySoft, display: 'block', overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', borderRadius: 3, background: C.primary, width: `${checkable.length ? Math.round((doneCount / checkable.length) * 100) : 0}%` }} />
            </span>
          </div>
          <button type="button" onClick={end} disabled={ending} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 52, padding: '0 22px', borderRadius: 14,
            fontSize: 16, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', border: `1.5px solid ${C.primary}`,
            background: allDone ? C.primary : '#fff', color: allDone ? '#fff' : C.primary, opacity: ending ? 0.7 : 1,
          }}>{ending ? 'Avslutar …' : 'Avsluta pass'}</button>
        </div>
      )}

      {scoring && (
        <ScoreSheet title={scoring.name}
          sub={['Sätt poäng', scoring.height ? `${scoring.height} m` : '', scoring.reps ? `${scoring.reps} hopp` : ''].filter(Boolean).join(' · ')}
          athletes={athletesFor(scoring)} initial={scores[scoring.id] ?? {}}
          onSave={values => saveScores(scoring, values)} onClose={() => setScoring(null)} />
      )}

      {pickAthlete && (
        <BottomSheet title="Lägg till hopp för" onClose={() => setPickAthlete(false)}>
          <div style={{ borderRadius: 16, border: `1px solid ${C.line}`, padding: '0 16px' }}>
            {athletes.map((a, i) => (
              <button key={a.id} type="button" onClick={() => { setPickAthlete(false); setNote(null); setAddDiveFor(a) }} style={{
                width: '100%', display: 'flex', alignItems: 'center', minHeight: 52, background: 'none', border: 'none', padding: 0,
                boxShadow: i < athletes.length - 1 ? `inset 0 -1px 0 ${C.line}` : 'none', textAlign: 'left', fontFamily: 'inherit',
                fontSize: 15, fontWeight: 700, color: C.text, cursor: 'pointer',
              }}>
                <span style={{ flex: 1 }}>{a.name}</span>
                <span aria-hidden style={{ fontSize: 20, color: '#8A96A8' }}>›</span>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}

      {addDiveFor && (
        <>
          <Portal><div onClick={() => setAddDiveFor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(30,43,66,0.45)', zIndex: 300 }} /></Portal>
          <AddDiveSheet athleteId={addDiveFor.id} athleteName={addDiveFor.name} sessionId={sid}
            onClose={() => { setNote(`Hopp sparat för ${addDiveFor.name}.`); setAddDiveFor(null) }} />
        </>
      )}
    </div>
  )
}

interface RawBlock {
  id: string; name: string; sort_order: number | null; block_type: string | null
  training_block_items: {
    id: string; custom_name: string | null; reps: number | null; sets: number | null; height: string | null
    duration_seconds: number | null; sort_order: number | null; assigned_athlete_id: string | null
    library_item: { name: string; type: string | null; category_id: string | null } | null
  }[]
}

function Card({ children, padding }: { children: React.ReactNode; padding?: number }) {
  return <div style={{ borderRadius: 18, background: '#fff', border: `1px solid ${C.line}`, padding: padding ?? '0 16px' }}>{children}</div>
}

const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 }
const blockTitle: React.CSSProperties = { margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }
const emptyText: React.CSSProperties = { margin: 0, padding: '14px 0', fontSize: 15, color: C.muted, fontWeight: 500 }

const iconButton: React.CSSProperties = {
  width: 44, height: 44, flex: 'none', borderRadius: 12, border: `1px solid ${C.line}`, background: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer',
}

const action = (muted: boolean): React.CSSProperties => ({
  flex: 'none', minHeight: 44, display: 'flex', alignItems: 'center', border: 'none', background: 'none', padding: '0 2px',
  fontSize: 14, fontWeight: muted ? 600 : 700, color: muted ? C.muted : C.primary, fontFamily: 'inherit', cursor: 'pointer',
})
