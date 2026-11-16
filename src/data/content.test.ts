import { expect, test } from 'vitest'
import { ACTIVITIES, activitiesFor, getActivity } from './activities'
import { ITEMS, isItemId } from './items'
import { SKILLS } from './skills'

test('item ids are unique and gold is a counter, not an item', () => {
  const ids = ITEMS.map((item) => item.id)
  expect(new Set(ids).size).toBe(ids.length)
  expect(ids).not.toContain('gold')
  for (const item of ITEMS) {
    expect(item.sellValue).toBeGreaterThan(0)
    expect(Number.isInteger(item.sellValue)).toBe(true)
    expect(item.stackable).toBe(true)
  }
})

test('every skill has a level 1 activity and craft inputs are produced somewhere', () => {
  const ids = ACTIVITIES.map((activity) => activity.id)
  expect(new Set(ids).size).toBe(ids.length)

  for (const skill of SKILLS) {
    expect(activitiesFor(skill.id).some((activity) => activity.requiredLevel === 1)).toBe(true)
  }

  const produced = new Set(ACTIVITIES.flatMap((activity) => activity.outputs.map((entry) => entry.itemId)))
  for (const activity of ACTIVITIES) {
    for (const input of activity.inputs ?? []) expect(produced.has(input.itemId)).toBe(true)
    for (const entry of [...activity.outputs, ...(activity.rareTable ?? []), ...(activity.byproducts ?? [])]) {
      expect(isItemId(entry.itemId)).toBe(true)
      expect(entry.max).toBeGreaterThanOrEqual(entry.min)
      expect(entry.min).toBeGreaterThan(0)
      expect(entry.chance).toBeGreaterThan(0)
      expect(entry.chance).toBeLessThanOrEqual(1)
    }
  }
})

test('mining, steel, fishing, cooking, and the herb plot match the slice', () => {
  expect(activitiesFor('athletics').filter((activity) => activity.id.startsWith('mine-')).map((activity) => activity.requiredLevel)).toEqual([
    1, 15, 30, 40, 60, 80,
  ])

  expect(getActivity('athletics', 'smith-steel')).toMatchObject({
    requiredLevel: 15,
    inputs: [
      { itemId: 'iron-ore', quantity: 1 },
      { itemId: 'coal', quantity: 1 },
    ],
    outputs: [{ itemId: 'steel-bar' }],
  })

  expect(getActivity('survival', 'fish-forest')?.outputs[0]?.itemId).toBe('raw-forest-fish')
  expect(getActivity('nature', 'cook-forest-fish')?.inputs).toEqual([{ itemId: 'raw-forest-fish', quantity: 1 }])
  expect(getActivity('nature', 'herb-plot')?.baseIntervalMs).toBeGreaterThanOrEqual(10 * 60 * 1000)
  expect(getActivity('medicine', 'brew-healing')?.inputs).toEqual([{ itemId: 'forest-herbs', quantity: 1 }])
  expect(getActivity('sleightOfHand', 'trap-small')?.outputs.map((entry) => entry.itemId)).toEqual([
    'small-animal',
    'animal-scraps',
  ])
  expect(getActivity('survival', 'butcher-small')?.inputs).toEqual([{ itemId: 'small-animal', quantity: 1 }])
})
