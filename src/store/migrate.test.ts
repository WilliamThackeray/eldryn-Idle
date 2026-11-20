import { expect, test } from 'vitest'
import { emptyEquipment } from '../engine/equipment'
import { SAVE_VERSION, migrateSave, normalizeSave } from './migrate'

test('an old save keeps real skill xp and drops weapon properties', () => {
  const next = migrateSave(
    {
      character: {
        name: 'ada',
        nonCombatSkills: [{ id: 'athletics', currentXP: 120 }],
        combatSkills: [{ id: 'finesse', currentXP: 50 }],
        inventory: [{ id: 'potion', name: 'Potion', quantity: 2, description: 'Heals' }],
      },
      lastSaved: '2020-01-01T00:00:00.000Z',
    },
    0,
  )

  expect(next.characterName).toBe('ada')
  expect(next.skills.athletics.xp).toBe(120)
  expect(next.skills.acrobatics.xp).toBe(0)
  expect('finesse' in next.skills).toBe(false)
  expect(next.inventory).toEqual({})
  expect(next.gold).toBe(0)
  expect(next.lastSaved).toBe('2020-01-01T00:00:00.000Z')
  expect(next.classId).toBe('fighter')
  expect(next.classXp).toBe(0)
})

test('a broken save resets to a fresh character', () => {
  const next = migrateSave('nope', 0)
  expect(next.characterName).toBe('bob')
  expect(next.skills.perception.xp).toBe(0)
  expect(next.skills.vitality).toEqual({ xp: 0 })
  expect(next.classId).toBe('fighter')
  expect(next.classXp).toBe(0)
})

test('version 4 drops stored level and score and keeps vitality xp', () => {
  expect(SAVE_VERSION).toBe(12)

  const next = migrateSave(
    {
      characterName: 'ada',
      skills: {
        athletics: { xp: 83, level: 2, score: 18 },
        vitality: { xp: 40, level: 1, score: 10 },
      },
      abilityScores: { STR: 16 },
      inventory: [],
      lastSaved: '2020-01-01T00:00:00.000Z',
    },
    1,
  )

  expect(next.skills.athletics).toEqual({ xp: 83 })
  expect(next.skills.vitality).toEqual({ xp: 40 })
  expect('abilityScores' in next).toBe(false)
  expect('level' in next.skills.athletics).toBe(false)
  expect('score' in next.skills.athletics).toBe(false)
  expect(next.inventory).toEqual({})
  expect(next.gold).toBe(0)
  expect(next.activeAction).toBeNull()
  expect(next.lastTick).toBeGreaterThan(Date.now() - 5_000)
  expect(next.classId).toBe('fighter')
  expect(next.classXp).toBe(0)
  expect(next.clericFocus).toBe('INT')
  expect(next.isInDungeonOrQuest).toBe(false)
  expect(next.equipment).toEqual(emptyEquipment())
  expect(next.equipmentSets).toEqual([])
})

test('version 3 keeps the active action and last tick', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { athletics: { xp: 10 } },
      inventory: [],
      lastSaved: '2020-01-01T00:00:00.000Z',
      lastTick: 1_000,
      activeAction: {
        kind: 'skill',
        skillId: 'athletics',
        activityId: 'basic',
        label: 'Basic Training',
        baseIntervalMs: 6000,
        requiredLevel: 1,
        baseXp: 10,
        progressMs: 1500,
      },
    },
    3,
  )

  expect(next.lastTick).toBe(1000)
  expect(next.gold).toBe(0)
  expect(next.activeAction).toMatchObject({ kind: 'skill', skillId: 'athletics', progressMs: 1500 })
  expect(next.classId).toBe('fighter')
  expect(next.classXp).toBe(0)
})

test('a legacy item list becomes counts and drops unknown ids', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { athletics: { xp: 1 } },
      inventory: [
        { id: 'iron-ore', name: 'Iron Ore', quantity: 2, description: 'Ore' },
        { id: 'iron-ore', name: 'Iron Ore', quantity: 1.9, description: 'Ore' },
        { id: 'potion', name: 'Potion', quantity: 2, description: 'Heals' },
      ],
      gold: -5,
    },
    3,
  )

  expect(next.inventory).toEqual({ 'iron-ore': 3 })
  expect(next.gold).toBe(0)
})

