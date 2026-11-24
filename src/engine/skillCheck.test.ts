import { expect, test } from 'vitest'
import { getActivity } from '../data/activities'
import { initialSkillProgress } from '../data/skills'
import { emptyEquipment } from './equipment'
import { qualityOdds, skillCheck, tierChances, type BonusPart, type QualityTier } from './skillCheck'
import type { Rng } from './rng'
import { mulberry32 } from './rng'

function scripted(...values: number[]): Rng {
  let index = 0
  return () => values[index++] ?? 0
}

function parts(bonus: number): BonusPart[] {
  return [{ label: 'STR', value: bonus }]
}

const dc = 10

test('margin boundaries and XP multipliers', () => {
  expect(skillCheck({ rng: scripted(0.45), dc, parts: parts(0) })).toMatchObject({
    roll: 10,
    total: 10,
    tier: 'standard',
    xpMultiplier: 1,
  })
  expect(skillCheck({ rng: scripted(0.65), dc, parts: parts(0) })).toMatchObject({
    roll: 14,
    total: 14,
    tier: 'standard',
    xpMultiplier: 1,
  })
  expect(skillCheck({ rng: scripted(0.7), dc, parts: parts(0) })).toMatchObject({
    roll: 15,
    total: 15,
    tier: 'fine',
    xpMultiplier: 1.1,
  })
  expect(skillCheck({ rng: scripted(0.9), dc, parts: parts(0) })).toMatchObject({
    roll: 19,
    total: 19,
    tier: 'fine',
    xpMultiplier: 1.1,
  })
  expect(skillCheck({ rng: scripted(0.45), dc, parts: parts(10) })).toMatchObject({
    roll: 10,
    total: 20,
    tier: 'masterwork',
    xpMultiplier: 1.25,
  })
  expect(skillCheck({ rng: scripted(0.4), dc, parts: parts(10) })).toMatchObject({
    roll: 9,
    total: 19,
    tier: 'fine',
    xpMultiplier: 1.1,
  })
})

test('a natural 20 is exceptional only when the total meets the DC', () => {
  expect(skillCheck({ rng: scripted(0.95), dc, parts: parts(0) })).toMatchObject({
    roll: 20,
    total: 20,
    tier: 'exceptional',
    xpMultiplier: 1.5,
    rareRoll: true,
  })
  expect(skillCheck({ rng: scripted(0.95), dc: 25, parts: parts(0) })).toMatchObject({
    roll: 20,
    total: 20,
    tier: 'fail',
    xpMultiplier: 0.5,
    rareRoll: false,
  })
})

test('a natural 1 is a fumble even when the bonus would pass', () => {
  expect(skillCheck({ rng: scripted(0, 0), dc, parts: parts(30) })).toMatchObject({
    roll: 1,
    total: 31,
    tier: 'fumble',
    xpMultiplier: 0.25,
    byproduct: true,
  })
  expect(skillCheck({ rng: scripted(0, 0.999), dc, parts: parts(0) }).byproduct).toBe(false)
})

test('the total is the d20 plus each bonus part', () => {
  const bonusParts = [
    { label: 'STR', value: 3 },
    { label: 'Smithing', value: 4 },
    { label: "Smith's Gauntlets", value: 1 },
  ]
  expect(skillCheck({ rng: scripted(0.45), dc: 12, parts: bonusParts })).toMatchObject({
    roll: 10,
    total: 18,
    bonusParts,
    tier: 'fine',
  })
})

test('advantage keeps the higher d20', () => {
  expect(skillCheck({ rng: scripted(0, 0.95), mode: 'advantage', dc, parts: parts(0) })).toMatchObject({
    roll: 20,
    tier: 'exceptional',
  })
})

test('quality odds sum to 100 with and without advantage', () => {
  for (const mode of ['normal', 'advantage', 'disadvantage'] as const) {
    const odds = tierChances(2, 10, mode)
    const sum = Object.values(odds).reduce((total, value) => total + value, 0)
    expect(sum).toBe(100)
  }
  expect(tierChances(2, 10)).toEqual({
    fail: 30,
    fumble: 5,
    standard: 25,
    fine: 25,
    masterwork: 10,
    exceptional: 5,
  })
  expect(tierChances(0, 10, 'advantage').fumble).toBe(0.25)
})

test('level 1 smithing an iron longsword is mostly standard and fine', () => {
  const activity = getActivity('smithing', 'smith-longsword')
  expect(activity).toBeTruthy()
  const state = { skills: initialSkillProgress(), equipment: emptyEquipment() }
  const odds = qualityOdds(state, activity!)
  expect(odds.standard).toBe(25)
  expect(odds.fine).toBe(25)
  expect(odds.masterwork).toBe(10)
  expect(Object.values(odds).reduce((sum, value) => sum + value, 0)).toBe(100)

  const rng = mulberry32(7)
  const seen = new Set<QualityTier>()
  for (let i = 0; i < 50; i++) {
    const parts = [{ label: 'Smithing', value: 2 }]
    seen.add(skillCheck({ rng, dc: activity!.requiredLevel === 1 ? 10 : 10, parts }).tier)
  }
  expect(seen.has('standard')).toBe(true)
  expect(seen.has('fine')).toBe(true)
  expect(seen.has('masterwork')).toBe(true)
})
