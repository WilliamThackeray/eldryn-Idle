import { expect, test } from 'vitest'
import { emptyEquipment } from '../engine/equipment'
import { SAVE_VERSION, migrateSave, normalizeSave } from './migrate'

test('pre-v19 saves reset to a fresh character', () => {
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

  expect(next.characterName).toBe('bob')
  expect(next.skills.mining.xp).toBe(0)
  expect(next.classId).toBeNull()
})

test('a broken save resets to a fresh character', () => {
  const next = migrateSave('nope', 0)
  expect(next.characterName).toBe('bob')
  expect(next.skills.mining.xp).toBe(0)
  expect(next.skills.vitality).toEqual({ xp: 0 })
  expect(next.classId).toBeNull()
  expect(next.classXp).toBe(0)
  expect(next.secondaryClassId).toBeNull()
  expect(next.secondaryClassXp).toBe(0)
  expect(next.echoes).toBe(0)
})

test('v18 fields normalize secondary class and echoes', () => {
  const next = normalizeSave({
    characterName: 'ada',
    classId: 'barbarian',
    classXp: 100,
    secondaryClassId: 'bard',
    secondaryClassXp: 50,
    echoes: 2,
  })
  expect(next.secondaryClassId).toBe('bard')
  expect(next.secondaryClassXp).toBe(50)
  expect(next.echoes).toBe(2)
})

test('version 19 keeps skill xp without stored level or score', () => {
  expect(SAVE_VERSION).toBe(19)

  const next = migrateSave(
    {
      characterName: 'ada',
      skills: {
        mining: { xp: 83, level: 2, score: 18 },
        vitality: { xp: 40, level: 1, score: 10 },
      },
      abilityScores: { STR: 16 },
      inventory: [],
      lastSaved: '2020-01-01T00:00:00.000Z',
    },
    SAVE_VERSION,
  )

  expect(next.skills.mining).toEqual({ xp: 83 })
  expect(next.skills.vitality).toEqual({ xp: 40 })
  expect('abilityScores' in next).toBe(false)
  expect('level' in next.skills.mining).toBe(false)
  expect('score' in next.skills.mining).toBe(false)
  expect(next.inventory).toEqual({})
  expect(next.gold).toBe(0)
  expect(next.activeAction).toBeNull()
  expect(next.lastTick).toBeGreaterThan(Date.now() - 5_000)
  expect(next.classId).toBeNull()
  expect(next.classXp).toBe(0)
  expect(next.clericFocus).toBe('INT')
  expect(next.isInDungeonOrQuest).toBe(false)
  expect(next.equipment).toEqual(emptyEquipment())
  expect(next.skillLoadouts).toEqual({})
})

test('version 19 keeps the active action and last tick', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { mining: { xp: 10 } },
      inventory: [],
      lastSaved: '2020-01-01T00:00:00.000Z',
      lastTick: 1_000,
      activeAction: {
        kind: 'skill',
        skillId: 'mining',
        activityId: 'mine-iron',
        label: 'Mine Iron',
        baseIntervalMs: 6000,
        requiredLevel: 1,
        baseXp: 10,
        progressMs: 1500,
      },
    },
    SAVE_VERSION,
  )

  expect(next.lastTick).toBe(1000)
  expect(next.gold).toBe(0)
  expect(next.activeAction).toMatchObject({ kind: 'skill', skillId: 'mining', progressMs: 1500 })
  expect(next.classId).toBeNull()
  expect(next.classXp).toBe(0)
})

test('a legacy item list becomes counts and drops unknown ids', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { mining: { xp: 1 } },
      inventory: [
        { id: 'iron-ore', name: 'Iron Ore', quantity: 2, description: 'Ore' },
        { id: 'iron-ore', name: 'Iron Ore', quantity: 1.9, description: 'Ore' },
        { id: 'potion', name: 'Potion', quantity: 2, description: 'Heals' },
      ],
      gold: -5,
    },
    SAVE_VERSION,
  )

  expect(next.inventory).toEqual({ 'iron-ore': 3 })
  expect(next.gold).toBe(0)
})

test('version 19 keeps item counts and gold', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { mining: { xp: 10 } },
      inventory: { 'iron-ore': 3, 'not-an-item': 9, coal: 0 },
      gold: 40.8,
      lastSaved: '2020-01-01T00:00:00.000Z',
      lastTick: 1_000,
      activeAction: null,
    },
    SAVE_VERSION,
  )

  expect(next.inventory).toEqual({ 'iron-ore': 3 })
  expect(next.gold).toBe(40)
  expect(next.classId).toBeNull()
  expect(next.classXp).toBe(0)
})

test('version 19 keeps the highest class XP from legacy classes map', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { mining: { xp: 10 } },
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
    SAVE_VERSION,
  )

  expect(next.classId).toBe('barbarian')
  expect(next.classXp).toBe(500)
  expect(next.clericFocus).toBe('STR')
  expect(next.inventory).toEqual({ dagger: 1 })
  expect(next.gold).toBe(25)
  expect(next.equipment).toEqual(emptyEquipment())
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

test('migration picks the highest-XP class at v19', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { mining: { xp: 10 } },
      inventory: {},
      gold: 0,
      activeClassId: 'wizard',
      classes: { barbarian: { xp: 500 }, wizard: { xp: 80 }, fighter: { xp: 1200 } },
      clericFocus: 'INT',
    },
    SAVE_VERSION,
  )

  expect(next.classId).toBe('fighter')
  expect(next.classXp).toBe(1200)
})

test('a save without inventoryTabs puts every owned item on Tab 1', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { mining: { xp: 10 } },
      inventory: { 'iron-ore': 3, coal: 1 },
      gold: 0,
      classId: 'fighter',
      classXp: 0,
    },
    SAVE_VERSION,
  )

  expect(next.inventoryTabs).toHaveLength(5)
  expect(next.inventoryTabs[0].name).toBe('Tab 1')
  expect(next.inventoryTabs[0].itemIds).toEqual(expect.arrayContaining(['iron-ore', 'coal']))
  expect(next.inventoryTabs[0].itemIds).toHaveLength(2)
  expect(next.inventoryTabs.slice(1).every((tab) => tab.itemIds.length === 0)).toBe(true)
})

test('legacy component bags convert to gold at old sell values', () => {
  const next = migrateSave(
    {
      characterName: 'ada',
      skills: { mining: { xp: 0 } },
      inventory: {
        'component-bag-basic': 2,
        'component-bag-fine': 1,
        'iron-ore': 3,
      },
      gold: 10,
      classId: 'wizard',
      classXp: 0,
    },
    SAVE_VERSION,
  )
  expect(next.inventory['component-bag-basic']).toBeUndefined()
  expect(next.inventory['component-bag-fine']).toBeUndefined()
  expect(next.inventory['iron-ore']).toBe(3)
  expect(next.gold).toBe(10 + 2 * 12 + 50)
})