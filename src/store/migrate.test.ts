import { expect, test } from 'vitest'
import { SAVE_VERSION, migrateSave } from './migrate'

test('an old save keeps real skill xp and drops weapon properties', () => {
  const next = migrateSave(
    {
      character: {
        name: 'ada',
        nonCombatSkills: [{ id: 'athletics', currentXP: 120 }],
        combatSkills: [{ id: 'finesse', currentXP: 50 }],
        inventory: [{ id: 'potion', name: 'Potion', quantity: 2, description: 'Heals' }],
      },
      lastSaved: '2020-01-01T00:00:00.000Z',
    },
    0,
  )

  expect(next.characterName).toBe('ada')
  expect(next.skills.athletics.xp).toBe(120)
  expect(next.skills.acrobatics.xp).toBe(0)
  expect('finesse' in next.skills).toBe(false)
  expect(next.inventory).toEqual([{ id: 'potion', name: 'Potion', quantity: 2, description: 'Heals' }])
  expect(next.lastSaved).toBe('2020-01-01T00:00:00.000Z')
})

test('a broken save resets to a fresh character', () => {
  const next = migrateSave('nope', 0)
  expect(next.characterName).toBe('bob')
  expect(next.skills.perception.xp).toBe(0)
  expect(next.skills.vitality).toEqual({ xp: 0 })
})

test('version 3 drops stored level and score and keeps vitality xp', () => {
  expect(SAVE_VERSION).toBe(3)

  const next = migrateSave(
    {
      characterName: 'ada',
      skills: {
        athletics: { xp: 83, level: 2, score: 18 },
        vitality: { xp: 40, level: 1, score: 10 },
      },
      abilityScores: { STR: 16 },
      inventory: [],
      lastSaved: '2020-01-01T00:00:00.000Z',
    },
    1,
  )

  expect(next.skills.athletics).toEqual({ xp: 83 })
  expect(next.skills.vitality).toEqual({ xp: 40 })
  expect('abilityScores' in next).toBe(false)
  expect('level' in next.skills.athletics).toBe(false)
  expect('score' in next.skills.athletics).toBe(false)
  expect(next.activeAction).toBeNull()
  expect(next.lastTick).toBeGreaterThan(Date.now() - 5_000)
})

test('version 3 keeps the active action and last tick', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { athletics: { xp: 10 } },
      inventory: [],
      lastSaved: '2020-01-01T00:00:00.000Z',
      lastTick: 1_000,
      activeAction: {
        kind: 'skill',
        skillId: 'athletics',
        activityId: 'basic',
        label: 'Basic Training',
        baseIntervalMs: 6000,
        requiredLevel: 1,
        baseXp: 10,
        progressMs: 1500,
      },
    },
    3,
  )

  expect(next.lastTick).toBe(1000)
  expect(next.activeAction).toMatchObject({ kind: 'skill', skillId: 'athletics', progressMs: 1500 })
})
