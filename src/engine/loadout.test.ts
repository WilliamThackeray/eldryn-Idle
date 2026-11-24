import { expect, test } from 'vitest'
import { createFight } from './combat'
import { advanceCombat } from './combat/step'
import {
  applySkillLoadout,
  emptyEquipment,
  gearSkillBonus,
  totalItemStats,
  type Equipment,
} from './equipment'
import { skillCheck } from './skillCheck'
import { initialSkillProgress } from '../data/skills'
import type { Rng } from './rng'

function scripted(...values: number[]): Rng {
  let index = 0
  return () => values[index++] ?? 0.99
}

test('applySkillLoadout equips named slots and leaves others alone', () => {
  const equipment: Equipment = {
    ...emptyEquipment(),
    mainHand: 'longsword',
    helmet: 'miners-helm',
  }
  const inventory = { 'smiths-gauntlets': 1 }
  const next = applySkillLoadout(equipment, inventory, {
    gauntlets: 'smiths-gauntlets',
  })
  expect(next.equipment.mainHand).toBe('longsword')
  expect(next.equipment.helmet).toBe('miners-helm')
  expect(next.equipment.gauntlets).toBe('smiths-gauntlets')
  expect(next.missing).toEqual([])
})

test('missing loadout items leave the slot and report missing', () => {
  const equipment: Equipment = { ...emptyEquipment(), gauntlets: 'leather-gauntlets' }
  const next = applySkillLoadout(equipment, {}, { gauntlets: 'smiths-gauntlets' })
  expect(next.equipment.gauntlets).toBe('leather-gauntlets')
  expect(next.missing).toEqual(['gauntlets'])
})

test('empty loadout changes nothing', () => {
  const equipment: Equipment = { ...emptyEquipment(), mainHand: 'longsword' }
  const next = applySkillLoadout(equipment, {}, {})
  expect(next.equipment).toEqual(equipment)
})

test('switching skill loadouts restores the right gear', () => {
  let equipment: Equipment = emptyEquipment()
  let inventory: Record<string, number> = {
    'smiths-gauntlets': 1,
    'miners-helm': 1,
  }
  const smith = applySkillLoadout(equipment, inventory, { gauntlets: 'smiths-gauntlets' })
  equipment = smith.equipment
  inventory = smith.inventory
  expect(equipment.gauntlets).toBe('smiths-gauntlets')

  const mine = applySkillLoadout(equipment, inventory, { helmet: 'miners-helm' })
  equipment = mine.equipment
  inventory = mine.inventory
  expect(equipment.helmet).toBe('miners-helm')
  expect(equipment.gauntlets).toBe('smiths-gauntlets')

  const smithAgain = applySkillLoadout(equipment, inventory, { gauntlets: 'smiths-gauntlets' })
  expect(smithAgain.equipment.gauntlets).toBe('smiths-gauntlets')
})

test("Smith's Gauntlets raise gearSkillBonus and the skill check total", () => {
  const bare = emptyEquipment()
  const geared: Equipment = { ...emptyEquipment(), gauntlets: 'smiths-gauntlets' }
  expect(gearSkillBonus(bare, 'smithing')).toBe(0)
  expect(gearSkillBonus(geared, 'smithing')).toBe(1)

  // 0.45 → d20 face 10
  const bareCheck = skillCheck({
    rng: scripted(0.45),
    abilityModifier: 0,
    skillLevel: 1,
    requiredLevel: 1,
    checkBonus: 0,
  })
  const gearedCheck = skillCheck({
    rng: scripted(0.45),
    abilityModifier: 0,
    skillLevel: 1,
    requiredLevel: 1,
    checkBonus: gearSkillBonus(geared, 'smithing'),
  })
  expect(gearedCheck.total).toBe(bareCheck.total + 1)
})

test('a linen robe adds spell attack, save DC, and component save chance', () => {
  const stats = totalItemStats({ ...emptyEquipment(), chest: 'linen-chest' })
  expect(stats.spellAttack).toBe(1)
  expect(stats.spellSaveDc).toBe(1)
  expect(stats.componentSaveChance).toBeCloseTo(0.05)
  expect(stats.maxHp).toBe(2)
})

test('a summon swings and the monster still targets the player', () => {
  const skills = initialSkillProgress()
  const equipment: Equipment = {
    ...emptyEquipment(),
    mainHand: 'longsword',
    summon1: 'bound-wolf',
    food: 'cooked-meat',
  }
  const inventory = { 'cooked-meat': 20 }
  const fight = createFight({
    monsterId: 'owlbear',
    biome: 'forest',
    skills,
    equipment,
    activeClassId: 'fighter',
    classXp: 0,
    rng: scripted(0.99, 0.99, 0.99, 0.99),
    trace: true,
  })
  expect(fight).toBeTruthy()
  expect(fight!.summon1IntervalMs).toBe(6000)

  // Miss every player hit so the fight lasts; summon still swings on its clock.
  const miss = 0.01
  const result = advanceCombat({
    fight: fight!,
    skills,
    inventory,
    gold: 0,
    equipment,
    activeClassId: 'fighter',
    classXp: 0,
    elapsedMs: 12_000,
    rng: scripted(miss, miss, miss, miss, miss, miss, miss, miss, miss, miss, miss, miss),
    trace: true,
  })
  const summonLine = result.lastLog.find((line) => line.includes('Bound Wolf'))
  expect(summonLine).toBeTruthy()
  expect(result.fight?.playerHp).toBeLessThanOrEqual(result.fight?.playerMaxHp ?? 0)
})

