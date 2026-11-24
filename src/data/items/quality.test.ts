import { expect, test } from 'vitest'
import { emptyEquipment, armorClass } from '../../engine/equipment'
import { foodHealAmount } from '../../engine/combat/food'
import { initialSkillProgress } from '../skills'
import { baseItemId, getItem, qualityOf, reagentSaveChance, withQuality } from './index'

test('id helpers round-trip quality and enchant suffixes', () => {
  expect(withQuality('longsword', 'fine')).toBe('longsword@fine')
  expect(baseItemId('longsword@fine')).toBe('longsword')
  expect(qualityOf('longsword@fine')).toBe('fine')
  expect(withQuality('longsword@fine', 'standard')).toBe('longsword')

  expect(withQuality('longsword+1', 'fine')).toBe('longsword@fine+1')
  expect(baseItemId('longsword@fine+1')).toBe('longsword+1')
  expect(qualityOf('longsword@fine+1')).toBe('fine')
  expect(withQuality('longsword@fine+1', 'masterwork')).toBe('longsword@masterwork+1')
  expect(withQuality('longsword+1@exceptional', 'standard')).toBe('longsword+1')
  expect(qualityOf('longsword+1')).toBe('standard')
  expect(baseItemId('longsword+1')).toBe('longsword+1')
})

test('quality variants are derived from the base def', () => {
  const fine = getItem('longsword@fine')
  expect(fine?.name).toBe('Fine Longsword')
  expect(fine?.gear?.stats?.toHit).toBe(1)
  expect(fine?.gear?.stats?.damage).toBe(1)
  const exceptional = getItem('longsword@exceptional')
  expect(exceptional?.gear?.stats?.toHit).toBe(2)
  expect(exceptional?.gear?.stats?.critRange).toBe(1)
  expect(getItem('greatclub@exceptional')?.gear?.stats?.critDiceBonus).toBe(1)
  expect(getItem('dagger@exceptional')?.gear?.stats?.attackSpeedPct).toBe(5)
  expect(getItem('shortbow@exceptional')?.gear?.stats?.ignoreAc).toBe(2)

  const armor = getItem('leather-chest@exceptional')
  expect(armor?.gear?.stats?.resistances).toContain('piercing')

  expect(getItem('healing-potion@masterwork')?.potency).toBe(1.5)
  expect(getItem('cooked-forest-fish@fine')?.heal).toBe(Math.round(5 * 1.25))
  expect(getItem('quartz-ring@fine')?.gear?.stats?.maxHp).toBe(2.5)
  expect(getItem('prospectors-belt@masterwork')?.gear?.stats?.skillCheck?.mining).toBe(3)
  expect(reagentSaveChance('sulfur@fine')).toBe(0.1)
  expect(reagentSaveChance('sulfur')).toBe(0)
  expect(getItem('iron-ore')?.qualityKind).toBeUndefined()
})

test('masterwork armor adds 0.4 AC per piece through the slot share', () => {
  const slots = ['helmet', 'chest', 'chaps', 'gauntlets', 'boots'] as const
  const plain = emptyEquipment()
  const master = emptyEquipment()
  for (const slot of slots) {
    plain[slot] = `leather-${slot}`
    master[slot] = `leather-${slot}@masterwork`
  }
  expect(armorClass(master, 0) - armorClass(plain, 0)).toBe(2)
})

test('fine food heals more at rest', () => {
  const skills = initialSkillProgress()
  const plain = foodHealAmount({ ...emptyEquipment(), food: 'cooked-forest-fish' }, skills)
  const fine = foodHealAmount({ ...emptyEquipment(), food: 'cooked-forest-fish@fine' }, skills)
  expect(plain).toBe(5)
  expect(fine).toBe(6)
})
