import { expect, test } from 'vitest'
import { initialSkillProgress } from './skills'
import { activityIntervalMs } from '../engine/advance'
import { emptyEquipment } from '../engine/equipment'
import {
  GENERAL_GOODS,
  buyGood,
  buyUpgrade,
  getShopUpgrade,
  intervalBonus,
} from './shop'
import { getItem } from './items'

test('buying farm plot spends gold, herbs, and favor', () => {
  const skills = initialSkillProgress()
  const bought = buyUpgrade(
    {
      gold: 100,
      favor: 8,
      inventory: { 'forest-herbs': 5 },
      upgrades: {},
      skills,
    },
    'extra-farm-plot',
  )
  expect(bought.gold).toBe(0)
  expect(bought.favor).toBe(0)
  expect(bought.inventory['forest-herbs']).toBeUndefined()
  expect(bought.upgrades['extra-farm-plot']).toBe(0)
})

test('short gold leaves inventory and upgrades untouched', () => {
  const skills = initialSkillProgress()
  const state = {
    gold: 99,
    favor: 8,
    inventory: { 'forest-herbs': 5 },
    upgrades: {},
    skills,
  }
  const bought = buyUpgrade(state, 'extra-farm-plot')
  expect(bought).toEqual(state)
})

test('short items leaves gold untouched', () => {
  const skills = initialSkillProgress()
  const state = { gold: 100, favor: 8, inventory: {}, upgrades: {}, skills }
  const bought = buyUpgrade(state, 'extra-farm-plot')
  expect(bought.gold).toBe(100)
  expect(bought.upgrades).toEqual({})
})

test('a soon tier does not buy', () => {
  const skills = initialSkillProgress()
  const bought = buyUpgrade(
    { gold: 1000, favor: 0, inventory: {}, upgrades: {}, skills },
    'bellows',
  )
  expect(bought.upgrades).toEqual({})
  expect(getShopUpgrade('bellows')?.tiers[0]?.effect.kind).toBe('soon')
})

test('a favor cost spends favor when affordable', () => {
  const skills = initialSkillProgress()
  const short = buyUpgrade(
    { gold: 200, favor: 0, inventory: {}, upgrades: {}, skills },
    'guild-discount',
  )
  expect(short.upgrades).toEqual({})
  expect(short.gold).toBe(200)

  const bought = buyUpgrade(
    { gold: 200, favor: 10, inventory: {}, upgrades: {}, skills },
    'guild-discount',
  )
  expect(bought.favor).toBe(0)
  expect(bought.gold).toBe(0)
  expect(bought.upgrades['guild-discount']).toBe(0)
})

test('intervalBonus applies to herb plot only', () => {
  expect(intervalBonus({ 'extra-farm-plot': 0 }, 'herb-plot')).toBe(0.5)
  expect(intervalBonus({ 'extra-farm-plot': 0 }, 'mine-iron')).toBe(0)
})

test('farm plot halves herb plot interval', () => {
  const skills = initialSkillProgress()
  const plot = 30 * 60 * 1000
  expect(activityIntervalMs('foraging', plot, skills, emptyEquipment(), 0.5)).toBe(plot * 0.5)
})

test('general goods are not gear or ammo', () => {
  for (const good of GENERAL_GOODS) {
    const def = getItem(good.itemId)
    expect(def).toBeTruthy()
    if (good.itemId.startsWith('padded-')) continue
    expect(def?.category).not.toBe('gear')
    expect(def?.category).not.toBe('ammo')
  }
})

test('buyGood spends gold only', () => {
  const price = (getItem('empty-vial')?.sellValue ?? 0) * 2
  const bought = buyGood({}, price, 'empty-vial')
  expect(bought.gold).toBe(0)
  expect(bought.inventory['empty-vial']).toBe(1)
})
