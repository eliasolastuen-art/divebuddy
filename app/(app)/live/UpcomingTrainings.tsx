'use client'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import type { TrainingWithGroup } from './TodayTrainings'

const STATUS_STYLE = {
  draft:     { bg: 'rgba(100,116,139,0.1)', text: '#64748B', label: 'Utkast' },
  published: { bg: 'rgba(13,115,119,0.1)',  text: '#0D7377', label: 'Publicerad' },
  completed: { bg: 'rgba(22,163,74,0.1)',   text: '#16A34A', label: 'Genomförd' },
} as const

interface Props {
  trainings: TrainingWithGroup[]
}

export default function UpcomingTrainings({ trainings }: Props) {
  const router = useRouter()

  if (trainings.length === 0) {
    return (
      <p style={{ fontSize: 13, color: '#94A3B8', padding: '16px 0' }}>
        Inga kommande pass schemalagda.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {trainings.map(t => {
        const s = STATUS_STYLE[t.status] ?? STATUS_STYLE.draft
        const groupName = t.groups?.name
        const dateLabel = t.scheduled_date
          ? new Date(t.scheduled_date + 'T12:00:00').toLocaleDateString('sv-SE', {
              weekday: 'short', day: 'numeric', month: 'short',
            })
          : null

        return (
          <div
            key={t.id}
            onClick={() => router.push(`/planning/${t.id}`)}
            className="glass-card"
            style={{
              padding: '13px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              borderRadius: 16, cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {/* Date chip */}
            {dateLabel && (
              <div style={{
                flexShrink: 0,
                background: 'rgba(13,115,119,0.07)',
                borderRadius: 10, padding: '6px 10px',
                textAlign: 'center', minWidth: 52,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0D7377', lineHeight: 1.2 }}>
                  {dateLabel.split(' ')[0]}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                  {dateLabel.split(' ')[1]}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B', lineHeight: 1.2 }}>
                  {dateLabel.split(' ')[2]}
                </div>
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4, letterSpacing: '-0.01em' }}>
                {t.title}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  background: s.bg, color: s.text,
                  padding: '2px 8px', borderRadius: 9999,
                }}>
                  {s.label}
                </span>
                {groupName && (
                  <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                    {groupName}
                  </span>
                )}
              </div>
            </div>

            <ChevronRight size={15} color="#CBD5E1" strokeWidth={2.5} />
          </div>
        )
      })}
    </div>
  )
}
