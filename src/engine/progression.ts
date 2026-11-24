import { getItem } from '../data/items'
import { TIER_TABLE, itemTier, type TierRow } from '../data/tiers'
import type { Equipment } from './equipment'
import { baseItemId } from '../data/items/quality'
import type { Inventory } from './inventory'

const PIECES = ['helmet', 'chest', 'chaps', 'gauntlets', 'boots'] as const

export interface TierProgressGroup {
  label: string
  yours: string
  target: string
  have: number
  need: number
}

export interface TierProgress {
  row: TierRow
  zoneCleared: boolean
  dungeonCleared: boolean
  groups: TierProgressGroup[]
}

function ownedBaseIds(inventory: Inventory, equipment: Equipment): Set<string> {
  const owned = new Set<string>()
  for (const [id, qty] of Object.entries(inventory)) {
    if ((qty ?? 0) > 0) owned.add(baseItemId(id))
  }
  for (const id of Object.values(equipment)) {
    if (id) owned.add(baseItemId(id))
  }
  return owned
}

function bestName(owned: Set<string>, match: (item: NonNullable<ReturnType<typeof getItem>>) => boolean): string | null {
  let best: { name: string; sellValue: number } | null = null
  for (const id of owned) {
    const item = getItem(id)
    if (!item || !match(item)) continue
    if (!best || item.sellValue > best.sellValue) best = { name: item.name, sellValue: item.sellValue }
  }
  return best?.name ?? null
}

/** Best owned gear in each slot group against the tier's best, plus clear marks. */
export function tierProgress(input: {
  inventory: Inventory
  equipment: Equipment
  clearedDungeons: readonly string[]
  seenBiomes: readonly string[]
}): TierProgress[] {
  const owned = ownedBaseIds(input.inventory, input.equipment)
  return TIER_TABLE.map((row) => {
    const armorHave = PIECES.filter((slot) => owned.has(`${row.best.armor}-${slot}`)).length
    const robeHave = PIECES.filter((slot) => owned.has(`${row.best.robes}-${slot}`)).length
    const weapon = bestName(owned, (item) => Boolean(item.gear?.weapon) && itemTier(item) === row.tier)
    const armor = bestName(
      owned,
      (item) =>
        Boolean(item.tags?.includes('armor') && !item.tags.includes('caster') && itemTier(item) === row.tier),
    )
    const robes = bestName(
      owned,
      (item) => Boolean(item.tags?.includes('caster') && itemTier(item) === row.tier),
    )
    const dungeonCleared = input.clearedDungeons.includes(row.dungeon.id)
    return {
      row,
      dungeonCleared,
      zoneCleared: input.seenBiomes.includes(row.zone.biome) || dungeonCleared,
      groups: [
        {
          label: 'Weapon',
          yours: owned.has(row.best.weapon) ? row.best.weaponName : (weapon ?? '—'),
          target: row.best.weaponName,
          have: owned.has(row.best.weapon) ? 1 : 0,
          need: 1,
        },
        {
          label: 'Armor',
          yours: armorHave > 0 ? `${armorHave}/5` : (armor ?? '—'),
          target: row.best.armorName,
          have: armorHave,
          need: PIECES.length,
        },
        {
          label: 'Robes',
          yours: robeHave > 0 ? `${robeHave}/5` : (robes ?? '—'),
          target: row.best.robeName,
          have: robeHave,
          need: PIECES.length,
        },
      ],
    }
  })
}
