import { expect, test } from 'vitest'
import { getDungeon } from '../data/dungeons'
import { initialSkillProgress } from '../data/skills'
import { buyUpgrade, getShopUpgrade } from '../data/shop'
import { consumeEntryItem, resolveTrap } from './dungeon'
import { grantFavor, progressBounty } from './social'
import { xpForLevel } from './xp'

test('favor grant applies CHA favorPct', () => {
  expect(grantFavor(0, 4, 0.25)).toBe(5)
  expect(grantFavor(10, 1, 0)).toBe(11)
})

test('guild discount spends favor and gold; short favor fails', () => {
  const skills = initialSkillProgress()
  const short = buyUpgrade(
    { gold: 200, favor: 5, inventory: {}, upgrades: {}, skills },
    'guild-discount',
  )
  expect(short.upgrades).toEqual({})
  expect(short.favor).toBe(5)
  expect(short.gold).toBe(200)

  const bought = buyUpgrade(
    { gold: 200, favor: 10, inventory: {}, upgrades: {}, skills },
    'guild-discount',
  )
  expect(bought.gold).toBe(0)
  expect(bought.favor).toBe(0)
  expect(bought.upgrades['guild-discount']).toBe(0)
  expect(getShopUpgrade('guild-discount')?.tiers[0]?.effect).toEqual({
    kind: 'shopDiscount',
    pct: 0.05,
  })
})

test('hag hollow consumes forged writ; shifting thicket stays free', () => {
  const thicket = getDungeon('shifting-thicket')!
  const hollow = getDungeon('hag-hollow')!
  expect(consumeEntryItem({}, thicket).ok).toBe(true)

  const first = consumeEntryItem({ 'forged-writ': 1 }, hollow)
  expect(first.ok).toBe(true)
  expect(first.inventory['forged-writ']).toBeUndefined()

  const second = consumeEntryItem({}, hollow)
  expect(second.ok).toBe(false)
})

test('bounty progress ignores other monsters and completes on the Nth kill', () => {
  let bounty = { monsterId: 'wolf', need: 2, have: 0 }
  const inventory = {}
  const favor = 0
  const gold = 0
  const miss = progressBounty(bounty, 'deer', inventory, favor, gold, () => 0)
  expect(miss.bounty).toEqual(bounty)
  expect(miss.completed).toBe(false)

  const mid = progressBounty(bounty, 'wolf', inventory, favor, gold, () => 0)
  expect(mid.bounty).toEqual({ monsterId: 'wolf', need: 2, have: 1 })
  expect(mid.completed).toBe(false)

  bounty = mid.bounty!
  const done = progressBounty(bounty, 'wolf', inventory, favor, gold, () => 0)
  expect(done.completed).toBe(true)
  expect(done.bounty).toBeNull()
  expect(done.favor).toBe(5)
  expect(done.goldGained).toBe(25)
})

test('inspiration rerolls a failed trap disarm; unspotted traps spend none', () => {
  const room = { kind: 'trap' as const, after: 0, requiredLevel: 10, damage: 6 }
  const low = initialSkillProgress()
  const hard = { ...room, requiredLevel: 99 }
  const miss = resolveTrap(hard, low, () => 0, 5)
  expect(miss.spotted).toBe(false)
  expect(miss.inspirationSpent).toBe(0)

  const spotSkills = initialSkillProgress()
  spotSkills.perception = { xp: xpForLevel(99) }
  // First roll nat 1, second roll nat 20 when inspiration spends.
  let rolls = 0
  const rng = () => {
    rolls += 1
    return rolls === 1 ? 0 : 0.99
  }
  const ok = resolveTrap(room, spotSkills, rng, 1)
  expect(ok.spotted).toBe(true)
  expect(ok.disarmed).toBe(true)
  expect(ok.damage).toBe(0)
  expect(ok.inspirationSpent).toBe(1)
})
