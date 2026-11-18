import { expect, test } from 'vitest'
import { addItems, hasItems, nextCount, removeItems, sellItems } from './inventory'

test('removeItems is all-or-nothing for a multi-item recipe', () => {
  const inventory = { 'iron-ore': 1 }

  expect(hasItems(inventory, [
    { itemId: 'iron-ore', quantity: 1 },
    { itemId: 'coal', quantity: 1 },
  ])).toBe(false)

  const next = removeItems(inventory, [
    { itemId: 'iron-ore', quantity: 1 },
    { itemId: 'coal', quantity: 1 },
  ])

  expect(next).toEqual({ 'iron-ore': 1 })
  expect(inventory).toEqual({ 'iron-ore': 1 })
})

test('removeItems takes every input and drops empty stacks', () => {
  const inventory = { 'iron-ore': 2, coal: 1 }
  const next = removeItems(inventory, [
    { itemId: 'iron-ore', quantity: 1 },
    { itemId: 'coal', quantity: 1 },
  ])

  expect(next).toEqual({ 'iron-ore': 1 })
  expect(inventory).toEqual({ 'iron-ore': 2, coal: 1 })
})

test('addItems sums stacks of the same item', () => {
  expect(
    addItems({ 'iron-ore': 1 }, [
      { itemId: 'iron-ore', quantity: 2 },
      { itemId: 'coal', quantity: 1 },
    ]),
  ).toEqual({ 'iron-ore': 3, coal: 1 })
})

test('a non-stackable item caps at one', () => {
  expect(nextCount(0, 5, false)).toBe(1)
  expect(nextCount(1, 1, false)).toBe(1)
  expect(nextCount(2, 3, true)).toBe(5)
})

test('selling a stack adds gold from sellValue and removes the items', () => {
  const sold = sellItems({ 'iron-ore': 4, coal: 1 }, 10, 'iron-ore')

  expect(sold.gold).toBe(10 + 4 * 2)
  expect(sold.inventory).toEqual({ coal: 1 })
})

test('sell price multiplier floors the bonus', () => {
  // iron-ore sellValue 2 × 1 × 1.05 = 2.1 → floor 2
  expect(sellItems({ 'iron-ore': 1 }, 0, 'iron-ore', 1, 1.05).gold).toBe(2)
  // 2 × 3 × 1.05 = 6.3 → 6
  expect(sellItems({ 'iron-ore': 3 }, 0, 'iron-ore', 3, 1.05).gold).toBe(6)
})
