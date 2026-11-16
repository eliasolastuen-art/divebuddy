'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import WeekView from './schedule/WeekView'
import PeriodView from './schedule/PeriodView'
import BankView from './schedule/BankView'
import ViewerBar from './schedule/ViewerBar'
import { SegTabs } from './schedule/ui'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import { UI } from '@/lib/schedule/format'

type View = 'vecka' | 'period' | 'bank'

const VIEWS: [View, string][] = [['vecka', 'Vecka'], ['period', 'Period'], ['bank', 'Bank']]
// Old links: the schedule views moved to /schema, the old list to Bank → Arkiv
const MOVED: Record<string, string> = { termin: '/schema', tranare: '/schema?tab=tranare', pass: '/planning?view=bank' }

// Planning: the training for my groups — this week, the whole period, and a bank to reuse from
function PlanningContent() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { data } = useSchedule()
  const v = useViewer()

  const raw = params.get('view')
  useEffect(() => { if (raw && MOVED[raw]) router.replace(MOVED[raw]) }, [raw, router])
  const view: View = VIEWS.some(([k]) => k === raw) ? (raw as View) : 'vecka'

  const setView = (next: View) => {
    const p = new URLSearchParams()
    p.set('view', next)
    router.replace(`${pathname}?${p.toString()}`, { scroll: false })
  }

  const myGroups = data.groups.filter(g => v.groupIds.includes(g.id)).map(g => g.name).join(', ')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: UI.text, letterSpacing: '-0.04em', margin: 0 }}>Planning</h1>
        <div style={{ fontSize: 13, fontWeight: 600, color: UI.muted, marginTop: 2 }}>
          {v.scope === 'all' ? 'Alla grupper' : v.me ? `${v.me.name}s grupper: ${myGroups}` : myGroups}
        </div>
      </div>

      <ViewerBar />
      {!v.loading && !v.isAdmin && !v.me && (
        <p style={{ margin: 0, fontSize: 13, color: UI.muted }}>Ditt konto är inte kopplat till ledarlistan än, så du ser alla grupper.</p>
      )}

      <SegTabs label="Planeringsvy" value={view} onChange={setView} options={VIEWS} />

      {view === 'vecka' && <WeekView key={`${params.get('week') ?? ''}${params.get('pass') ?? ''}`} initialWeek={params.get('week')} initialPass={params.get('pass')} />}
      {view === 'period' && <PeriodView key={v.groupIds.join()} />}
      {view === 'bank' && <BankView />}
    </div>
  )
}

export default function PlanningPage() {
  return (
    <Suspense fallback={null}>
      <PlanningContent />
    </Suspense>
  )
}
