export function difficultyBadge(
  hint: 'Easy' | 'Even' | 'Hard',
  chance: number,
  playerHp: number,
  avgDamage: number,
): { label: 'Trivial' | 'Even' | 'Hard' | 'Deadly'; tone: 'easy' | 'even' | 'hard' | 'deadly' } {
  if (hint === 'Easy') return { label: 'Trivial', tone: 'easy' }
  if (hint === 'Even') return { label: 'Even', tone: 'even' }
  // Display split of the existing Hard bucket. Combat math is unchanged.
  if (chance < 0.25 || avgDamage * 2 >= playerHp) return { label: 'Deadly', tone: 'deadly' }
  return { label: 'Hard', tone: 'hard' }
}
