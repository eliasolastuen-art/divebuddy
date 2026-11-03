'use client'

import { useSchedule } from '@/lib/schedule/store'
import { cardStyle, UI } from '@/lib/schedule/format'
import { passCountByStaff } from '@/lib/schedule/select'
import { Chips, toggleIn } from './Sheet'

// Ledarlistan: which groups each coach works with ("mina grupper" in Planning)
export default function StaffAdmin() {
  const { data, setStaffGroups } = useSchedule()
  const counts = passCountByStaff(data)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13.5, color: UI.muted, lineHeight: 1.5 }}>
        Grupperna styr vad varje tränare ser under Planning och på Dashboard. De är förifyllda med de grupper personen har pass med i schemat.
      </p>
      {data.staff.map(s => (
        <div key={s.id} style={{ ...cardStyle, padding: 16, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span aria-hidden style={{ width: 40, height: 40, borderRadius: 12, background: s.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 17 }}>{s.name[0]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: UI.text }}>{s.name}</div>
              <div style={{ fontSize: 12.5, color: UI.muted }}>
                {counts[s.id]} pass i {data.term.name} · {s.profileId ? 'konto kopplat' : 'inget konto kopplat'}
              </div>
            </div>
          </div>
          <Chips label={`Grupper för ${s.name}`} options={data.groups} selected={s.groupIds}
            onToggle={id => setStaffGroups(s.id, toggleIn(s.groupIds, id))} />
        </div>
      ))}
      <p style={{ margin: 0, fontSize: 12.5, color: UI.muted }}>
        Att koppla en ledare till ett konto görs när personen bjuds in (kommer när schemat flyttas till databasen).
      </p>
    </div>
  )
}
