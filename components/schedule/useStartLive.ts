'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/context/user'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import type { PassPair } from '@/lib/schedule/pairing'

// "Starta live" from a scheduled pass: creates a live_sessions row with the
// pass's training (or a free pass), its first group and the pass itself,
// marks me present, and opens the session. Continues it if already running.
export function useStartLive() {
  const router = useRouter()
  const { profile } = useUser()
  const { startLive } = useSchedule()
  const { me } = useViewer()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async (pair: PassPair) => {
    const running = pair.parts.find(p => p.live?.status === 'active')?.live
    if (running) { router.push(`/live/session/${running.id}`); return }
    if (!profile) return
    setStarting(true)
    setError(null)
    try {
      const id = await startLive({
        profileId: profile.id,
        passIds: pair.parts.map(p => p.id),
        groupId: pair.groupIds[0] ?? null,
        trainingId: pair.trainingId,
        staffId: me?.id ?? null,
      })
      router.push(`/live/session/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte starta passet')
      setStarting(false)
    }
  }

  return { start, starting, error }
}
