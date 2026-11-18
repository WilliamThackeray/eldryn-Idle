export const ITEM_CATEGORIES = ['material', 'food', 'potion', 'component', 'gear', 'ammo', 'currency', 'misc'] as const
export type ItemCategory = (typeof ITEM_CATEGORIES)[number]

export const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'very-rare', 'legendary', 'artifact'] as const
export type ItemRarity = (typeof ITEM_RARITIES)[number]

export const GEAR_SLOTS = [
  'helmet',
  'chest',
  'chaps',
  'boots',
  'gauntlets',
  'cloak',
  'belt',
  'ring',
  'necklace',
  'mainHand',
  'offHand',
  'ammo',
  'attuned',
  'summon',
  'food',
  'potion',
] as const
export type GearSlot = (typeof GEAR_SLOTS)[number]

export const GEAR_MATERIALS = ['iron', 'steel', 'silvered', 'mithral', 'adamantine'] as const
export type GearMaterial = (typeof GEAR_MATERIALS)[number]

export const WEAPON_PROPERTIES = [
  'finesse',
  'light',
  'heavy',
  'two-handed',
  'versatile',
  'reach',
  'ammunition',
  'loading',
  'thrown',
] as const
export type WeaponProperty = (typeof WEAPON_PROPERTIES)[number]

export const WEAPON_MASTERIES = ['cleave', 'graze', 'nick', 'push', 'sap', 'slow', 'topple', 'vex'] as const
export type WeaponMastery = (typeof WEAPON_MASTERIES)[number]

export const DAMAGE_TYPES = [
  'bludgeoning',
  'piercing',
  'slashing',
  'acid',
  'cold',
  'fire',
  'lightning',
  'thunder',
  'force',
  'necrotic',
  'poison',
  'psychic',
  'radiant',
] as const
export type DamageType = (typeof DAMAGE_TYPES)[number]

export const ARMOR_WEIGHT_CLASSES = ['light', 'medium', 'heavy'] as const
export type ArmorWeightClass = (typeof ARMOR_WEIGHT_CLASSES)[number]

export interface WeaponGear {
  dice: string
  damageType: DamageType
  properties: readonly WeaponProperty[]
  versatileDice?: string
  mastery: WeaponMastery
  category: 'simple' | 'martial'
  range: 'melee' | 'ranged'
}

export interface ArmorGear {
  weightClass: ArmorWeightClass
  /** Full-set armor value; pieces take a share when worn. */
  armorValue: number
  strRequirement?: number
  stealthDisadvantage: boolean
}

export interface ItemStats {
  toHit?: number
  damage?: number
  ac?: number
  saveBonus?: number
  maxHp?: number
  /** Extra crit faces below 20. 1 means crit on 19–20. */
  critRange?: number
  /** Percent faster attacks. 10 means 10% faster. */
  attackSpeedPct?: number
  resistances?: readonly DamageType[]
  skillXpPct?: Partial<Record<string, number>>
  skillSpeedPct?: Partial<Record<string, number>>
}

export interface GearBlock {
  slot: GearSlot
  material?: GearMaterial
  magicBonus: number
  weapon?: WeaponGear
  armor?: ArmorGear
  /** Off-hand shield: +2 AC. */
  shield?: boolean
  stats?: ItemStats
}

export interface ItemDef {
  id: string
  name: string
  description: string
  category: ItemCategory
  rarity: ItemRarity
  stackable: boolean
  sellValue: number
  tags?: string[]
  gear?: GearBlock
  /** Public URL for a 500×500 item sprite, e.g. `/Assets/Shortsword.svg`. */
  icon?: string
  /** HP restored when eaten from the food slot in combat. */
  heal?: number
}

export function magicBonusForRarity(rarity: ItemRarity): number {
  if (rarity === 'common') return 0
  if (rarity === 'uncommon') return 1
  if (rarity === 'rare') return 2
  return 3
}
