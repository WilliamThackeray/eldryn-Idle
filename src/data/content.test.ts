import { expect, test } from 'vitest'
import { sourcesOf } from '../engine/itemIndex'
import { ACTIVITIES, activitiesFor, getActivity } from './activities'
import { CLASSES, TRADITION_REAGENT } from './classes'
import { themedItemFor, TOME_SKILLS } from './historyContent'
import { ITEMS, isItemId, type ItemId } from './items'
import { TOME_VOLUME_LEVELS } from './items/knowledge'
import { MONSTERS } from './monsters'
import { GENERAL_GOODS, SHOP_UPGRADES } from './shop'
import { SKILLS } from './skills'
import { SPELLS } from './spells'

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

  expect(activitiesFor('vitality')).toEqual([])
  for (const skill of SKILLS) {
    if (skill.id === 'vitality') continue
    expect(activitiesFor(skill.id).length).toBeGreaterThan(0)
    const minLevel = Math.min(...activitiesFor(skill.id).map((activity) => activity.requiredLevel))
    expect(minLevel, skill.id).toBeLessThanOrEqual(skill.id === 'binding' ? 10 : 1)
  }

  const produced = new Set([
    ...ACTIVITIES.flatMap((activity) =>
      [...activity.outputs, ...(activity.rareTable ?? []), ...(activity.byproducts ?? [])].map(
        (entry) => entry.itemId,
      ),
    ),
    ...MONSTERS.flatMap((monster) => monster.lootTable.map((entry) => entry.itemId)),
    ...GENERAL_GOODS.map((good) => good.itemId),
  ])
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
  expect(activitiesFor('mining').filter((activity) => activity.id.startsWith('mine-')).map((activity) => activity.requiredLevel)).toEqual([
    1, 15, 30, 40, 60, 80,
  ])

  expect(getActivity('smithing', 'smith-steel')).toMatchObject({
    requiredLevel: 15,
    inputs: [
      { itemId: 'iron-ore', quantity: 1 },
      { itemId: 'coal', quantity: 1 },
    ],
    outputs: [{ itemId: 'steel-bar' }],
  })

  expect(getActivity('fishing', 'fish-forest')?.outputs[0]?.itemId).toBe('raw-forest-fish')
  expect(getActivity('cooking', 'cook-forest-fish')?.inputs).toEqual([{ itemId: 'raw-forest-fish', quantity: 1 }])
  expect(getActivity('foraging', 'herb-plot')?.baseIntervalMs).toBeGreaterThanOrEqual(10 * 60 * 1000)
  expect(getActivity('alchemy', 'brew-healing')?.inputs).toEqual([{ itemId: 'forest-herbs', quantity: 1 }])
  expect(getActivity('hunting', 'trap-small')?.outputs.map((entry) => entry.itemId)).toEqual([
    'small-animal',
    'animal-scraps',
  ])
  expect(getActivity('hunting', 'butcher-small')?.inputs).toEqual([{ itemId: 'small-animal', quantity: 1 }])
})

test('smithing, fletching, and leatherworking craft gear', () => {
  expect(getActivity('smithing', 'smith-dagger')).toMatchObject({
    inputs: [{ itemId: 'iron-bar', quantity: 1 }],
    outputs: [{ itemId: 'dagger' }],
  })
  expect(getActivity('woodcraft', 'fletch-arrows')).toMatchObject({
    inputs: [
      { itemId: 'logs', quantity: 1 },
      { itemId: 'iron-arrowhead', quantity: 1 },
    ],
    outputs: [{ itemId: 'arrows', min: 20, max: 20 }],
  })
  expect(getActivity('leatherworking', 'leather-chest')).toMatchObject({
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
    expect(getActivity('smithing', `smith-${swords[i]}`)?.requiredLevel).toBe(levels[i])
    expect(getActivity('smithing', `smith-${tips[i]}`)?.requiredLevel).toBe(levels[i])
  }
  expect(getActivity('smithing', 'smith-chain-mail-chest')?.requiredLevel).toBe(1)
  expect(getActivity('smithing', 'smith-steel-chain-mail-chest')?.requiredLevel).toBe(15)
  expect(getActivity('smithing', 'smith-silvered-chain-mail-chest')?.requiredLevel).toBe(30)
  expect(getActivity('smithing', 'smith-mithral-chain-mail-chest')?.requiredLevel).toBe(60)
  expect(getActivity('smithing', 'smith-adamantine-chain-mail-chest')?.requiredLevel).toBe(80)
})

test('every spell component and tradition reagent has a source', () => {
  for (const spell of SPELLS) {
    for (const stack of spell.components) {
      expect(sourcesOf(stack.itemId).length, `${spell.id}:${stack.itemId}`).toBeGreaterThan(0)
    }
  }
  for (const reagent of Object.values(TRADITION_REAGENT)) {
    expect(sourcesOf(reagent).length, reagent).toBeGreaterThan(0)
  }
  for (const cls of CLASSES) {
    if (cls.spellcasting.casterType === 'none') continue
    expect(sourcesOf(TRADITION_REAGENT[cls.spellcasting.tradition]).length).toBeGreaterThan(0)
  }
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

test('History tomes use themed skill items and Chronicles can drop Ancient Pages', () => {
  expect(getActivity('scribing', 'craft-tome-smithing-3')?.inputs).toEqual(
    expect.arrayContaining([
      { itemId: 'ancient-page', quantity: 3 },
      { itemId: 'ink', quantity: 1 },
      { itemId: 'steel-bar', quantity: 1 },
    ]),
  )
  expect(themedItemFor('smithing', 20)).toBe('steel-bar')
  expect(getActivity('scribing', 'chronicles')?.outputs.some((entry) => entry.itemId === 'ancient-page')).toBe(
    true,
  )
  expect(getActivity('scribing', 'craft-ink')?.inputs).toEqual([
    { itemId: 'forest-herbs', quantity: 1 },
    { itemId: 'coal', quantity: 1 },
  ])

  const producedBySkill = (skillId: string) =>
    new Set(
      activitiesFor(skillId as (typeof SKILLS)[number]['id']).flatMap((activity) =>
        activity.outputs.map((entry) => entry.itemId),
      ),
    )
  const FALLBACK_THEMED = new Set(['arrows', 'hide', 'gem', 'forest-herbs', 'eggs'])
  for (const skillId of TOME_SKILLS) {
    const produced = producedBySkill(skillId)
    for (const level of TOME_VOLUME_LEVELS) {
      const themed = themedItemFor(skillId, level)
      if (FALLBACK_THEMED.has(themed)) continue
      expect(produced.has(themed), `${skillId} @${level} → ${themed}`).toBe(true)
    }
  }
})
