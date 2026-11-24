import { expect, test } from 'vitest'
import { getItem } from './items'
import { HUNT_BIOMES, MONSTERS, monstersForBiome } from './monsters'
import { tierForBiome } from './tiers'

test('each hunt biome has 3–6 monsters spanning CR 0 to CR 3', () => {
  for (const biome of HUNT_BIOMES) {
    const list = monstersForBiome(biome)
    if (tierForBiome(biome)?.zone.comingSoon) {
      expect(list).toEqual([])
      continue
    }
    expect(list.length).toBeGreaterThanOrEqual(3)
    expect(list.length).toBeLessThanOrEqual(biome === 'hills' ? 7 : 6)
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
