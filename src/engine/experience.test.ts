import { expect, test } from 'vitest'
import { describeXp, levelFromXp, xpToReachLevel } from './experience'

test('skill level follows the RuneScape curve', () => {
  expect(xpToReachLevel(1)).toBe(0)
  expect(xpToReachLevel(2)).toBe(83)
  expect(xpToReachLevel(99)).toBe(13_034_431)
  expect(levelFromXp(0)).toBe(1)
  expect(levelFromXp(82)).toBe(1)
  expect(levelFromXp(83)).toBe(2)
  expect(levelFromXp(13_034_431)).toBe(99)
  expect(describeXp(10)).toMatchObject({ level: 1, xp: 10, xpToNextLevel: 83, capped: false })
})
