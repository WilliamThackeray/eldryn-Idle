import { expect, test } from 'vitest'
import { ACTIVITIES } from './activities'
import { DUNGEONS } from './dungeons'
import { getItem } from './items'
import { MONSTERS } from './monsters'
import { bestPieceIds, itemTier, monsterTier, tierForBiome, tierForDungeon, TIER_TABLE } from './tiers'

test('item tiers follow metal, set, and the spine table', () => {
  expect(itemTier(getItem('iron-bar'))).toBe(1)
  expect(itemTier(getItem('steel-bar'))).toBe(2)
  expect(itemTier(getItem('silver-bar'))).toBe(3)
  expect(itemTier(getItem('mithral-bar'))).toBe(4)
  expect(itemTier(getItem('adamantine-bar'))).toBe(5)
  expect(itemTier(getItem('studded-leather-chest'))).toBe(1)
  expect(itemTier(getItem('steel-chain-mail-chest'))).toBe(2)
  expect(itemTier(getItem('silk-chest'))).toBe(3)
  expect(tierForBiome('forest')?.tier).toBe(1)
  expect(tierForBiome('hills')?.tier).toBe(2)
  expect(tierForBiome('swamp')?.tier).toBe(3)
  expect(tierForBiome('underdark')?.zone.comingSoon).toBe(true)
  expect(monsterTier(MONSTERS.find((monster) => monster.id === 'dire-wolf')!)).toBe(1)
  expect(monsterTier(MONSTERS.find((monster) => monster.id === 'ogre')!)).toBe(2)
  expect(monsterTier(MONSTERS.find((monster) => monster.id === 'green-hag')!)).toBe(3)
  expect(tierForDungeon('shifting-thicket')?.tier).toBe(1)
  expect(DUNGEONS.find((dungeon) => dungeon.id === 'goblin-warren')?.tier).toBe(2)
  expect(tierForDungeon('hag-hollow')?.tier).toBe(3)
})

test('every tier I–III best recipe consumes a combat material that drops in that tier', () => {
  for (const row of TIER_TABLE.filter((entry) => entry.tier <= 3)) {
    const dropped = new Map<string, number>()
    for (const monster of MONSTERS) {
      if (monsterTier(monster) !== row.tier) continue
      for (const loot of monster.lootTable) dropped.set(loot.itemId, Math.max(dropped.get(loot.itemId) ?? 0, loot.chance))
    }
    for (const pieceId of bestPieceIds(row)) {
      const recipe = ACTIVITIES.find((activity) => activity.outputs[0]?.itemId === pieceId)
      expect(recipe, pieceId).toBeTruthy()
      const gate = recipe?.inputs?.find((stack) => dropped.has(stack.itemId))
      expect(gate?.itemId, pieceId).toBeTruthy()
    }
    const boss = row.sources.find((source) => source.boss)
    expect(boss).toBeTruthy()
    expect(dropped.get(boss!.id)).toBe(1)
    const usesBoss = bestPieceIds(row).some((pieceId) =>
      ACTIVITIES.some(
        (activity) =>
          activity.outputs[0]?.itemId === pieceId && activity.inputs?.some((stack) => stack.itemId === boss!.id),
      ),
    )
    expect(usesBoss, row.name).toBe(true)
  }
})
