import { expect, test } from 'vitest'
import { mulberry32, type Rng } from './rng'
import { rollGold, rollLoot } from './loot'

function scripted(...values: number[]): Rng {
  let index = 0
  return () => values[index++] ?? 0
}

const iron = { itemId: 'iron-ore' as const, chance: 1, min: 1, max: 1 }
const coal = { itemId: 'coal' as const, chance: 0.5, min: 2, max: 3 }

test('a seeded rng rolls the same loot twice', () => {
  const wide = { itemId: 'iron-ore' as const, chance: 1, min: 1, max: 100 }
  expect(rollLoot([wide], mulberry32(1), 1)).toEqual(rollLoot([wide], mulberry32(1), 1))
  expect(rollLoot([wide], mulberry32(1), 1)).not.toEqual(rollLoot([wide], mulberry32(2), 1))
})

test('loot uses chance, a quantity range, and the skill-check multiplier', () => {
  expect(rollLoot([iron], scripted(), 2)).toEqual([{ itemId: 'iron-ore', quantity: 2 }])
  expect(rollLoot([coal], scripted(0.4, 0), 1)).toEqual([{ itemId: 'coal', quantity: 2 }])
  expect(rollLoot([coal], scripted(0.5), 1)).toEqual([])
  expect(rollLoot([iron], scripted(), 0)).toEqual([])
  expect(rollLoot([{ ...iron, min: 1, max: 2 }], scripted(0.99), 2)).toEqual([
    { itemId: 'iron-ore', quantity: 4 },
  ])
})

test('gold rolls a range and scales with the multiplier', () => {
  expect(rollGold({ min: 2, max: 5 }, scripted(0), 1)).toBe(2)
  expect(rollGold({ min: 2, max: 5 }, scripted(0.99), 2)).toBe(10)
  expect(rollGold({ min: 2, max: 5 }, scripted(), 0)).toBe(0)
  expect(rollGold(undefined, scripted(), 1)).toBe(0)
})
