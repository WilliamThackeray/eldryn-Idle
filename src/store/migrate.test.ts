import { expect, test } from 'vitest'
import { migrateSave } from './migrate'

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
})
