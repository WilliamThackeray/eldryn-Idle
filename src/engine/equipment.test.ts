import { expect, test } from 'vitest'
import { MATERIAL_FLAGS, MATERIAL_FLAT_BONUS } from './config'
import { getClass } from '../data/classes'
import {
  acTotal,
  applyStartingKit,
  armorClass,
  armorStrain,
  attunementLimit,
  canEquip,
  emptyEquipment,
  equip,
  gearRollMode,
  heavyArmorIntervalMultiplier,
  weaponDamageLabel,
  weaponIntervalBase,
  type Equipment,
} from './equipment'
import { getItem } from '../data/items'

function withPieces(pieces: Partial<Equipment>): Equipment {
  return { ...emptyEquipment(), ...pieces }
}

function fullSet(prefix: string): Equipment {
  return withPieces({
    helmet: `${prefix}-helmet`,
    chest: `${prefix}-chest`,
    chaps: `${prefix}-chaps`,
    gauntlets: `${prefix}-gauntlets`,
    boots: `${prefix}-boots`,
  } as Partial<Equipment>)
}

test('AC: light leather full set and partial pieces', () => {
  expect(armorClass(fullSet('leather'), 5)).toBe(16)
  expect(armorClass(fullSet('leather'), 0)).toBe(11)
  expect(armorClass(withPieces({ chest: 'leather-chest' }), 0)).toBe(10)
})

test('AC: medium hide caps DEX at +2', () => {
  expect(armorClass(fullSet('hide'), 5)).toBe(14)
  expect(armorClass(fullSet('hide'), 1)).toBe(13)
})

test('AC: heavy plate ignores DEX; partial floors shares', () => {
  expect(armorClass(fullSet('plate'), 5)).toBe(18)
  expect(armorClass(withPieces({ chest: 'plate-chest' }), 0)).toBe(13)
  expect(armorClass(withPieces({ chest: 'plate-chest', helmet: 'plate-helmet' }), 0)).toBe(14)
})

test('AC: shield and mixed weight class', () => {
  expect(armorClass(withPieces({ ...fullSet('leather'), offHand: 'shield' }), 0)).toBe(13)
  expect(armorClass(withPieces({ chest: 'leather-chest', boots: 'plate-boots' }), 5)).toBe(11)
})

test('acTotal applies medium DEX cap, shield, and magic', () => {
  expect(acTotal({ armor: 5, dexMod: 3, weightClass: 'medium', shieldBonus: 2, magicBonus: 1 })).toBe(20)
})

test('equip rules: two-handed vs offhand, light offhand, soft STR', () => {
  expect(canEquip(withPieces({ offHand: 'shield' }), 'greatsword')).toBe(false)
  expect(canEquip(emptyEquipment(), 'shield')).toBe(true)
  expect(canEquip(withPieces({ mainHand: 'longsword' }), 'dagger')).toBe(true)
  expect(canEquip(withPieces({ mainHand: 'longsword' }), 'mace')).toBe(true)

  const sword = equip(emptyEquipment(), { longsword: 1 }, 'longsword')
  expect(sword).not.toBeNull()
  const dagger = equip(sword!.equipment, { ...sword!.inventory, dagger: 1 }, 'dagger')
  expect(dagger?.equipment.offHand).toBe('dagger')
  expect(dagger?.equipment.mainHand).toBe('longsword')

  const mace = equip(sword!.equipment, { ...sword!.inventory, mace: 1 }, 'mace')
  expect(mace?.equipment.mainHand).toBe('mace')
  expect(mace?.equipment.offHand).toBeNull()

  expect(canEquip(emptyEquipment(), 'plate-chest')).toBe(true)
})

test('weaponIntervalBase by property', () => {
  expect(weaponIntervalBase(getItem('dagger')?.gear?.weapon)).toBe(4.8)
  expect(weaponIntervalBase(getItem('longsword')?.gear?.weapon)).toBe(6)
  expect(weaponIntervalBase(getItem('greatsword')?.gear?.weapon)).toBe(7.2)
  expect(weaponIntervalBase(getItem('shortbow')?.gear?.weapon)).toBe(6)
  expect(weaponIntervalBase(getItem('hand-crossbow')?.gear?.weapon)).toBe(6)
  expect(weaponIntervalBase(getItem('heavy-crossbow')?.gear?.weapon)).toBe(8.4)
})

