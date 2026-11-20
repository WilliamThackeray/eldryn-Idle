import { expect, test } from 'vitest'
import { sourcesOf } from '../engine/itemIndex'
import { ACTIVITIES, activitiesFor, getActivity } from './activities'
import { ITEMS, isItemId, type ItemId } from './items'
import { GENERAL_GOODS, SHOP_UPGRADES } from './shop'
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

test('smithing, fletching, and leatherworking craft gear', () => {
  expect(getActivity('athletics', 'smith-dagger')).toMatchObject({
    inputs: [{ itemId: 'iron-bar', quantity: 1 }],
    outputs: [{ itemId: 'dagger' }],
  })
  expect(getActivity('survival', 'fletch-arrows')).toMatchObject({
    inputs: [
      { itemId: 'logs', quantity: 1 },
      { itemId: 'iron-arrowhead', quantity: 1 },
    ],
    outputs: [{ itemId: 'arrows', min: 20, max: 20 }],
  })
  expect(getActivity('survival', 'leather-chest')).toMatchObject({
    inputs: [{ itemId: 'hide', quantity: 2 }],
    outputs: [{ itemId: 'leather-chest' }],
  })
})

test('every equippable item and every recipe input has a source', () => {
  for (const item of ITEMS) {
    if (!('gear' in item) || !item.gear) continue
    expect(sourcesOf(item.id as ItemId).length, item.id).toBeGreaterThan(0)
  }
  for (const activity of ACTIVITIES) {
    for (const input of activity.inputs ?? []) {
      expect(sourcesOf(input.itemId).length, `${activity.id}:${input.itemId}`).toBeGreaterThan(0)
    }
  }
})

test('material-tier longswords, chain mail, and arrowheads match MATERIAL_LEVEL', () => {
  const levels = [1, 15, 30, 60, 80]
  const swords = [
    'longsword',
    'steel-longsword',
    'silvered-longsword',
    'mithral-longsword',
    'adamantine-longsword',
  ]
  const tips = [
    'iron-arrowhead',
    'steel-arrowhead',
    'silvered-arrowhead',
    'mithral-arrowhead',
    'adamantine-arrowhead',
  ]
  for (let i = 0; i < levels.length; i++) {
    expect(getActivity('athletics', `smith-${swords[i]}`)?.requiredLevel).toBe(levels[i])
    expect(getActivity('athletics', `smith-${tips[i]}`)?.requiredLevel).toBe(levels[i])
  }
  expect(getActivity('athletics', 'smith-chain-mail-chest')?.requiredLevel).toBe(1)
  expect(getActivity('athletics', 'smith-steel-chain-mail-chest')?.requiredLevel).toBe(15)
  expect(getActivity('athletics', 'smith-silvered-chain-mail-chest')?.requiredLevel).toBe(30)
  expect(getActivity('athletics', 'smith-mithral-chain-mail-chest')?.requiredLevel).toBe(60)
  expect(getActivity('athletics', 'smith-adamantine-chain-mail-chest')?.requiredLevel).toBe(80)
})

test('general store sells commons and upgrades grant no items', () => {
  for (const good of GENERAL_GOODS) {
    const def = ITEMS.find((item) => item.id === good.itemId)
    expect(def?.category).not.toBe('gear')
    expect(def?.category).not.toBe('ammo')
  }
  for (const upgrade of SHOP_UPGRADES) {
    for (const tier of upgrade.tiers) {
      expect(tier.effect.kind).not.toBe('item')
    }
  }
})
