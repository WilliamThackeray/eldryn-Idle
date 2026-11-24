import type { GoldDrop, ItemStack, LootEntry } from '../data/activities/types'
import type { Rng } from './rng'

export function rollLoot(table: LootEntry[] | undefined, rng: Rng, multiplier: number): ItemStack[] {
  if (!table || multiplier <= 0) return []
  const gained: ItemStack[] = []
  for (const entry of table) {
    if (entry.chance < 1 && rng() >= entry.chance) continue
    const quantity = rollQuantity(entry.min, entry.max, rng) * multiplier
    if (quantity <= 0) continue
    const existing = gained.find((stack) => stack.itemId === entry.itemId)
    if (existing) existing.quantity += quantity
    else gained.push({ itemId: entry.itemId, quantity })
  }
  return gained
}

export function rollGold(drop: GoldDrop | undefined, rng: Rng, multiplier: number): number {
  if (!drop || multiplier <= 0) return 0
  if (drop.chance != null && drop.chance < 1 && rng() >= drop.chance) return 0
  return rollQuantity(drop.min, drop.max, rng) * multiplier
}

/** Floor, then a seeded roll for the fraction. A whole multiplier does not roll. */
export function scaleQuantity(quantity: number, multiplier: number, rng: Rng): number {
  if (!(quantity > 0) || !(multiplier > 0)) return 0
  const scaled = quantity * multiplier
  const whole = Math.floor(scaled)
  const frac = scaled - whole
  if (frac === 0) return whole
  return whole + (rng() < frac ? 1 : 0)
}

function rollQuantity(min: number, max: number, rng: Rng): number {
  if (max <= min) return min
  return min + Math.floor(rng() * (max - min + 1))
}
