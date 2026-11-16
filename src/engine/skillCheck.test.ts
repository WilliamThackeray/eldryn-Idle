import { expect, test } from 'vitest'
import { skillCheck, successChance } from './skillCheck'
import type { Rng } from './rng'
import { mulberry32 } from './rng'

function scripted(...values: number[]): Rng {
  let index = 0
  return () => values[index++]
}

const base = { abilityModifier: 0, skillLevel: 1, requiredLevel: 1 }

test('each skill-check outcome band is reachable and sets the multipliers', () => {
  expect(skillCheck({ rng: scripted(0.95), ...base })).toMatchObject({
    roll: 20,
    total: 22,
    dc: 10,
    outcome: 'critical',
    xpMultiplier: 1.5,
    itemMultiplier: 2,
    rareRoll: true,
    byproduct: false,
  })

  expect(skillCheck({ rng: scripted(0.45), ...base })).toMatchObject({
    roll: 10,
    total: 12,
    dc: 10,
    outcome: 'success',
    xpMultiplier: 1,
    itemMultiplier: 1,
    rareRoll: false,
    byproduct: false,
  })

  expect(skillCheck({ rng: scripted(0.2), ...base })).toMatchObject({
    roll: 5,
    total: 7,
    dc: 10,
    outcome: 'fail',
    xpMultiplier: 0.5,
    itemMultiplier: 0,
    rareRoll: false,
    byproduct: false,
  })

  expect(skillCheck({ rng: scripted(0, 0), ...base })).toMatchObject({
    roll: 1,
    total: 3,
    dc: 10,
    outcome: 'fumble',
    xpMultiplier: 0.25,
    itemMultiplier: 0,
    rareRoll: false,
    byproduct: true,
  })

  expect(skillCheck({ rng: scripted(0, 0.999), ...base }).byproduct).toBe(false)
})

test('success chance is the share of d20 faces that beat the activity DC', () => {
  expect(successChance(2, 1)).toBe(13 / 20)
  expect(successChance(0, 90)).toBe(2 / 20)
  expect(successChance(20, 1)).toBe(19 / 20)
})

test('a natural 1 is a fumble and a natural 20 is a critical', () => {
  expect(skillCheck({ rng: scripted(0), abilityModifier: 20, skillLevel: 99, requiredLevel: 1 }).outcome).toBe(
    'fumble',
  )
  expect(
    skillCheck({ rng: scripted(0.95), abilityModifier: 0, skillLevel: 1, requiredLevel: 90 }).outcome,
  ).toBe('critical')
})

test('the total adds the ability modifier and the skill tier proficiency', () => {
  expect(
    skillCheck({
      rng: scripted(0.45),
      abilityModifier: 5,
      skillLevel: 81,
      requiredLevel: 90,
    }),
  ).toMatchObject({ roll: 10, total: 21, dc: 19, outcome: 'success' })
})

test('advantage on a skill check keeps the higher d20', () => {
  expect(
    skillCheck({ rng: scripted(0, 0.95), mode: 'advantage', ...base }),
  ).toMatchObject({ roll: 20, outcome: 'critical' })
})

test('a seeded run reaches every outcome', () => {
  const rng = mulberry32(1)
  const seen = new Set<string>()
  for (let i = 0; i < 400; i++) {
    seen.add(skillCheck({ rng, ...base }).outcome)
  }
  expect([...seen].sort()).toEqual(['critical', 'fail', 'fumble', 'success'])
})
