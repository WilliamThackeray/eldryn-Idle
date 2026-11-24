import { ACCESSORIES } from './accessories'
import { AMMO } from './ammo'
import { ARMOR } from './armor'
import { COMPONENTS } from './components'
import { ENCHANTED } from './enchanted'
import { FOOD } from './food'
import { KNOWLEDGE } from './knowledge'
import { MATERIALS } from './materials'
import { MISC } from './misc'
import { POTIONS } from './potions'
import { SKILLING_GEAR } from './skillingGear'
import { SUMMONS } from './summons'
import { WEAPONS } from './weapons'
import type { ItemDef } from './types'

export type {
  ArmorWeightClass,
  DamageType,
  GearBlock,
  GearMaterial,
  GearSlot,
  ItemCategory,
  ItemDef,
  ItemRarity,
  ItemStats,
  SummonStats,
  WeaponGear,
  WeaponMastery,
  WeaponProperty,
} from './types'
export {
  ARMOR_WEIGHT_CLASSES,
  DAMAGE_TYPES,
  GEAR_MATERIALS,
  GEAR_SLOTS,
  ITEM_CATEGORIES,
  ITEM_RARITIES,
  WEAPON_MASTERIES,
  WEAPON_PROPERTIES,
  magicBonusForRarity,
} from './types'

export const ITEMS = [
  ...MATERIALS,
  ...FOOD,
  ...POTIONS,
  ...COMPONENTS,
  ...MISC,
  ...KNOWLEDGE,
  ...WEAPONS,
  ...ARMOR,
  ...ACCESSORIES,
  ...AMMO,
  ...ENCHANTED,
  ...SUMMONS,
  ...SKILLING_GEAR,
] as const satisfies readonly ItemDef[]
export type ItemId = (typeof ITEMS)[number]['id']

const BY_ID = new Map<string, ItemDef>(ITEMS.map((item) => [item.id, item]))

export function isItemId(id: string): id is ItemId {
  return BY_ID.has(id)
}

export function getItem(id: string): ItemDef | undefined {
  return BY_ID.get(id)
}
