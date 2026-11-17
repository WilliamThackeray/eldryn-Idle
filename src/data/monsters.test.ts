import { expect, test } from 'vitest'
import { getItem } from './items'
import { BIOMES, MONSTERS, monstersForBiome } from './monsters'

test('each biome has 3–5 monsters spanning CR 0 to CR 3', () => {
  for (const biome of BIOMES) {
    const list = monstersForBiome(biome)
    expect(list.length).toBeGreaterThanOrEqual(3)
    expect(list.length).toBeLessThanOrEqual(5)
    const crs = list.map((monster) => monster.cr)
    expect(Math.min(...crs)).toBe(0)
    expect(Math.max(...crs)).toBe(3)
  }
})

test('every monster loot id exists in the item registry', () => {
  for (const monster of MONSTERS) {
    for (const entry of monster.lootTable) {
      expect(getItem(entry.itemId), entry.itemId).toBeDefined()
    }
  }
})

test('seeded biomes include the planned SRD creatures', () => {
  expect(MONSTERS.map((monster) => monster.id)).toEqual(
    expect.arrayContaining([
      'deer',
      'wolf',
      'owlbear',
      'goblin-warrior',
      'ogre',
      'ghoul',
      'green-hag',
      'crocodile',
    ]),
  )
  expect(MONSTERS.find((monster) => monster.id === 'ghoul')?.immunities).toContain('poison')
})
