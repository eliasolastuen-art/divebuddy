'use client'

import { Eye } from 'lucide-react'
import { useSchedule } from '@/lib/schedule/store'
import { setScope, setViewAs, useViewer } from '@/lib/schedule/viewer'
import { UI } from '@/lib/schedule/format'

// "Visa som" (preview as a coach) and "Mina grupper / Alla grupper" for admins
export default function ViewerBar({ showScope = true }: { showScope?: boolean }) {
  const { data } = useSchedule()
  const v = useViewer()
  if (!v.isAdmin) return null

  return (
    <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {data.staff.length > 0 && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '0 10px', borderRadius: 12, background: v.previewing ? '#FEF3C7' : 'rgba(0,0,0,0.04)', fontSize: 13, fontWeight: 600, color: v.previewing ? '#78350F' : UI.muted }}>
          <Eye size={15} aria-hidden />
          Visa som
          <select value={v.previewing ? v.me?.id : ''} onChange={e => setViewAs(e.target.value || null)}
            style={{ border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'inherit', minHeight: 36, cursor: 'pointer' }}>
            <option value="">Admin (du)</option>
            {data.staff.map(s => <option key={s.id} value={s.id}>{s.name} (tränare)</option>)}
          </select>
        </label>
      )}
      {showScope && !v.previewing && v.hasOwnGroups && (
        <div role="group" aria-label="Vilka grupper" style={{ display: 'inline-flex', padding: 3, borderRadius: 12, background: 'rgba(0,0,0,0.04)' }}>
          {(['mine', 'all'] as const).map(s => (
            <button key={s} aria-pressed={v.scope === s} onClick={() => setScope(s)} style={{
              minHeight: 34, padding: '0 12px', borderRadius: 9, border: 'none', fontFamily: 'inherit', cursor: 'pointer',
              background: v.scope === s ? '#fff' : 'transparent', color: v.scope === s ? UI.primary : UI.muted,
              fontSize: 13, fontWeight: 700, boxShadow: v.scope === s ? 'none' : 'none',
            }}>{s === 'mine' ? 'Mina grupper' : 'Alla grupper'}</button>
          ))}
        </div>
      )}
      {v.previewing && (
        <span style={{ fontSize: 12.5, color: '#92400E' }}>Du ser appen som {v.me?.name} ser den.</span>
      )}
    </div>
  )
}
