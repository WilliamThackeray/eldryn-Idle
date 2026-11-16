import { getItem, type GearBlock, type ItemId } from '../data/items'
import type { SkillId } from '../data/skills'
import {
  ARMOR_SLOT_SHARE,
  ATTUNEMENT_LIMIT,
  HEAVY_ARMOR_INTERVAL_FACTOR,
  MATERIAL_FLAGS,
  WEAPON_INTERVAL_SEC,
} from './config'
import { resolveRollMode, type RollMode } from './dice'
import { addItems, removeItems, type Inventory } from './inventory'

export type EquipmentSlot =
  | 'helmet'
  | 'chest'
  | 'chaps'
  | 'boots'
  | 'gauntlets'
  | 'cloak'
  | 'belt'
  | 'ring1'
  | 'ring2'
  | 'necklace'
  | 'mainHand'
  | 'offHand'
  | 'ammo'
  | 'attuned1'
  | 'attuned2'
  | 'attuned3'
  | 'summon1'
  | 'summon2'
  | 'food'
  | 'potion'

export type Equipment = Record<EquipmentSlot, ItemId | null>

export interface EquipmentSet {
  name: string
  slots: Equipment
}

const ARMOR_SHARE_SLOTS = ['helmet', 'chest', 'chaps', 'gauntlets', 'boots'] as const
type ArmorShareSlot = (typeof ARMOR_SHARE_SLOTS)[number]

const WEIGHT_RANK = { light: 1, medium: 2, heavy: 3 } as const

/** TODO(design): slots vs a limit of 3 attuned items across all gear. */
export function attunementLimit(): number {
  return ATTUNEMENT_LIMIT
}

export function emptyEquipment(): Equipment {
  return {
    helmet: null,
    chest: null,
    chaps: null,
    boots: null,
    gauntlets: null,
    cloak: null,
    belt: null,
    ring1: null,
    ring2: null,
    necklace: null,
    mainHand: null,
    offHand: null,
    ammo: null,
    attuned1: null,
    attuned2: null,
    attuned3: null,
    summon1: null,
    summon2: null,
    food: null,
    potion: null,
  }
}

function gearOf(itemId: string | null | undefined): GearBlock | undefined {
  if (!itemId) return undefined
  return getItem(itemId)?.gear
}

function isTwoHanded(itemId: string | null | undefined): boolean {
  const weapon = gearOf(itemId)?.weapon
  return Boolean(weapon?.properties.includes('two-handed'))
}

function ignoresStrAndStealth(gear: GearBlock | undefined): boolean {
  return gear?.material === 'mithral' && MATERIAL_FLAGS.mithral.ignoresStrAndStealth
}

export function armorStrain(piece: GearBlock | undefined, strScore: number): boolean {
  const req = piece?.armor?.strRequirement
  if (req == null) return false
  if (ignoresStrAndStealth(piece)) return false
  return strScore < req
}

export function canEquip(equipment: Equipment, itemId: string): boolean {
  const item = getItem(itemId)
  if (!item) return false

  if (item.category === 'ammo' || item.gear?.slot === 'ammo') return true
  if (item.category === 'food' || item.gear?.slot === 'food') return true
  if (item.category === 'potion' || item.gear?.slot === 'potion') return true

  const gear = item.gear
  if (!gear) return false

  if (gear.slot === 'mainHand' && gear.weapon) {
    if (gear.weapon.properties.includes('two-handed')) return equipment.offHand == null
    if (gear.weapon.properties.includes('light')) {
      if (equipment.mainHand == null) return true
      return equipment.offHand == null && !isTwoHanded(equipment.mainHand)
    }
    return true
  }

  if (gear.slot === 'offHand' || gear.shield) {
    if (isTwoHanded(equipment.mainHand)) return false
    if (gear.shield) return true
    if (!gear.weapon) return true
    return gear.weapon.properties.includes('light')
  }

  if (gear.slot === 'ring') return equipment.ring1 == null || equipment.ring2 == null
  if (gear.slot === 'attuned') {
    const limit = attunementLimit()
    const slots = (['attuned1', 'attuned2', 'attuned3'] as const).slice(0, limit)
    return slots.some((slot) => equipment[slot] == null)
  }
  if (gear.slot === 'summon') return equipment.summon1 == null || equipment.summon2 == null

  if (
    gear.slot === 'helmet' ||
    gear.slot === 'chest' ||
    gear.slot === 'chaps' ||
    gear.slot === 'boots' ||
    gear.slot === 'gauntlets' ||
    gear.slot === 'cloak' ||
    gear.slot === 'belt' ||
    gear.slot === 'necklace' ||
    gear.slot === 'mainHand'
  ) {
    return true
  }

  return false
}

