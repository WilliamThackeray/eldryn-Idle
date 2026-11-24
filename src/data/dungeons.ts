import type { ItemStack, LootEntry } from './activities/types'
import type { BiomeId } from './monsters'
import { scrollDropsForTier } from './scrollLoot'
import type { Tier } from './tiers'

/** TODO(design): room placement (`after`) is not settled. */
export type DungeonRoom =
  | { kind: 'trap'; after: number; requiredLevel: number; damage: number }
  | { kind: 'secret'; after: number; requiredLevel: number; lootTable: LootEntry[] }

export interface DungeonDef {
  id: string
  name: string
  biome: BiomeId
  /** Content tier from the spine. */
  tier: Tier
  /** Chest DC scale (required level = this × 5). Not the content tier. */
  recommendedTier: number
  /** Shown, but the run cannot be started. */
  comingSoon?: boolean
  encounters: string[]
  boss: string
  chest: LootEntry[]
  /** Consumed once per run (including each loop after long rest). */
  entry?: ItemStack
  rooms?: DungeonRoom[]
  /** Hidden until this quest is accepted or complete. */
  requiresQuest?: string
}

const DUNGEON_DEFS: DungeonDef[] = [
  {
    id: 'shifting-thicket',
    name: 'Shifting Thicket',
    biome: 'forest',
    tier: 1,
    recommendedTier: 2,
    encounters: ['wolf', 'dire-wolf'],
    boss: 'owlbear',
    requiresQuest: 'into-the-thicket',
    chest: [
      { itemId: 'hide', chance: 1, min: 1, max: 2 },
      { itemId: 'valuables', chance: 1, min: 1, max: 1 },
    ],
    rooms: [
      { kind: 'trap', after: 0, requiredLevel: 10, damage: 6 },
      {
        kind: 'secret',
        after: 1,
        requiredLevel: 10,
        lootTable: [{ itemId: 'valuables', chance: 1, min: 1, max: 1 }],
      },
    ],
  },
  {
    id: 'goblin-warren',
    name: 'Goblin Warren',
    biome: 'hills',
    tier: 2,
    recommendedTier: 3,
    encounters: ['goblin-warrior', 'hobgoblin'],
    boss: 'hobgoblin-captain',
    chest: [{ itemId: 'valuables', chance: 1, min: 1, max: 1 }],
  },
  {
    id: 'hag-hollow',
    name: 'Hag Hollow',
    biome: 'swamp',
    tier: 3,
    recommendedTier: 5,
    encounters: ['ghoul', 'crocodile'],
    boss: 'green-hag',
    chest: [{ itemId: 'valuables', chance: 1, min: 1, max: 2 }],
    entry: { itemId: 'forged-writ', quantity: 1 },
  },
  {
    id: 'deepvault',
    name: 'Deepvault',
    biome: 'underdark',
    tier: 4,
    recommendedTier: 12,
    comingSoon: true,
    encounters: [],
    boss: 'roper',
    chest: [{ itemId: 'valuables', chance: 1, min: 1, max: 1 }],
  },
  {
    id: 'dragons-roost',
    name: "Dragon's Roost",
    biome: 'mountains',
    tier: 5,
    recommendedTier: 16,
    comingSoon: true,
    encounters: [],
    boss: 'adult-red-dragon',
    chest: [{ itemId: 'valuables', chance: 1, min: 1, max: 1 }],
  },
]

export const DUNGEONS: DungeonDef[] = DUNGEON_DEFS.map((dungeon) => ({
  ...dungeon,
  chest: [...dungeon.chest, ...scrollDropsForTier(dungeon.tier)],
}))

const BY_ID = new Map(DUNGEONS.map((d) => [d.id, d]))

export function getDungeon(id: string): DungeonDef | undefined {
  return BY_ID.get(id)
}

export function isDungeonId(id: string): boolean {
  return BY_ID.has(id)
}
