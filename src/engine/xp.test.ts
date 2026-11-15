import { expect, test } from 'vitest'
import type { AbilityAbbr } from '../types/game'
import { applyXpModifiers, levelForXp, proficiency, progressToNext, tier, xpForLevel } from './xp'

test('level 2 needs 83 XP and level 99 needs 13,034,431', () => {
  expect(xpForLevel(1)).toBe(0)
  expect(xpForLevel(2)).toBe(83)
  expect(xpForLevel(99)).toBe(13_034_431)
})

test('levelForXp uses the XP table boundaries', () => {
  expect(levelForXp(0)).toBe(1)
  expect(levelForXp(82)).toBe(1)
  expect(levelForXp(83)).toBe(2)
  expect(levelForXp(xpForLevel(99) - 1)).toBe(98)
  expect(levelForXp(13_034_431)).toBe(99)
  expect(levelForXp(13_034_431 + 500)).toBe(99)
  expect(levelForXp(Number.NaN)).toBe(1)
  expect(levelForXp(-10)).toBe(1)

  for (let level = 1; level <= 99; level++) {
    expect(levelForXp(xpForLevel(level))).toBe(level)
  }
})

test('progressToNext reports XP toward the next level', () => {
  const early = progressToNext(10)
  expect(early).toMatchObject({ level: 1, xp: 10, xpToNextLevel: 83, capped: false })
  expect(early.progress).toBeCloseTo((10 / 83) * 100)

  expect(progressToNext(13_034_431)).toMatchObject({
    level: 99,
    xp: 13_034_431,
    xpToNextLevel: 13_034_431,
    progress: 100,
    capped: true,
  })
})

test('tier and proficiency at levels 1, 20, 21, 81, and 99', () => {
  expect(tier(1)).toBe(1)
  expect(tier(20)).toBe(4)
  expect(tier(21)).toBe(5)
  expect(tier(81)).toBe(17)
  expect(tier(99)).toBe(20)

  expect(proficiency(tier(1))).toBe(2)
  expect(proficiency(tier(20))).toBe(2)
  expect(proficiency(tier(21))).toBe(3)
  expect(proficiency(tier(81))).toBe(6)
  expect(proficiency(tier(99))).toBe(6)
})

test('class ability percents change XP and nothing else', () => {
  const modifiers: Partial<Record<AbilityAbbr, number>> = { STR: 0.3, INT: -0.15 }
  expect(applyXpModifiers(100, 'STR', modifiers)).toBe(130)
  expect(applyXpModifiers(100, 'INT', modifiers)).toBe(85)
  expect(applyXpModifiers(40, 'DEX', {})).toBe(40)
  expect(applyXpModifiers(40, 'DEX', { STR: 0.3 })).toBe(40)
})
