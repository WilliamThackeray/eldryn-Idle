import type { ItemStack, LootEntry } from './activities/types'
import type { BiomeId } from './monsters'

/** TODO(design): room placement (`after`) is not settled. */
export type DungeonRoom =
  | { kind: 'trap'; after: number; requiredLevel: number; damage: number }
  | { kind: 'secret'; after: number; requiredLevel: number; lootTable: LootEntry[] }

export interface DungeonDef {
  id: string
  name: string
  biome: BiomeId
  recommendedTier: number
  encounters: string[]
  boss: string
  chest: LootEntry[]
  /** Consumed once per run (including each loop after long rest). */
  entry?: ItemStack
  rooms?: DungeonRoom[]
  /** Hidden until this quest is accepted or complete. */
  requiresQuest?: string
}

export const DUNGEONS: DungeonDef[] = [
  {
    id: 'shifting-thicket',
    name: 'Shifting Thicket',
    biome: 'forest',
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
    id: 'hag-hollow',
    name: 'Hag Hollow',
    biome: 'swamp',
    recommendedTier: 5,
    encounters: ['ghoul', 'crocodile'],
    boss: 'green-hag',
    chest: [{ itemId: 'valuables', chance: 1, min: 1, max: 2 }],
    entry: { itemId: 'forged-writ', quantity: 1 },
  },
]

const BY_ID = new Map(DUNGEONS.map((d) => [d.id, d]))

export function getDungeon(id: string): DungeonDef | undefined {
  return BY_ID.get(id)
}

export function isDungeonId(id: string): boolean {
  return BY_ID.has(id)
}
