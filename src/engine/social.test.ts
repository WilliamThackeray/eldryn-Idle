import { expect, test } from 'vitest'
import { getDungeon } from '../data/dungeons'
import { initialSkillProgress } from '../data/skills'
import { buyUpgrade, getShopUpgrade } from '../data/shop'
import { consumeEntryItem, resolveTrap, type DungeonCheckContext } from './dungeon'
import { grantFavor } from './social'
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

test('inspiration rerolls a failed trap disarm; unspotted traps spend none', () => {
  const room = { kind: 'trap' as const, after: 0, requiredLevel: 10, damage: 6 }
  const low = initialSkillProgress()
  const hard = { ...room, requiredLevel: 99 }
  const miss = resolveTrap(
    hard,
    { skills: low, classId: 'fighter', classXp: 0 },
    () => 0,
    5,
  )
  expect(miss.spotted).toBe(false)
  expect(miss.inspirationSpent).toBe(0)

  const spotSkills = initialSkillProgress()
  spotSkills.foraging = { xp: xpForLevel(99) }
  spotSkills.thievery = { xp: xpForLevel(99) }
  const ctx: DungeonCheckContext = { skills: spotSkills, classId: 'fighter', classXp: xpForLevel(99) }
  // First roll nat 1, second roll nat 20 when inspiration spends.
  let rolls = 0
  const rng = () => {
    rolls += 1
    if (rolls === 1) return 0.99
    if (rolls === 2) return 0
    return 0.99
  }
  const ok = resolveTrap(room, ctx, rng, 1)
  expect(ok.spotted).toBe(true)
  expect(ok.disarmed).toBe(true)
  expect(ok.damage).toBe(0)
  expect(ok.inspirationSpent).toBe(1)
})
