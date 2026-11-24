import { scrollLootForMonster } from '../scrollLoot'
import { tierForBiome } from '../tiers'
import { FOREST_MONSTERS } from './forest'
import { HILLS_MONSTERS } from './hills'
import { QUEST_MONSTERS } from './quest'
import { SWAMP_MONSTERS } from './swamp'
import { BIOMES, type BiomeId, type MonsterDef } from './types'

export type {
  BiomeId,
  CreatureSize,
  CreatureType,
  HuntBiomeId,
  MonsterAttack,
  MonsterDef,
} from './types'
export { BIOMES, CREATURE_SIZES, CREATURE_TYPES, HUNT_BIOMES } from './types'

export const MONSTERS: MonsterDef[] = [
  ...FOREST_MONSTERS,
  ...HILLS_MONSTERS,
  ...SWAMP_MONSTERS,
  ...QUEST_MONSTERS,
].map((monster) => {
  const biome = monster.biomes.find((id) => id !== 'quest')
  const tier = biome ? tierForBiome(biome)?.tier : undefined
  return {
    ...monster,
    tier,
    lootTable: [...monster.lootTable, ...scrollLootForMonster(monster.id, tier ?? null)],
  }
})

const BY_ID = new Map(MONSTERS.map((monster) => [monster.id, monster]))

export function getMonster(id: string): MonsterDef | undefined {
  return BY_ID.get(id)
}

export function monstersForBiome(biome: BiomeId): MonsterDef[] {
  return MONSTERS.filter((monster) => monster.biomes.includes(biome))
}

export function isBiomeId(value: string): value is BiomeId {
  return (BIOMES as readonly string[]).includes(value)
}

export const BIOME_LABELS: Record<BiomeId, string> = {
  forest: 'Forest',
  hills: 'Hills',
  swamp: 'Swamp',
  underdark: 'Underdark',
  mountains: 'Mountains',
  quest: 'Quest',
}
