'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RunScore } from '@/lib/live/queries'
import BottomSheet from '@/components/planning/BottomSheet'
import { C } from '@/components/schedule/ui'

// "Visa poäng och anteckningar": a plain list per exercise and athlete from
// the latest run, plus the notes per athlete (session_logs, kept per pass).
export default function ResultsSheet({ trainingId, items, scores, onClose }: {
  trainingId: string
  items: { id: string; label: string }[] // in pass order
  scores: RunScore[]
  onClose: () => void
}) {
  const db = useMemo(() => createClient(), [])
  const [names, setNames] = useState<Record<string, string>>({})
  const [logs, setLogs] = useState<{ athleteId: string; score: number | null; notes: string | null }[]>([])

  useEffect(() => {
    db.from('session_logs').select('athlete_id, score, notes').eq('training_id', trainingId)
      .then(({ data }) => setLogs(((data ?? []) as { athlete_id: string; score: number | null; notes: string | null }[])
        .filter(l => l.score != null || l.notes).map(l => ({ athleteId: l.athlete_id, score: l.score, notes: l.notes }))))
  }, [db, trainingId])

  const athleteIds = useMemo(() => Array.from(new Set([...scores.map(s => s.athleteId), ...logs.map(l => l.athleteId)])), [scores, logs])
  useEffect(() => {
    if (!athleteIds.length) return
    db.from('athletes').select('id, name').in('id', athleteIds)
      .then(({ data }) => setNames(Object.fromEntries((data ?? []).map(a => [a.id, a.name]))))
  }, [db, athleteIds])

  const name = (id: string) => names[id] ?? '…'
  const fmt = (n: number) => n.toFixed(1).replace('.', ',')
  const scored = items.map(it => ({ ...it, rows: scores.filter(s => s.itemId === it.id).sort((a, b) => name(a.athleteId).localeCompare(name(b.athleteId), 'sv')) }))
    .filter(it => it.rows.length)

  return (
    <BottomSheet title="Poäng och anteckningar" onClose={onClose}>
      {scored.length === 0 && logs.length === 0 && (
        <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: C.muted }}>Inga poäng eller anteckningar sparades.</p>
      )}
      {scored.map(it => (
        <section key={it.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{it.label}</h3>
          <List rows={it.rows.map(r => ({ key: r.athleteId, name: name(r.athleteId), value: fmt(r.score), note: r.notes }))} />
        </section>
      ))}
      {logs.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Anteckningar per atlet</h3>
          <List rows={logs.map(l => ({ key: l.athleteId, name: name(l.athleteId), value: l.score != null ? fmt(Number(l.score)) : '', note: l.notes }))} />
        </section>
      )}
    </BottomSheet>
  )
}

function List({ rows }: { rows: { key: string; name: string; value: string; note: string | null }[] }) {
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${C.line}`, padding: '0 16px' }}>
      {rows.map((r, i) => (
        <div key={r.key} style={{ padding: '10px 0', borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{r.name}</span>
            <span style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
          </div>
          {r.note && <div style={{ fontSize: 13.5, fontWeight: 500, color: C.muted, marginTop: 2 }}>{r.note}</div>}
        </div>
      ))}
    </div>
  )
}