function targetSlot(equipment: Equipment, itemId: string): EquipmentSlot | null {
  const item = getItem(itemId)
  if (!item) return null

  if (item.category === 'ammo' || item.gear?.slot === 'ammo') return 'ammo'
  if (item.category === 'food' || item.gear?.slot === 'food') return 'food'
  if (item.category === 'potion' || item.gear?.slot === 'potion') return 'potion'

  const gear = item.gear
  if (!gear) return null

  if (gear.slot === 'ring') return equipment.ring1 == null ? 'ring1' : equipment.ring2 == null ? 'ring2' : 'ring1'
  if (gear.slot === 'attuned') {
    const limit = attunementLimit()
    for (const slot of (['attuned1', 'attuned2', 'attuned3'] as const).slice(0, limit)) {
      if (equipment[slot] == null) return slot
    }
    return 'attuned1'
  }
  if (gear.slot === 'summon') return equipment.summon1 == null ? 'summon1' : 'summon2'
  if (gear.shield || gear.slot === 'offHand') return 'offHand'
  if (gear.slot === 'mainHand' && gear.weapon) {
    if (gear.weapon.properties.includes('light') && equipment.mainHand != null && equipment.offHand == null) {
      return 'offHand'
    }
    return 'mainHand'
  }
  if (gear.slot === 'mainHand') return 'mainHand'
  if (gear.slot === 'helmet') return 'helmet'
  if (gear.slot === 'chest') return 'chest'
  if (gear.slot === 'chaps') return 'chaps'
  if (gear.slot === 'boots') return 'boots'
  if (gear.slot === 'gauntlets') return 'gauntlets'
  if (gear.slot === 'cloak') return 'cloak'
  if (gear.slot === 'belt') return 'belt'
  if (gear.slot === 'necklace') return 'necklace'
  return null
}

function isSelectionSlot(slot: EquipmentSlot): boolean {
  return slot === 'ammo' || slot === 'food' || slot === 'potion'
}

export function equip(
  equipment: Equipment,
  inventory: Inventory,
  itemId: ItemId,
): { equipment: Equipment; inventory: Inventory } | null {
  if (!canEquip(equipment, itemId)) return null
  const slot = targetSlot(equipment, itemId)
  if (!slot) return null

  if (isSelectionSlot(slot)) {
    if ((inventory[itemId] ?? 0) <= 0) return null
    return { equipment: { ...equipment, [slot]: itemId }, inventory }
  }

  if ((inventory[itemId] ?? 0) <= 0) return null

  let nextInventory = removeItems(inventory, [{ itemId, quantity: 1 }])
  let nextEquipment = { ...equipment }
  const previous = nextEquipment[slot]
  if (previous) nextInventory = addItems(nextInventory, [{ itemId: previous, quantity: 1 }])
  nextEquipment[slot] = itemId
  return { equipment: nextEquipment, inventory: nextInventory }
}

export function unequip(
  equipment: Equipment,
  inventory: Inventory,
  slot: EquipmentSlot,
): { equipment: Equipment; inventory: Inventory } {
  const worn = equipment[slot]
  if (!worn) return { equipment, inventory }
  const nextEquipment = { ...equipment, [slot]: null }
  if (isSelectionSlot(slot)) return { equipment: nextEquipment, inventory }
  return { equipment: nextEquipment, inventory: addItems(inventory, [{ itemId: worn, quantity: 1 }]) }
}

export function acTotal(input: {
  armor: number
  dexMod: number
  weightClass: 'none' | 'light' | 'medium' | 'heavy'
  shieldBonus: number
  magicBonus: number
}): number {
  const capped =
    input.weightClass === 'heavy'
      ? 0
      : input.weightClass === 'medium'
        ? Math.min(input.dexMod, 2)
        : input.dexMod
  return 10 + input.armor + capped + input.shieldBonus + input.magicBonus
}

