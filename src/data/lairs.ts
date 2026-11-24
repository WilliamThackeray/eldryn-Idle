import {
  LAIR_ROCKS_DC,
  LAIR_ROCKS_DICE,
  LAIR_ROCKS_EVERY,
  LAIR_SPORES_DC,
  LAIR_SPORES_EVERY,
  LAIR_SPORES_HIT,
  LAIR_SPORES_INTERVALS,
  LAIR_WEB_EVERY,
  LAIR_WEB_SLOW,
} from '../engine/config'
import type { AbilityAbbr } from '../types/game'
import type { DamageType } from './items/types'
import type { BiomeId, MonsterDef } from './monsters/types'
import type { Tier } from './tiers'

export type LairEffect =
  | { type: 'damage'; save: AbilityAbbr; dc: number; dice: string; damageType: DamageType }
  | { type: 'debuff'; save: AbilityAbbr; dc: number; toHit: number; intervals: number }
  | { type: 'slow'; intervalPct: number }
  | { type: 'monsterBuff'; mod: string }

export interface LairAction {
  id: string
  name: string
  everyNIntervals: number
  effect: LairEffect
}

export interface LairDef {
  id: string
  name: string
  tier: Tier
  biome: BiomeId
  renownRequired: number
  monsterId: string
  lairActions: LairAction[]
}

/**
 * Lair monsters are hidden from Monster Hunting.
 * Stats start from SRD 5.2 and are raised for an elite farm.
 * Giant Spider: AC 14, HP 26, Bite +5 (1d8+3 piercing plus 2d6 poison).
 * Ogre: AC 11, HP 68, Greatclub +6 (2d8+4).
 * Ghast: AC 13, HP 36, Bite +5 (1d8+3 plus 2d8 necrotic), Claw +5 (2d6+3).
 */
export const LAIR_MONSTERS: MonsterDef[] = [
  {
    id: 'spider-matriarch',
    name: 'Spider Matriarch',
    creatureType: 'beast',
    size: 'large',
    cr: 2,
    ac: 16,
    hp: 45,
    reach: false,
    archetype: 'skirmisher',
    attacks: [{ name: 'Bite', toHit: 7, damage: '1d8+2d6+4', damageType: 'piercing' }],
    resistances: [],
    vulnerabilities: [],
    immunities: [],
    saveBonuses: { STR: 3, DEX: 4, CON: 2, INT: -4, WIS: 1, CHA: -3 },
    xp: 450,
    lootTable: [
      { itemId: 'hollow-cloak', chance: 0.08, min: 1, max: 1 },
      { itemId: 'hollow-gloves', chance: 0.08, min: 1, max: 1 },
      { itemId: 'cut-quartz', chance: 0.35, min: 1, max: 1 },
      { itemId: 'fire-essence', chance: 0.3, min: 1, max: 1 },
      { itemId: 'dire-wolf-pelt', chance: 0.12, min: 1, max: 1 },
      { itemId: 'spider-silk', chance: 0.8, min: 1, max: 2 },
    ],
    gold: { min: 2, max: 8 },
    biomes: ['forest'],
    tier: 1,
    lairOnly: true,
  },
  {
    id: 'ogre-chieftain',
    name: 'Ogre Chieftain',
    creatureType: 'giant',
    size: 'large',
    cr: 3,
    ac: 13,
    hp: 95,
    reach: false,
    archetype: 'standard',
    attacks: [{ name: 'Greatclub', toHit: 8, damage: '2d8+6', damageType: 'bludgeoning' }],
    resistances: [],
    vulnerabilities: [],
    immunities: [],
    saveBonuses: { STR: 5, DEX: -1, CON: 4, INT: -3, WIS: -2, CHA: -2 },
    xp: 700,
    lootTable: [
      { itemId: 'den-apron', chance: 0.08, min: 1, max: 1 },
      { itemId: 'den-ring', chance: 0.08, min: 1, max: 1 },
      { itemId: 'cut-amethyst', chance: 0.3, min: 1, max: 1 },
      { itemId: 'earth-essence', chance: 0.35, min: 1, max: 1 },
      { itemId: 'ogre-sinew', chance: 0.12, min: 1, max: 1 },
      { itemId: 'bones', chance: 1, min: 1, max: 2 },
    ],
    gold: { min: 4, max: 12 },
    biomes: ['hills'],
    tier: 2,
    lairOnly: true,
  },
  {
    id: 'drowned-ghast',
    name: 'Drowned Ghast',
    creatureType: 'undead',
    size: 'medium',
    cr: 3,
    ac: 14,
    hp: 52,
    reach: false,
    archetype: 'skirmisher',
    attacks: [
      { name: 'Bite', toHit: 6, damage: '1d8+2d8+3', damageType: 'necrotic' },
      { name: 'Claw', toHit: 6, damage: '2d6+4', damageType: 'slashing' },
    ],
    resistances: ['necrotic'],
    vulnerabilities: [],
    immunities: ['poison'],
    saveBonuses: { STR: 3, DEX: 3, CON: 1, INT: 0, WIS: 1, CHA: -1 },
    xp: 700,
    lootTable: [
      { itemId: 'crypt-circlet', chance: 0.07, min: 1, max: 1 },
      { itemId: 'crypt-gloves', chance: 0.07, min: 1, max: 1 },
      { itemId: 'cut-sapphire', chance: 0.25, min: 1, max: 1 },
      { itemId: 'shadow-essence', chance: 0.35, min: 1, max: 1 },
      { itemId: 'ghoul-ichor', chance: 0.12, min: 1, max: 1 },
      { itemId: 'bones', chance: 1, min: 1, max: 2 },
    ],
    gold: { min: 4, max: 14 },
    biomes: ['swamp'],
    tier: 3,
    lairOnly: true,
  },
]

export const LAIRS: readonly LairDef[] = [
  {
    id: 'spider-hollow',
    name: 'Spider Hollow',
    tier: 1,
    biome: 'forest',
    renownRequired: 1,
    monsterId: 'spider-matriarch',
    lairActions: [
      {
        id: 'clinging-webs',
        name: 'Clinging Webs',
        everyNIntervals: LAIR_WEB_EVERY,
        effect: { type: 'slow', intervalPct: LAIR_WEB_SLOW },
      },
    ],
  },
  {
    id: 'ogres-den',
    name: "Ogre's Den",
    tier: 2,
    biome: 'hills',
    renownRequired: 3,
    monsterId: 'ogre-chieftain',
    lairActions: [
      {
        id: 'falling-rocks',
        name: 'Falling Rocks',
        everyNIntervals: LAIR_ROCKS_EVERY,
        effect: { type: 'damage', save: 'DEX', dc: LAIR_ROCKS_DC, dice: LAIR_ROCKS_DICE, damageType: 'bludgeoning' },
      },
    ],
  },
  {
    id: 'drowned-crypt',
    name: 'Drowned Crypt',
    tier: 3,
    biome: 'swamp',
    renownRequired: 5,
    monsterId: 'drowned-ghast',
    lairActions: [
      {
        id: 'choking-spores',
        name: 'Choking Spores',
        everyNIntervals: LAIR_SPORES_EVERY,
        effect: { type: 'debuff', save: 'CON', dc: LAIR_SPORES_DC, toHit: LAIR_SPORES_HIT, intervals: LAIR_SPORES_INTERVALS },
      },
    ],
  },
]

const LAIR_BY_ID = new Map(LAIRS.map((lair) => [lair.id, lair]))

export function getLair(id: string): LairDef | undefined {
  return LAIR_BY_ID.get(id)
}
