'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user'
import { useSchedule } from '@/lib/schedule/store'
import { addDays, DAY_LONG, shortDate, todayISO, weekdayIndex } from '@/lib/schedule/format'
import { pairGroups, pairPasses, type PassPair } from '@/lib/schedule/pairing'
import { createTrainingForPass } from '@/lib/schedule/plan'
import { C } from '@/components/schedule/ui'
import BottomSheet from './BottomSheet'

// "Kopiera till ett annat pass" / "Duplicera": the group's scheduled passes
// without content in the coming four weeks. Tap → a draft copy, opened in the builder.
export default function CopyToPassSheet({ trainingId, title, groupId, onClose }: {
  trainingId: string
  title: string
  groupId: string | null // the pass's group; null shows every group's passes
  onClose: () => void
}) {
  const router = useRouter()
  const { profile } = useUser()
  const { data, reload } = useSchedule()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const today = todayISO()
  const options = useMemo(() => pairPasses(data.passes).filter(p =>
    p.date >= today && p.date <= addDays(today, 28) && !p.cancelled && !p.trainingId &&
    (!groupId || p.groupIds.includes(groupId))), [data.passes, today, groupId])

  const copy = async (p: PassPair) => {
    if (!profile?.club_id || busy) return
    setBusy(p.id)
    setError(null)
    try {
      const id = await createTrainingForPass(createClient(), {
        clubId: profile.club_id, profileId: profile.id, sessionIds: p.parts.map(x => x.id), groupId: p.groupIds[0] ?? null,
        date: p.date, start: p.start, end: p.end, title, source: { kind: 'copy', trainingId },
      })
      reload()
      router.push(`/planning/${id}?edit=1`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte kopiera passet')
      setBusy(null)
    }
  }

  return (
    <BottomSheet title="Kopiera till pass" onClose={() => !busy && onClose()}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: C.muted }}>Kommande pass utan innehåll, fyra veckor framåt. Kopian blir ett utkast.</p>
      {options.length === 0 ? (
        <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: C.muted }}>Inga kommande pass utan innehåll de närmaste fyra veckorna.</p>
      ) : (
        <div style={{ borderRadius: 18, border: `1px solid ${C.line}`, padding: '0 16px' }}>
          {options.map((p, i) => (
            <button key={p.id} type="button" disabled={!!busy} onClick={() => copy(p)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', minHeight: 56, background: 'none', border: 'none',
              borderBottom: i < options.length - 1 ? `1px solid ${C.line}` : 'none', textAlign: 'left', fontFamily: 'inherit', color: C.text,
              cursor: busy ? 'default' : 'pointer', opacity: busy && busy !== p.id ? 0.5 : 1,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{DAY_LONG[weekdayIndex(p.date)]} {shortDate(p.date)}{p.start ? ` ${p.start}` : ''}</div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.muted, marginTop: 2 }}>{busy === p.id ? 'Kopierar …' : pairGroups(data, p)}</div>
              </div>
              <span aria-hidden style={{ fontSize: 20, color: '#8A96A8', lineHeight: 1 }}>›</span>
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{error}</p>}
    </BottomSheet>
  )
}
