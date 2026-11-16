import type { SkillId } from '../skills'
import type { ItemId } from '../items'

export interface ItemStack {
  itemId: ItemId
  quantity: number
}

export interface LootEntry {
  itemId: ItemId
  chance: number
  min: number
  max: number
}

export interface GoldDrop {
  min: number
  max: number
  chance?: number
}

export interface ActivityDef {
  id: string
  skillId: SkillId
  name: string
  description: string
  requiredLevel: number
  baseIntervalMs: number
  xp: number
  inputs?: ItemStack[]
  outputs: LootEntry[]
  rareTable?: LootEntry[]
  byproducts?: LootEntry[]
  gold?: GoldDrop
  kind: 'gather' | 'craft' | 'train'
}