test('version 4 keeps item counts and gold and becomes Fighter', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { athletics: { xp: 10 } },
      inventory: { 'iron-ore': 3, 'not-an-item': 9, coal: 0 },
      gold: 40.8,
      lastSaved: '2020-01-01T00:00:00.000Z',
      lastTick: 1_000,
      activeAction: null,
    },
    4,
  )

  expect(next.inventory).toEqual({ 'iron-ore': 3 })
  expect(next.gold).toBe(40)
  expect(next.classId).toBe('fighter')
  expect(next.classXp).toBe(0)
  expect(next.clericFocus).toBe('INT')
  expect(next.isInDungeonOrQuest).toBe(false)
  expect(next.equipment).toEqual(emptyEquipment())
  expect(next.equipmentSets).toEqual([])
})

test('version 5 keeps the highest class XP, gold, inventory, and gains empty equipment', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { athletics: { xp: 10 } },
      inventory: { dagger: 1 },
      gold: 25,
      lastSaved: '2020-01-01T00:00:00.000Z',
      lastTick: 1_000,
      activeAction: null,
      activeClassId: 'wizard',
      classes: { barbarian: { xp: 500 }, wizard: { xp: 80 } },
      clericFocus: 'STR',
      isInDungeonOrQuest: false,
    },
    5,
  )

  expect(next.classId).toBe('barbarian')
  expect(next.classXp).toBe(500)
  expect(next.clericFocus).toBe('STR')
  expect(next.inventory).toEqual({ dagger: 1 })
  expect(next.gold).toBe(25)
  expect(next.equipment).toEqual(emptyEquipment())
  expect(next.equipmentSets).toEqual([])
})

test('a save with no class stays unset until character creation', () => {
  const next = normalizeSave({
    characterName: 'bob',
    skills: {},
    inventory: {},
    gold: 0,
  })
  expect(next.classId).toBeNull()
  expect(next.classXp).toBe(0)
})

test('migration picks the highest-XP class', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { athletics: { xp: 10 } },
      inventory: {},
      gold: 0,
      activeClassId: 'wizard',
      classes: { barbarian: { xp: 500 }, wizard: { xp: 80 }, fighter: { xp: 1200 } },
      clericFocus: 'INT',
    },
    9,
  )

  expect(next.classId).toBe('fighter')
  expect(next.classXp).toBe(1200)
  expect('classes' in next).toBe(false)
  expect('activeClassId' in next).toBe(false)
})

test('migration keeps the active class when class XP is tied', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      activeClassId: 'wizard',
      classes: { wizard: { xp: 100 }, barbarian: { xp: 100 } },
    },
    9,
  )

  expect(next.classId).toBe('wizard')
  expect(next.classXp).toBe(100)
})

test('a save without inventoryTabs puts every owned item on Tab 1', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { athletics: { xp: 10 } },
      inventory: { 'iron-ore': 3, coal: 1 },
      gold: 0,
      classId: 'fighter',
      classXp: 0,
    },
    10,
  )

  expect(next.inventoryTabs).toHaveLength(5)
  expect(next.inventoryTabs[0].name).toBe('Tab 1')
  expect(next.inventoryTabs[0].itemIds).toEqual(expect.arrayContaining(['iron-ore', 'coal']))
  expect(next.inventoryTabs[0].itemIds).toHaveLength(2)
  expect(next.inventoryTabs.slice(1).every((tab) => tab.itemIds.length === 0)).toBe(true)
})

test('a save without inventoryTabs puts every owned item on Tab 1', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { athletics: { xp: 10 } },
      inventory: { 'iron-ore': 3, coal: 1 },
      gold: 0,
      classId: 'fighter',
      classXp: 0,
    },
    10,
  )

  expect(next.inventoryTabs).toHaveLength(5)
  expect(next.inventoryTabs[0].name).toBe('Tab 1')
  expect(next.inventoryTabs[0].itemIds).toEqual(expect.arrayContaining(['iron-ore', 'coal']))
  expect(next.inventoryTabs[0].itemIds).toHaveLength(2)
  expect(next.inventoryTabs.slice(1).every((tab) => tab.itemIds.length === 0)).toBe(true)
})
