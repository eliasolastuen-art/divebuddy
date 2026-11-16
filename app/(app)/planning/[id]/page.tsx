'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PlanningFolder } from '@/types'
import TrainingEditor from '@/components/planning/TrainingEditor'
import BottomSheet, { linkButton } from '@/components/planning/BottomSheet'
import CopyToPassSheet from '@/components/planning/CopyToPassSheet'
import { useLibrary } from '@/components/library/useLibrary'
import { isDive } from '@/lib/library/queries'
import { fromRows, saveAsTemplate } from '@/lib/library/trainingSave'
import { useSchedule } from '@/lib/schedule/store'
import { mondayOf, todayISO, weekNumber, addDays } from '@/lib/schedule/format'
import { longDate, pairGroups, pairLayout, pairPasses, pairTime } from '@/lib/schedule/pairing'
import { passSummary } from '@/lib/schedule/trainingSummary'
import type { TrainingStatus } from '@/lib/schedule/types'
import { C } from '@/components/schedule/ui'

// Design PassetUtkast / PassetPublicerat / PassetKlart: one page per pass with
// its status, publish / unpublish and the content. Blocks are edited in the builder.

interface TrainingRow {
  id: string; club_id: string; title: string | null; status: string | null; updated_at: string
  folder_id: string | null; scheduled_date: string | null; start_time: string | null; end_time: string | null
  group_id: string | null; purpose: string | null; purpose_type: string | null; created_by: string | null
}

interface ItemRow {
  id: string; library_item_id: string | null; custom_name: string | null; sets: number | null; reps: number | null
  height: string | null; duration_seconds: number | null; notes: string | null; assigned_athlete_id: string | null
  library_item?: { id: string; name: string; code?: string | null; type?: string; category_id?: string | null; dd?: number | null } | null
}

interface BlockRow {
  id: string; category: string | null; name: string; notes: string | null; block_type: string | null; items: ItemRow[]
}

const toStatus = (s: string | null): TrainingStatus => (s === 'published' || s === 'completed' ? s : 'draft')

// "idag 21:42", "igår 08:10", "12 nov 21:42"
function savedText(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  const day = d.toLocaleDateString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const today = todayISO()
  if (day === today) return `idag ${time}`
  if (day === addDays(today, -1)) return `igår ${time}`
  return `${d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }).replace('.', '')} ${time}`
}

