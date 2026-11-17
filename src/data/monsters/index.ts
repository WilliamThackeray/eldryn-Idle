import { FOREST_MONSTERS } from './forest'
import { HILLS_MONSTERS } from './hills'
import { SWAMP_MONSTERS } from './swamp'
import { BIOMES, type BiomeId, type MonsterDef } from './types'

export type {
  BiomeId,
  CreatureSize,
  CreatureType,
  MonsterAttack,
  MonsterDef,
} from './types'
export { BIOMES, CREATURE_SIZES, CREATURE_TYPES } from './types'

export const MONSTERS: MonsterDef[] = [...FOREST_MONSTERS, ...HILLS_MONSTERS, ...SWAMP_MONSTERS]

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
}
