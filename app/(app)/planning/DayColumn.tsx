'use client'
import { useDroppable } from '@dnd-kit/core'
import { toDateString } from '@/lib/utils/week'
import SessionCard, { type CalendarTraining } from './SessionCard'

const DAY_NAMES_SHORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

interface Props {
  date: Date
  dayIndex: number  // 0=Mon … 6=Sun
  trainings: CalendarTraining[]
  isToday: boolean
  onRefresh: () => void
}

export default function DayColumn({ date, dayIndex, trainings, isToday, onRefresh }: Props) {
  const dateStr = toDateString(date)

  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
    data: { date: dateStr },
  })

  return (
    <div
      style={{
        minWidth: 120,
        flexShrink: 0,
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Day header */}
      <div style={{
        marginBottom: 8, paddingBottom: 8,
        borderBottom: isToday
          ? '2px solid #2B5C9E'
          : '1px solid #E1E8F0',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800,
          color: isToday ? '#2B5C9E' : '#56637A',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {DAY_NAMES_SHORT[dayIndex]}
        </div>
        <div style={{
          fontSize: 18, fontWeight: 800,
          color: isToday ? '#2B5C9E' : '#1E2B42',
          letterSpacing: '-0.03em', lineHeight: 1,
          marginTop: 2,
        }}>
          {date.getDate()}
        </div>
      </div>

      {/* Droppable zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          minHeight: 80,
          borderRadius: 10,
          padding: 4,
          background: isOver ? 'rgba(43,92,158,0.06)' : 'transparent',
          border: isOver ? '1px dashed rgba(43,92,158,0.3)' : '1px solid transparent',
          transition: 'background 0.15s ease, border-color 0.15s ease',
        }}
      >
        {trainings.map(t => (
          <SessionCard key={t.id} training={t} onRefresh={onRefresh} />
        ))}
      </div>
    </div>
  )
}
