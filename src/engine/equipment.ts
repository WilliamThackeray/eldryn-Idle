import type { ItemStack } from '../data/activities/types'
import {
  getItem,
  qualityOf,
  type DamageType,
  type GearBlock,
  type GearMaterial,
  type ItemStats,
} from '../data/items'
import type { TradeSkillId } from '../data/skills'
import {
  ARMOR_QUALITY_AC,
  ARMOR_SLOT_SHARE,
  ATTUNEMENT_LIMIT,
  HEAVY_ARMOR_INTERVAL_FACTOR,
  MATERIAL_FLAGS,
  MATERIAL_FLAT_BONUS,
  MATERIAL_LEVEL,
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

export type Equipment = Record<EquipmentSlot, string | null>

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

/** null means ok; otherwise a reason the player can see. */
export function canEquip(equipment: Equipment, itemId: string, classLevel: number): string | null {
  const item = getItem(itemId)
  if (!item) return 'Unknown item'

  if (item.category === 'ammo' || item.gear?.slot === 'ammo') return null
  if (item.category === 'food' || item.gear?.slot === 'food') return null
  if (item.category === 'potion' || item.gear?.slot === 'potion') return null

  const gear = item.gear
  if (!gear) return 'Not equippable'

  if (gear.slot === 'mainHand' && gear.weapon) {
    if (gear.weapon.properties.includes('two-handed') && equipment.offHand != null) {
      return 'Off hand must be empty'
    }
    if (gear.weapon.properties.includes('light')) {
      if (equipment.mainHand != null) {
        if (equipment.offHand != null) return 'Both hands are full'
        if (isTwoHanded(equipment.mainHand)) return 'Off hand must be empty'
      }
    }
  } else if (gear.slot === 'offHand' || gear.shield) {
    if (isTwoHanded(equipment.mainHand)) return 'Main hand is two-handed'
    if (gear.weapon && !gear.weapon.properties.includes('light') && !gear.shield) {
      return 'Off hand weapons must be light'
    }
  } else if (gear.slot === 'ring') {
    // Rings can always replace ring1 when both are full.
  } else if (gear.slot === 'attuned') {
    // Attuned items can always replace attuned1 when full.
  } else if (gear.slot === 'summon') {
    // Summons can always replace summon1 when full.
  } else if (
    gear.slot !== 'helmet' &&
    gear.slot !== 'chest' &&
    gear.slot !== 'chaps' &&
    gear.slot !== 'boots' &&
    gear.slot !== 'gauntlets' &&
    gear.slot !== 'cloak' &&
    gear.slot !== 'belt' &&
    gear.slot !== 'necklace' &&
    gear.slot !== 'mainHand'
  ) {
    return 'Not equippable'
  }

  if (gear.material) {
    const required = MATERIAL_LEVEL[gear.material]
    if (classLevel < required) return `Requires Class Level ${required}`
  }
  return null
}

export function flatWeaponBonus(material: GearMaterial, magicBonus: number): { toHit: number; damage: number } {
  const flat = MATERIAL_FLAT_BONUS[material] + magicBonus
  return { toHit: flat, damage: flat }
}

export interface TotalItemStats {
  toHit: number
  damage: number
  ac: number
  saveBonus: number
  maxHp: number
  critRange: number
  critDiceBonus: number
  ignoreAc: number
  attackSpeedPct: number
  resistances: DamageType[]
  skillXpPct: Partial<Record<TradeSkillId, number>>
  skillSpeedPct: Partial<Record<TradeSkillId, number>>
  skillCheck: Partial<Record<TradeSkillId, number>>
  spellAttack: number
  spellSaveDc: number
  componentSaveChance: number
}

function emptyTotalStats(): TotalItemStats {
  return {
    toHit: 0,
    damage: 0,
    ac: 0,
    saveBonus: 0,
    maxHp: 0,
    critRange: 0,
    critDiceBonus: 0,
    ignoreAc: 0,
    attackSpeedPct: 0,
    resistances: [],
    skillXpPct: {},
    skillSpeedPct: {},
    skillCheck: {},
    spellAttack: 0,
    spellSaveDc: 0,
    componentSaveChance: 0,
  }
}

function addSkillMap(
  into: Partial<Record<TradeSkillId, number>>,
  from: ItemStats['skillXpPct'] | ItemStats['skillSpeedPct'] | ItemStats['skillCheck'],
) {
  if (!from) return
  for (const [key, value] of Object.entries(from)) {
    if (value == null) continue
    const skill = key as TradeSkillId
    into[skill] = (into[skill] ?? 0) + value
  }
}

/** Sum of skillCheck bonuses from every equipped item. */
export function gearSkillBonus(
  equipment: Equipment,
  skillId: TradeSkillId,
): number {
  return totalItemStats(equipment).skillCheck[skillId] ?? 0
}

/** Occupied slots only. Used for per-skill and combat loadouts. */
export type EquipmentSnapshot = Partial<Record<EquipmentSlot, string>>

/**
 * Equip items named in the snapshot without clearing unnamed slots.
 * Missing items leave the worn piece and are listed in `missing`.
 */
export function applySkillLoadout(
  equipment: Equipment,
  inventory: Inventory,
  snapshot: EquipmentSnapshot | undefined,
): { equipment: Equipment; inventory: Inventory; missing: EquipmentSlot[] } {
  if (!snapshot || Object.keys(snapshot).length === 0) {
    return { equipment, inventory, missing: [] }
  }

  const nextEquipment = { ...equipment }
  let nextInventory = inventory
  const missing: EquipmentSlot[] = []

  for (const slot of Object.keys(snapshot) as EquipmentSlot[]) {
    const itemId = snapshot[slot]
    if (!itemId) continue
    if (nextEquipment[slot] === itemId) continue
    if ((nextInventory[itemId] ?? 0) <= 0) {
      missing.push(slot)
      continue
    }
    const worn = nextEquipment[slot]
    if (worn && !isSelectionSlot(slot)) {
      nextInventory = addItems(nextInventory, [{ itemId: worn, quantity: 1 }])
    }
    if (!isSelectionSlot(slot)) {
      nextInventory = removeItems(nextInventory, [{ itemId, quantity: 1 }])
    }
    nextEquipment[slot] = itemId
  }

  return { equipment: nextEquipment, inventory: nextInventory, missing }
}

export function snapshotFromEquipment(equipment: Equipment): EquipmentSnapshot {
  const snap: EquipmentSnapshot = {}
  for (const slot of Object.keys(equipment) as EquipmentSlot[]) {
    const itemId = equipment[slot]
    if (itemId) snap[slot] = itemId
  }
  return snap
}

export function loadoutMissing(
  equipment: Equipment,
  inventory: Inventory,
  snapshot: EquipmentSnapshot | undefined,
): EquipmentSlot[] {
  if (!snapshot) return []
  const missing: EquipmentSlot[] = []
  for (const slot of Object.keys(snapshot) as EquipmentSlot[]) {
    const itemId = snapshot[slot]
    if (!itemId) continue
    if (equipment[slot] === itemId) continue
    if ((inventory[itemId] ?? 0) > 0) continue
    missing.push(slot)
  }
  return missing
}

function materialBonus(material: GearMaterial | undefined): number {
  if (!material) return 0
  return MATERIAL_FLAT_BONUS[material]
}

export function totalItemStats(equipment: Equipment): TotalItemStats {
  const total = emptyTotalStats()
  const resistSet = new Set<DamageType>()

  for (const slot of Object.keys(equipment) as EquipmentSlot[]) {
    const gear = gearOf(equipment[slot])
    if (!gear) continue
    const stats = gear.stats
    if (stats) {
      total.toHit += stats.toHit ?? 0
      total.damage += stats.damage ?? 0
      total.ac += stats.ac ?? 0
      total.saveBonus += stats.saveBonus ?? 0
      total.maxHp += stats.maxHp ?? 0
      total.critRange += stats.critRange ?? 0
      total.critDiceBonus += stats.critDiceBonus ?? 0
      total.ignoreAc += stats.ignoreAc ?? 0
      total.attackSpeedPct += stats.attackSpeedPct ?? 0
      total.spellAttack += stats.spellAttack ?? 0
      total.spellSaveDc += stats.spellSaveDc ?? 0
      total.componentSaveChance += stats.componentSaveChance ?? 0
      for (const type of stats.resistances ?? []) resistSet.add(type)
      addSkillMap(total.skillXpPct, stats.skillXpPct)
      addSkillMap(total.skillSpeedPct, stats.skillSpeedPct)
      addSkillMap(total.skillCheck, stats.skillCheck)
    }

    if (ARMOR_SHARE_SLOTS.includes(slot as ArmorShareSlot) || gear.shield) {
      total.ac += gear.magicBonus ?? 0
    }
  }

  const main = gearOf(equipment.mainHand)
  if (main?.weapon) {
    const material = main.material ? MATERIAL_FLAT_BONUS[main.material] : 0
    const magic = main.magicBonus ?? 0
    total.toHit += material + magic
    total.damage += material + magic
  }

  total.resistances = [...resistSet]
  return total
}

export function targetSlot(equipment: Equipment, itemId: string): EquipmentSlot | null {
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

/** Puts a new character's kit on their body. Food stays stacked and is selected. */
export function applyStartingKit(kit: readonly ItemStack[]): { inventory: Inventory; equipment: Equipment } {
  let inventory = addItems({}, [...kit])
  let equipment = emptyEquipment()
  for (const stack of kit) {
    const next = equip(equipment, inventory, stack.itemId, 1)
    if (!next) continue
    equipment = next.equipment
    inventory = next.inventory
  }
  return { inventory, equipment }
}

export function equip(
  equipment: Equipment,
  inventory: Inventory,
  itemId: string,
  classLevel: number,
): { equipment: Equipment; inventory: Inventory } | null {
  if (canEquip(equipment, itemId, classLevel) != null) return null
  const slot = targetSlot(equipment, itemId)
  if (!slot) return null

  if (isSelectionSlot(slot)) {
    if ((inventory[itemId] ?? 0) <= 0) return null
    return { equipment: { ...equipment, [slot]: itemId }, inventory }
  }

  if ((inventory[itemId] ?? 0) <= 0) return null

  let nextInventory = removeItems(inventory, [{ itemId, quantity: 1 }])
  const nextEquipment = { ...equipment }
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
  let heaviest: 'none' | 'light' | 'medium' | 'heavy' = 'none'

  for (const slot of ARMOR_SHARE_SLOTS) {
    const gear = gearOf(equipment[slot])
    const armor = gear?.armor
    if (!armor) continue
    const piece = armor.armorValue + materialBonus(gear?.material)
    const qualityAc = ARMOR_QUALITY_AC[qualityOf(equipment[slot] ?? '')]
    armorSum += piece * ARMOR_SLOT_SHARE[slot as ArmorShareSlot] + qualityAc
    if (heaviest === 'none' || WEIGHT_RANK[armor.weightClass] > WEIGHT_RANK[heaviest]) {
      heaviest = armor.weightClass
    }
  }

  const off = gearOf(equipment.offHand)
  const shieldBonus = off?.shield ? 2 : 0
  const itemAc = totalItemStats(equipment).ac

  return acTotal({
    armor: Math.floor(armorSum),
    dexMod,
    weightClass: heaviest,
    shieldBonus,
    magicBonus: itemAc,
  })
}

export function weaponIntervalBase(weapon: GearBlock['weapon'] | undefined): number {
  if (!weapon) return WEAPON_INTERVAL_SEC.standard
  let base: number = WEAPON_INTERVAL_SEC.standard
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

export function gearRollMode(skillId: TradeSkillId, equipment: Equipment): RollMode {
  if (skillId !== 'thievery') return 'normal'
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
  const nextEquipment = emptyEquipment()
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
