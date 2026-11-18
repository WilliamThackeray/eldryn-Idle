import type { ItemStack } from '../data/activities/types'
import { getItem, type ItemId } from '../data/items'

/** Sparse item counts. A missing key means zero. */
export type Inventory = Partial<Record<ItemId, number>>

export function nextCount(current: number, added: number, stackable: boolean): number {
  if (added <= 0) return current
  if (!stackable) return current > 0 ? current : 1
  return current + added
}

export function hasItems(inventory: Inventory, stacks: ItemStack[]): boolean {
  return stacks.every((stack) => stack.quantity <= 0 || (inventory[stack.itemId] ?? 0) >= stack.quantity)
}

export function removeItems(inventory: Inventory, stacks: ItemStack[]): Inventory {
  if (!hasItems(inventory, stacks)) return inventory
  const next: Inventory = { ...inventory }
  for (const stack of stacks) {
    if (stack.quantity <= 0) continue
    const left = (next[stack.itemId] ?? 0) - stack.quantity
    if (left > 0) next[stack.itemId] = left
    else delete next[stack.itemId]
  }
  return next
}

export function addItems(inventory: Inventory, stacks: ItemStack[]): Inventory {
  const next: Inventory = { ...inventory }
  for (const stack of stacks) {
    if (stack.quantity <= 0) continue
    const count = nextCount(next[stack.itemId] ?? 0, stack.quantity, getItem(stack.itemId)?.stackable !== false)
    if (count > 0) next[stack.itemId] = count
  }
  return next
}

export function sellItems(
  inventory: Inventory,
  gold: number,
  itemId: ItemId,
  quantity?: number,
  priceMultiplier = 1,
): { inventory: Inventory; gold: number } {
  const have = inventory[itemId] ?? 0
  const def = getItem(itemId)
  const qty = Math.min(have, Math.floor(quantity ?? have))
  if (!def || qty <= 0) return { inventory, gold }
  const next: Inventory = { ...inventory }
  const left = have - qty
  if (left > 0) next[itemId] = left
  else delete next[itemId]
  return { inventory: next, gold: gold + Math.floor(def.sellValue * qty * priceMultiplier) }
}
