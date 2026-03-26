'use client'
import { Star } from 'lucide-react'

interface Athlete { id: string; name: string }

interface SavedScore { athleteId: string; score: number }

interface Item { id: string; name: string }

interface Props {
  block: { id: string; name: string }
  items: Item[]
  athletes: Athlete[]
  savedScores: Record<string, SavedScore[]>
  onScore: (item: Item) => void
}

export default function CompetitionExerciseBlock({ block: _block, items, athletes, savedScores, onScore }: Props) {
  if (items.length === 0) {
    return (
      <div style={{ padding: '16px', fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
        Inga övningar tillagda i detta block
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(item => {
        const scores = savedScores[item.id] ?? []
        const scoredCount = scores.length
        const totalAthletes = athletes.length
        const allScored = scoredCount > 0 && scoredCount === totalAthletes

        return (
          <div
            key={item.id}
            className="glass-card"
            style={{ padding: 0, overflow: 'hidden' }}
          >
            {/* Exercise header row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px',
              borderBottom: athletes.length > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none',
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', flex: 1 }}>
                {item.name}
              </span>
              <button
                onClick={() => onScore(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 700,
                  background: allScored ? 'rgba(13,115,119,0.08)' : 'rgba(99,102,241,0.08)',
                  color: allScored ? '#0D7377' : '#6366F1',
                  border: `1px solid ${allScored ? 'rgba(13,115,119,0.2)' : 'rgba(99,102,241,0.2)'}`,
                  borderRadius: 9999, padding: '5px 10px', cursor: 'pointer',
                }}
              >
                <Star size={11} strokeWidth={allScored ? 2.5 : 2} fill={allScored ? '#0D7377' : 'none'} />
                {allScored ? `${scoredCount}/${totalAthletes}` : scoredCount > 0 ? `${scoredCount}/${totalAthletes}` : 'Scora'}
              </button>
            </div>

            {/* Athlete score rows */}
            {athletes.map((athlete, i) => {
              const athleteScore = scores.find(s => s.athleteId === athlete.id)
              return (
                <div
                  key={athlete.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 14px',
                    borderBottom: i < athletes.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                    background: athleteScore ? 'rgba(13,115,119,0.02)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 13, color: athleteScore ? '#0F172A' : '#94A3B8', fontWeight: athleteScore ? 600 : 400 }}>
                    {athlete.name}
                  </span>
                  {athleteScore ? (
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0D7377' }}>
                      {athleteScore.score} p
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#CBD5E1' }}>—</span>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
