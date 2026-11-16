export const ITEM_CATEGORIES = ['material', 'food', 'potion', 'component', 'gear', 'ammo', 'currency', 'misc'] as const
export type ItemCategory = (typeof ITEM_CATEGORIES)[number]

export const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'very-rare', 'legendary', 'artifact'] as const
export type ItemRarity = (typeof ITEM_RARITIES)[number]

export interface ItemDef {
  id: string
  name: string
  description: string
  category: ItemCategory
  rarity: ItemRarity
  stackable: boolean
  sellValue: number
  tags?: string[]
}
