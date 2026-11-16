'use client'

import { Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import TermView, { type TermSub } from '../planning/schedule/TermView'
import StaffView from '../planning/schedule/StaffView'
import StaffAdmin from '../planning/schedule/StaffAdmin'
import ViewerBar from '../planning/schedule/ViewerBar'
import { SegTabs } from '../planning/schedule/ui'
import { useSchedule } from '@/lib/schedule/store'
import { useViewer } from '@/lib/schedule/viewer'
import { UI } from '@/lib/schedule/format'

type Tab = TermSub | 'tranare' | 'ledare'

// Schemaläggning: when, where and who. Admins edit, coaches read.
function SchemaContent() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { data } = useSchedule()
  const v = useViewer()

  const tabs: [Tab, string][] = [
    ['oversikt', 'Översikt'], ['grupp', 'Per grupp'], ['kalender', 'Kalender'], ['tranare', 'Tränare'],
    ...(v.canEditSchedule ? [['ledare', 'Ledare'] as [Tab, string]] : []),
  ]
  const raw = params.get('tab')
  const tab: Tab = tabs.some(([k]) => k === raw) ? (raw as Tab) : 'oversikt'
  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params.toString())
    next.set('tab', t)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: UI.text, letterSpacing: '-0.04em', margin: 0 }}>Schema</h1>
          <div style={{ fontSize: 13, fontWeight: 600, color: UI.muted, marginTop: 2 }}>
            {data.term.name} · {v.canEditSchedule ? 'du kan redigera' : 'endast läsning'}
          </div>
        </div>
        <button className="no-print" onClick={() => window.print()} style={{ minHeight: 44, padding: '0 14px', borderRadius: 12, border: '1px solid #E1E8F0', background: '#fff', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: UI.text, cursor: 'pointer' }}>
          <Printer size={16} /> Skriv ut
        </button>
      </div>

      <ViewerBar showScope={false} />
      <SegTabs label="Schemavy" value={tab} onChange={setTab} options={tabs} />

      {(tab === 'oversikt' || tab === 'grupp' || tab === 'kalender') && <TermView sub={tab} onSubChange={setTab} />}
      {tab === 'tranare' && <StaffView key={v.me?.id ?? 'none'} />}
      {tab === 'ledare' && v.canEditSchedule && <StaffAdmin />}
    </div>
  )
}

export default function SchemaPage() {
  return (
    <Suspense fallback={null}>
      <SchemaContent />
    </Suspense>
  )
}
