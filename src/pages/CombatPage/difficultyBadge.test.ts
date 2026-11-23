import { expect, test } from 'vitest'
import { difficultyBadge } from './difficultyBadge'

test('difficulty badges label the existing hint, and split Hard into Deadly', () => {
  expect(difficultyBadge('Easy', 0.9, 40, 5).label).toBe('Trivial')
  expect(difficultyBadge('Even', 0.5, 30, 8).label).toBe('Even')
  expect(difficultyBadge('Hard', 0.35, 100, 40).label).toBe('Hard')
  expect(difficultyBadge('Hard', 0.2, 100, 10).label).toBe('Deadly')
  expect(difficultyBadge('Hard', 0.35, 50, 40).label).toBe('Deadly')
})