export default function TrainingPage() {
  const { id } = useParams()
  const trainingId = Array.isArray(id) ? id[0] : (id as string)
  const router = useRouter()
  const db = useMemo(() => createClient(), [])
  const { data, reload } = useSchedule()
  const { groups: libGroups } = useLibrary()

  const [training, setTraining] = useState<TrainingRow | null>(null)
  const [blocks, setBlocks] = useState<BlockRow[]>([])
  const [folders, setFolders] = useState<PlanningFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [menu, setMenu] = useState(false)
  const [copying, setCopying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: t }, { data: f }, { data: blockData }] = await Promise.all([
      db.from('trainings').select('*').eq('id', trainingId).maybeSingle(),
      db.from('planning_folders').select('*').order('sort_order'),
      db.from('training_blocks').select('*').eq('training_id', trainingId).order('sort_order'),
    ])
    setTraining((t as TrainingRow | null) ?? null)
    if (f) setFolders(f)
    const withItems = await Promise.all((blockData ?? []).map(block =>
      db.from('training_block_items').select('*, library_item:library_items(*)').eq('block_id', block.id).order('sort_order')
        .then(({ data: items }) => ({ ...block, items: (items ?? []) as ItemRow[] }) as BlockRow)))
    setBlocks(withItems)
    setLoading(false)
  }, [db, trainingId])

  useEffect(() => { load() }, [load])

  // ?edit=1 (from "Planera pass") opens the builder straight away
  useEffect(() => {
    if (!loading && training && new URLSearchParams(window.location.search).get('edit') === '1') {
      setShowEdit(true)
      router.replace(`/planning/${trainingId}`)
    }
  }, [loading, training]) // eslint-disable-line react-hooks/exhaustive-deps

  const pair = useMemo(() => pairPasses(data.passes).find(p => p.trainingId === trainingId) ?? null, [data.passes, trainingId])

  if (loading) return <Message>Hämtar passet …</Message>
  if (!training) return <Message>Passet finns inte längre.</Message>

  const status = toStatus(training.status)
  const date = pair?.date ?? training.scheduled_date
  const weekDate = date ?? todayISO()
  const backHref = `/planning?week=${mondayOf(weekDate)}`
  const groupsLabel = pair ? pairGroups(data, pair) : data.groups.find(g => g.id === training.group_id)?.name ?? null
  const time = pair ? pairTime(pair) : training.start_time ? pairTime({ start: training.start_time.slice(0, 5), end: training.end_time?.slice(0, 5) ?? '' }) : null
  const layout = pair ? pairLayout(data, pair) : null
  const saved = `Sparat ${savedText(training.updated_at)}.`

  const dive = (it: ItemRow) => it.library_item
    ? isDive({ type: it.library_item.type ?? '', groupId: it.library_item.category_id ?? null } as Parameters<typeof isDive>[0], libGroups)
    : false
  // Dives by their code ("101B - Forward Dive Pike" → "101B"); the code column is often empty or lacks the position
  const label = (it: ItemRow) => {
    const name = it.custom_name || it.library_item?.name || 'Övning'
    return (dive(it) && name.match(/^\d{3,4}[A-Da-d]\b/)?.[0]) || name
  }
  const summary = passSummary(blocks, dive)

  const setStatus = async (next: TrainingStatus) => {
    setBusy(true)
    setError(null)
    const { data: row, error: e } = await db.from('trainings').update({ status: next }).eq('id', trainingId).select('updated_at').single()
    if (e) setError(e.message)
    else setTraining(t => (t ? { ...t, status: next, updated_at: (row as { updated_at: string }).updated_at } : t))
    setBusy(false)
    reload()
  }

  return (
    <>
      <div style={{ maxWidth: 560, margin: '0 auto', color: C.text }}>
        <header style={{ height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.line}` }}>
          <Link href={backHref} aria-label="Tillbaka till veckan" style={iconButton}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
          </Link>
          <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Vecka {weekNumber(weekDate)}</div>
          <button type="button" onClick={() => setMenu(true)} aria-label="Mer" style={iconButton}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={C.text} aria-hidden><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
          </button>
        </header>

        <div style={{ padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>{date ? longDate(date) : 'Inget datum'}</div>
            {time && <h1 style={{ margin: '2px 0 0', fontSize: 30, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{time}</h1>}
            {groupsLabel && <div style={{ marginTop: 4, fontSize: 16, fontWeight: 700 }}>{groupsLabel}</div>}
            {layout && <div style={{ marginTop: 2, fontSize: 14, fontWeight: 500, color: C.muted }}>{layout}</div>}
          </div>

          {status === 'published' ? (
            <section style={{ borderRadius: 18, background: C.primarySoft, padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                <span style={{ flex: 1, fontSize: 19, fontWeight: 900, letterSpacing: '-0.02em', color: '#234E88' }}>Publicerat</span>
                <button type="button" disabled={busy} onClick={() => setStatus('draft')} style={{ minHeight: 44, border: 'none', background: 'none', padding: '0 2px', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#234E88', cursor: 'pointer' }}>
                  Avpublicera
                </button>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{groupsLabel ? `${groupsLabel} ser passet i sin app.` : 'Gruppen ser passet i sin app.'} {saved}</div>
            </section>
          ) : (
            <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.02em' }}>{status === 'draft' ? 'Utkast' : 'Klart'}</div>
                {status === 'draft' && <div style={{ fontSize: 14, fontWeight: 500, color: C.muted, marginTop: 2 }}>Bara tränare ser passet. {saved}</div>}
              </div>
              {status === 'draft' && (
                <button type="button" disabled={busy} onClick={() => setStatus('published')} style={{ ...filledButton, opacity: busy ? 0.7 : 1 }}>
                  {groupsLabel ? `Publicera för ${groupsLabel}` : 'Publicera'}
                </button>
              )}
              {status === 'completed' && (
                <button type="button" onClick={() => setCopying(true)} style={filledButton}>Kopiera till ett annat pass</button>
              )}
            </section>
          )}
          {error && <p role="alert" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{error}</p>}

          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Innehåll</h2>
            <div style={{ ...card, padding: '0 16px' }}>
              <div style={{ padding: '14px 0', borderBottom: blocks.length ? `1px solid ${C.line}` : 'none' }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>{training.title || 'Pass utan namn'}</div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.muted, marginTop: 2 }}>{blocks.length ? summary : 'Inga övningar än'}</div>
              </div>
              {blocks.map((b, i) => (
                <div key={b.id} style={{ padding: '12px 0', borderBottom: i < blocks.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{b.name}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: C.muted, marginTop: 2 }}>
                    {b.items.length ? Array.from(new Set(b.items.map(label))).join(', ') : 'Inga övningar'}
                  </div>
                </div>
              ))}
            </div>
            {status !== 'completed' && (
              <button type="button" onClick={() => setShowEdit(true)} style={status === 'published' ? filledButton : outlinedButton}>
                Redigera pass
              </button>
            )}
          </section>

          {pair && (
            <Link href={`/planning?week=${mondayOf(pair.date)}&pass=${pair.id}&edit=1`} style={{ alignSelf: 'center', minHeight: 44, display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 700, color: C.primary, textDecoration: 'none' }}>
              Ändra tid, tränare eller ställ in
            </Link>
          )}
        </div>
      </div>

      {menu && (
        <PassMenu
          onDuplicate={() => { setMenu(false); setCopying(true) }}
          onSaveTemplate={() => saveAsTemplate(db, training.title || 'Pass', training.group_id, fromRows(blocks).blocks)}
          onDelete={async () => {
            const { error: e } = await db.from('trainings').delete().eq('id', trainingId)
            if (e) throw new Error(e.code === '23503' ? 'Passet har körts live och kan inte tas bort.' : e.message)
            reload()
            router.replace(backHref)
          }}
          onClose={() => setMenu(false)}
        />
      )}

      {copying && (
        <CopyToPassSheet trainingId={trainingId} title={training.title || 'Pass'}
          groupId={training.group_id ?? pair?.groupIds[0] ?? null} onClose={() => setCopying(false)} />
      )}

      {showEdit && (
        <TrainingEditor
          folders={folders}
          existingTraining={training}
          existingBlocks={blocks}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); reload() }}
        />
      )}
    </>
  )
}

// ⋯: Duplicera (the copy sheet), Spara som mall, Ta bort
function PassMenu({ onDuplicate, onSaveTemplate, onDelete, onClose }: {
  onDuplicate: () => void
  onSaveTemplate: () => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>, done?: string) => {
    setBusy(true)
    setNote(null)
    try {
      await fn()
      if (done) setNote(done)
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Något gick fel')
    }
    setBusy(false)
  }

  return (
    <BottomSheet title={confirm ? 'Ta bort passet?' : 'Mer'} onClose={onClose}>
      {confirm ? (
        <>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: C.muted }}>Passet och dess övningar tas bort. Det går inte att ångra.</p>
          <button type="button" disabled={busy} onClick={() => run(onDelete)} style={{ ...filledButton, opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Tar bort …' : 'Ta bort'}
          </button>
          <button type="button" onClick={() => setConfirm(false)} style={{ ...linkButton, alignSelf: 'center' }}>Avbryt</button>
        </>
      ) : (
        <>
          <button type="button" disabled={busy} onClick={onDuplicate} style={menuRow}>Duplicera</button>
          <button type="button" disabled={busy} onClick={() => run(onSaveTemplate, 'Sparad som mall.')} style={menuRow}>Spara som mall</button>
          <button type="button" disabled={busy} onClick={() => setConfirm(true)} style={{ ...menuRow, borderBottom: 'none' }}>Ta bort</button>
        </>
      )}
      {note && <p role="status" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{note}</p>}
    </BottomSheet>
  )
}

function Message({ children }: { children: React.ReactNode }) {
  return <p style={{ maxWidth: 560, margin: '0 auto', padding: 24, fontSize: 15, color: C.muted, fontWeight: 500 }}>{children}</p>
}

const card: React.CSSProperties = { borderRadius: 18, background: '#fff', border: `1px solid ${C.line}` }

const iconButton: React.CSSProperties = {
  width: 44, height: 44, flex: 'none', borderRadius: 12, border: `1px solid ${C.line}`, background: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer',
}

const filledButton: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 52, borderRadius: 14,
  border: 'none', background: C.primary, color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
}

const outlinedButton: React.CSSProperties = { ...filledButton, border: `1.5px solid ${C.primary}`, background: '#fff', color: C.primary }

const menuRow: React.CSSProperties = {
  width: '100%', minHeight: 52, padding: '0 2px', border: 'none', borderBottom: `1px solid ${C.line}`, background: 'none',
  textAlign: 'left', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, color: C.text, cursor: 'pointer',
}
