import { expect, test } from 'vitest'
import { playerToHitBonus } from '../engine/combat/attack'
import { emptyEquipment } from '../engine/equipment'
import { applyXpModifiers } from '../engine/xp'
import { initialSkillProgress } from './skills'
import { CLASSES, getClass, isWeaponProficient, modifiersFor, netModifierPercent } from './classes'

test('every class nets exactly +10%', () => {
  for (const entry of CLASSES) {
    const mods = modifiersFor(entry.id, 'INT')
    expect(netModifierPercent(mods), entry.name).toBe(10)
  }
})

test('Cleric focus chooses INT or STR for the +10%', () => {
  const intFocus = modifiersFor('cleric', 'INT')
  expect(intFocus.INT).toBe(0.1)
  expect(intFocus.STR).toBeUndefined()
  expect(netModifierPercent(intFocus)).toBe(10)

  const strFocus = modifiersFor('cleric', 'STR')
  expect(strFocus.STR).toBe(0.1)
  expect(strFocus.INT).toBeUndefined()
  expect(netModifierPercent(strFocus)).toBe(10)
})

test('Sorcerer/Warlock and Paladin keep the Design Doc INT↔CHA swap', () => {
  const sorcerer = getClass('sorcererWarlock')
  expect(sorcerer.xpModifiers).toMatchObject({ INT: 0.3, CHA: 0.1 })

  const paladin = getClass('paladin')
  expect(paladin.xpModifiers).toMatchObject({ INT: 0.15, CHA: -0.15 })
})

test('Barbarian boosts Athletics XP and Wizard boosts Arcana XP', () => {
  const barbarian = modifiersFor('barbarian')
  expect(applyXpModifiers(100, 'STR', barbarian)).toBe(130)
  expect(applyXpModifiers(100, 'INT', barbarian)).toBe(85)

  const wizard = modifiersFor('wizard')
  expect(applyXpModifiers(100, 'INT', wizard)).toBe(130)
  expect(applyXpModifiers(100, 'STR', wizard)).toBe(85)
})

test('modifiersFor with no class returns an empty map', () => {
  expect(modifiersFor(null)).toEqual({})
})

test('weapon proficiency gates the proficiency bonus to hit', () => {
  const skills = initialSkillProgress()
  const longsword = { ...emptyEquipment(), mainHand: 'longsword' as const }
  const fighter = playerToHitBonus(skills, longsword, 0, 'fighter')
  const wizard = playerToHitBonus(skills, longsword, 0, 'wizard')
  // Tier 1 proficiency is +2; ability and item bonuses match.
  expect(fighter - wizard).toBe(2)
  expect(isWeaponProficient('bard', 'steel-longsword')).toBe(true)
  expect(isWeaponProficient('wizard', 'steel-longsword')).toBe(false)
})