test('weaponDamageLabel uses versatile die when off hand is empty', () => {
  expect(weaponDamageLabel(withPieces({ mainHand: 'longsword' }))).toBe('1d10')
  expect(weaponDamageLabel(withPieces({ mainHand: 'longsword', offHand: 'shield' }))).toBe('1d8')
})

test('heavy armor STR soft requirement and mithral ignore', () => {
  expect(heavyArmorIntervalMultiplier(withPieces({ chest: 'chain-mail-chest' }), 12)).toBe(1.1)
  expect(heavyArmorIntervalMultiplier(withPieces({ chest: 'chain-mail-chest' }), 13)).toBe(1)
  expect(heavyArmorIntervalMultiplier(withPieces({ chest: 'ring-mail-chest' }), 8)).toBe(1)

  const mithralPiece = {
    slot: 'chest' as const,
    magicBonus: 0,
    material: 'mithral' as const,
    armor: {
      weightClass: 'heavy' as const,
      armorValue: 6,
      strRequirement: 13,
      stealthDisadvantage: true,
    },
  }
  expect(armorStrain(mithralPiece, 8)).toBe(false)
  expect(armorStrain(getItem('chain-mail-chest')?.gear, 12)).toBe(true)
})

test('stealth and acrobatics disadvantage from heavy or padded armor', () => {
  expect(gearRollMode('stealth', fullSet('padded'))).toBe('disadvantage')
  expect(gearRollMode('acrobatics', fullSet('plate'))).toBe('disadvantage')
  expect(gearRollMode('stealth', fullSet('leather'))).toBe('normal')
  expect(gearRollMode('athletics', fullSet('plate'))).toBe('normal')
})

test('a starting kit equips the weapon and armor and keeps 10 cooked food', () => {
  const { equipment, inventory } = applyStartingKit(getClass('barbarian').startingKit)
  expect(equipment.mainHand).toBe('greataxe')
  expect(equipment.chest).toBe('leather-chest')
  expect(equipment.helmet).toBe('leather-helmet')
  expect(equipment.food).toBe('cooked-meat')
  expect(inventory['cooked-meat']).toBe(10)
  expect(inventory.greataxe).toBeUndefined()
})

test('full casters start in themed cloth and half-casters keep leather', () => {
  const chest = (id: Parameters<typeof getClass>[0]) => applyStartingKit(getClass(id).startingKit).equipment.chest
  expect(chest('wizard')).toBe('arcane-chest')
  expect(chest('sorcererWarlock')).toBe('arcane-chest')
  expect(chest('cleric')).toBe('vestment-chest')
  expect(chest('druid')).toBe('wildweave-chest')
  expect(chest('bard')).toBe('minstrel-chest')
  expect(chest('paladin')).toBe('leather-chest')
  expect(chest('ranger')).toBe('leather-chest')
  expect(applyStartingKit(getClass('paladin').startingKit).equipment.mainHand).toBe('longsword')
  expect(applyStartingKit(getClass('ranger').startingKit).equipment.mainHand).toBe('shortsword')
  const robe = getItem('arcane-chest')?.gear?.armor
  expect(robe).toMatchObject({ weightClass: 'light', armorValue: 1, stealthDisadvantage: false })
})

test('material flat bonuses default to 0 and flags match the brainstorm', () => {
  for (const value of Object.values(MATERIAL_FLAT_BONUS)) expect(value).toBe(0)
  expect(MATERIAL_FLAGS.silvered.bypassesResistance).toBe(true)
  expect(MATERIAL_FLAGS.mithral.ignoresStrAndStealth).toBe(true)
  expect(MATERIAL_FLAGS.adamantine.negatesCriticalHits).toBe(true)
  expect(attunementLimit()).toBe(3)
})
