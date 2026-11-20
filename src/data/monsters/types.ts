import type { AbilityAbbr } from '../../types/game'
import type { GoldDrop, LootEntry } from '../activities/types'
import type { DamageType } from '../items/types'

export const BIOMES = ['forest', 'hills', 'swamp', 'quest'] as const
export type BiomeId = (typeof BIOMES)[number]

/** Biomes shown on the Monster Hunting tab. */
export const HUNT_BIOMES = ['forest', 'hills', 'swamp'] as const satisfies readonly BiomeId[]
export type HuntBiomeId = (typeof HUNT_BIOMES)[number]

export const CREATURE_TYPES = [
  'aberration',
  'beast',
  'celestial',
  'construct',
  'dragon',
  'elemental',
  'fey',
  'fiend',
  'giant',
  'humanoid',
  'monstrosity',
  'ooze',
  'plant',
  'undead',
] as const
export type CreatureType = (typeof CREATURE_TYPES)[number]

export const CREATURE_SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'] as const
export type CreatureSize = (typeof CREATURE_SIZES)[number]

export interface MonsterAttack {
  name: string
  toHit: number
  /** Dice notation including flat bonus, e.g. "1d6+2". */
  damage: string
  damageType: DamageType
}

export type MonsterArchetype = 'armored' | 'skirmisher' | 'warded' | 'standard'

export interface MonsterDef {
  id: string
  name: string
  creatureType: CreatureType
  size: CreatureSize
  /** Challenge rating as a number: 0, 0.125, 0.25, 0.5, 1, 2, 3… */
  cr: number
  ac: number
  hp: number
  /** True when the creature has Reach on its attacks. */
  reach: boolean
  /** Combat triangle role. Standard takes no style multiplier. */
  archetype: MonsterArchetype
  attacks: MonsterAttack[]
  resistances: readonly DamageType[]
  vulnerabilities: readonly DamageType[]
  immunities: readonly DamageType[]
  saveBonuses: Partial<Record<AbilityAbbr, number>>
  xp: number
  lootTable: LootEntry[]
  gold?: GoldDrop
  biomes: readonly BiomeId[]
  /** Rare spawn candidate for Rumor buffs. */
  rare?: boolean
}