export function armorClass(equipment: Equipment, dexMod: number): number {
  let armorSum = 0
  let magicBonus = 0
  let heaviest: 'none' | 'light' | 'medium' | 'heavy' = 'none'

  for (const slot of ARMOR_SHARE_SLOTS) {
    const gear = gearOf(equipment[slot])
    const armor = gear?.armor
    if (!armor) continue
    armorSum += armor.armorValue * ARMOR_SLOT_SHARE[slot as ArmorShareSlot]
    magicBonus += gear?.magicBonus ?? 0
    if (heaviest === 'none' || WEIGHT_RANK[armor.weightClass] > WEIGHT_RANK[heaviest]) {
      heaviest = armor.weightClass
    }
  }

  const off = gearOf(equipment.offHand)
  let shieldBonus = 0
  if (off?.shield) {
    shieldBonus = 2
    magicBonus += off.magicBonus ?? 0
  }

  return acTotal({
    armor: Math.floor(armorSum),
    dexMod,
    weightClass: heaviest,
    shieldBonus,
    magicBonus,
  })
}

export function weaponIntervalBase(weapon: GearBlock['weapon'] | undefined): number {
  if (!weapon) return WEAPON_INTERVAL_SEC.standard
  let base = WEAPON_INTERVAL_SEC.standard
  if (weapon.properties.includes('light')) base = WEAPON_INTERVAL_SEC.light
  else if (weapon.properties.includes('heavy')) base = WEAPON_INTERVAL_SEC.heavy
  if (weapon.properties.includes('loading')) base += WEAPON_INTERVAL_SEC.loadingExtra
  return base
}

export function weaponDamageLabel(equipment: Equipment): string {
  const gear = gearOf(equipment.mainHand)
  const weapon = gear?.weapon
  if (!weapon) return '—'
  if (weapon.properties.includes('versatile') && weapon.versatileDice && equipment.offHand == null) {
    return weapon.versatileDice
  }
  return weapon.dice
}

export function heavyArmorIntervalMultiplier(equipment: Equipment, strScore: number): number {
  for (const slot of ARMOR_SHARE_SLOTS) {
    if (armorStrain(gearOf(equipment[slot]), strScore)) return HEAVY_ARMOR_INTERVAL_FACTOR
  }
  return 1
}

export function gearRollMode(skillId: SkillId, equipment: Equipment): RollMode {
  if (skillId !== 'stealth' && skillId !== 'acrobatics') return 'normal'
  const sources: Array<'advantage' | 'disadvantage'> = []
  for (const slot of Object.keys(equipment) as EquipmentSlot[]) {
    const gear = gearOf(equipment[slot])
    if (!gear?.armor?.stealthDisadvantage) continue
    if (ignoresStrAndStealth(gear)) continue
    sources.push('disadvantage')
    break
  }
  return resolveRollMode(sources)
}

/** Strip worn gear back into inventory, then pull matching pieces from a saved loadout. */
export function applyLoadout(
  equipment: Equipment,
  inventory: Inventory,
  loadout: Equipment,
): { equipment: Equipment; inventory: Inventory } {
  let nextEquipment = emptyEquipment()
  let nextInventory = inventory

  for (const slot of Object.keys(equipment) as EquipmentSlot[]) {
    const worn = equipment[slot]
    if (!worn || isSelectionSlot(slot)) continue
    nextInventory = addItems(nextInventory, [{ itemId: worn, quantity: 1 }])
  }

  for (const slot of Object.keys(loadout) as EquipmentSlot[]) {
    const itemId = loadout[slot]
    if (!itemId) continue
    if (isSelectionSlot(slot)) {
      if ((nextInventory[itemId] ?? 0) > 0) nextEquipment[slot] = itemId
      continue
    }
    if ((nextInventory[itemId] ?? 0) <= 0) continue
    nextInventory = removeItems(nextInventory, [{ itemId, quantity: 1 }])
    nextEquipment[slot] = itemId
  }

  return { equipment: nextEquipment, inventory: nextInventory }
}
