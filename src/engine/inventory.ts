import type { ItemStack } from '../data/activities/types'
import { getItem, withQuality, type ItemQuality } from '../data/items'

/** Sparse item counts. A missing key means zero. Keys may be quality variants. */
export type Inventory = Partial<Record<string, number>>

const QUALITY_CONSUME_ORDER: ItemQuality[] = ['standard', 'fine', 'masterwork', 'exceptional']

function variantIds(itemId: string): string[] {
  if (itemId.includes('@')) return [itemId]
  return QUALITY_CONSUME_ORDER.map((quality) => withQuality(itemId, quality))
}

/** Lowest quality first. A specific `@quality` id only draws that stack. Null when short. */
export function removalPlan(inventory: Inventory, stacks: ItemStack[]): ItemStack[] | null {
  const left: Inventory = { ...inventory }
  const taken: ItemStack[] = []
  for (const stack of stacks) {
    if (stack.quantity <= 0) continue
    let need = stack.quantity
    for (const id of variantIds(stack.itemId)) {
      const have = left[id] ?? 0
      if (have <= 0) continue
      const take = Math.min(have, need)
      taken.push({ itemId: id, quantity: take })
      const remain = have - take
      if (remain > 0) left[id] = remain
      else delete left[id]
      need -= take
      if (need === 0) break
    }
    if (need > 0) return null
  }
  return taken
}

function applyRemoval(inventory: Inventory, taken: ItemStack[]): Inventory {
  const next: Inventory = { ...inventory }
  for (const stack of taken) {
    const left = (next[stack.itemId] ?? 0) - stack.quantity
    if (left > 0) next[stack.itemId] = left
    else delete next[stack.itemId]
  }
  return next
}

export function nextCount(current: number, added: number, stackable: boolean): number {
  if (added <= 0) return current
  if (!stackable) return current > 0 ? current : 1
  return current + added
}

export function hasItems(inventory: Inventory, stacks: ItemStack[]): boolean {
  return removalPlan(inventory, stacks) != null
}

export function removeItems(inventory: Inventory, stacks: ItemStack[]): Inventory {
  const plan = removalPlan(inventory, stacks)
  if (!plan) return inventory
  return applyRemoval(inventory, plan)
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
  itemId: string,
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
