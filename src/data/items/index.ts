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
import { applyQuality, bindItemCatalog, bindItemLookup, parseItemId } from './quality'
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
  QualityKind,
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
  QUALITY_KINDS,
} from './types'
export {
  applyQuality,
  baseItemId,
  qualityKindOf,
  qualityLabel,
  qualityOf,
  reagentSaveChance,
  stampsQualityItem,
  withQuality,
  ITEM_QUALITIES,
} from './quality'
export type { ItemQuality } from './quality'

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
bindItemCatalog((id) => BY_ID.has(id))
bindItemLookup((id) => BY_ID.get(id))

export function isItemId(id: string): boolean {
  return getItem(id) != null
}

export function getItem(id: string): ItemDef | undefined {
  const direct = BY_ID.get(id)
  if (direct) return direct
  const parsed = parseItemId(id)
  const enchantedId = parsed.enchant > 0 ? `${parsed.stem}+${parsed.enchant}` : ''
  const base = (enchantedId && BY_ID.get(enchantedId)) || BY_ID.get(parsed.stem)
  if (!base) return undefined
  return applyQuality(base, id)
}
