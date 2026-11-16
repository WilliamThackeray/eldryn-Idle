import { COMPONENTS } from './components'
import { FOOD } from './food'
import { MATERIALS } from './materials'
import { MISC } from './misc'
import { POTIONS } from './potions'
import type { ItemDef } from './types'

export type { ItemCategory, ItemDef, ItemRarity } from './types'
export { ITEM_CATEGORIES, ITEM_RARITIES } from './types'

export const ITEMS = [...MATERIALS, ...FOOD, ...POTIONS, ...COMPONENTS, ...MISC] as const satisfies readonly ItemDef[]
export type ItemId = (typeof ITEMS)[number]['id']

const BY_ID = new Map<string, ItemDef>(ITEMS.map((item) => [item.id, item]))

export function isItemId(id: string): id is ItemId {
  return BY_ID.has(id)
}

export function getItem(id: string): ItemDef | undefined {
  return BY_ID.get(id)
}
