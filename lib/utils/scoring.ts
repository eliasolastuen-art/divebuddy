export interface ScoringResult {
  rawScores: number[]
  judgeCount: number
  dd: number
  finalScore: number
}

export function calculateScore(scores: number[], dd: number): ScoringResult {
  if (scores.length === 0 || dd <= 0) {
    return { rawScores: scores, judgeCount: scores.length, dd, finalScore: 0 }
  }

  let used = [...scores]

  if (scores.length >= 5) {
    const sorted = [...scores].sort((a, b) => a - b)
    used = sorted.slice(1, sorted.length - 1)
  }

  const average = used.reduce((a, b) => a + b, 0) / used.length
  const finalScore = Math.round(average * dd * 100) / 100

  return { rawScores: scores, judgeCount: scores.length, dd, finalScore }
}