'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  weekOffset: number
  weekNumber: number
  onPrev: () => void
  onNext: () => void
}

export default function WeekNavigator({ weekOffset, weekNumber, onPrev, onNext }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 4px',
    }}>
      <button
        onClick={onPrev}
        style={{
          width: 36, height: 36, borderRadius: 11,
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0,0,0,0.08)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ChevronLeft size={18} color="#475569" strokeWidth={2.5} />
      </button>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
          v.{weekNumber}
        </div>
        {weekOffset === 0 && (
          <div style={{ fontSize: 11, fontWeight: 600, color: '#0D7377', marginTop: 1 }}>
            Denna vecka
          </div>
        )}
        {weekOffset < 0 && (
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginTop: 1 }}>
            {weekOffset === -1 ? 'Förra veckan' : `${Math.abs(weekOffset)} veckor sedan`}
          </div>
        )}
        {weekOffset > 0 && (
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginTop: 1 }}>
            {weekOffset === 1 ? 'Nästa vecka' : `Om ${weekOffset} veckor`}
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        style={{
          width: 36, height: 36, borderRadius: 11,
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0,0,0,0.08)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ChevronRight size={18} color="#475569" strokeWidth={2.5} />
      </button>
    </div>
  )
}
