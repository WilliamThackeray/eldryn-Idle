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

test('buying pickaxe I spends gold and iron bars atomically', () => {
  const skills = initialSkillProgress()
  const bought = buyUpgrade(
    { gold: 50, inventory: { 'iron-bar': 1 }, upgrades: {}, skills },
    'pickaxe',
  )
  expect(bought.gold).toBe(0)
  expect(bought.inventory['iron-bar']).toBeUndefined()
  expect(bought.upgrades.pickaxe).toBe(0)
})

test('short gold leaves inventory and upgrades untouched', () => {
  const skills = initialSkillProgress()
  const state = { gold: 49, inventory: { 'iron-bar': 1 }, upgrades: {}, skills }
  const bought = buyUpgrade(state, 'pickaxe')
  expect(bought).toEqual(state)
})

test('short items leaves gold untouched', () => {
  const skills = initialSkillProgress()
  const state = { gold: 50, inventory: {}, upgrades: {}, skills }
  const bought = buyUpgrade(state, 'pickaxe')
  expect(bought.gold).toBe(50)
  expect(bought.upgrades).toEqual({})
})

test('a soon tier does not buy', () => {
  const skills = initialSkillProgress()
  const bought = buyUpgrade(
    { gold: 1000, inventory: {}, upgrades: {}, skills },
    'bellows',
  )
  expect(bought.upgrades).toEqual({})
  expect(getShopUpgrade('bellows')?.tiers[0]?.effect.kind).toBe('soon')
})

test('a favor cost does not buy', () => {
  const skills = initialSkillProgress()
  const bought = buyUpgrade(
    { gold: 100, inventory: {}, upgrades: {}, skills },
    'guild-discount',
  )
  expect(bought.upgrades).toEqual({})
  expect(bought.gold).toBe(100)
})

test('intervalBonus applies to mining and not smithing', () => {
  expect(intervalBonus({ pickaxe: 0 }, 'mine-iron')).toBe(0.05)
  expect(intervalBonus({ pickaxe: 0 }, 'smith-dagger')).toBe(0)
})

test('pickaxe shortens mining interval and farm plot halves herb plot', () => {
  const skills = initialSkillProgress()
  expect(activityIntervalMs('athletics', 6000, skills, emptyEquipment(), 0.05)).toBe(5700)

  const plot = 30 * 60 * 1000
  expect(activityIntervalMs('nature', plot, skills, emptyEquipment(), 0.5)).toBe(plot * 0.5)
})

test('general goods are not gear or ammo', () => {
  for (const good of GENERAL_GOODS) {
    const def = getItem(good.itemId)
    expect(def).toBeTruthy()
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
