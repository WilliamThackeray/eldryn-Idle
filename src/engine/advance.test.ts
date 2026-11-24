import { expect, test } from 'vitest'
import { getActivity } from '../data/activities'
import { modifiersFor } from '../data/classes'
import { initialSkillProgress, type SkillId } from '../data/skills'
import { deriveAbilities } from './abilities'
import { advance, cappedAway, summarizeGains, type AdvanceState } from './advance'
import type { Inventory } from './inventory'
import { mulberry32, type Rng } from './rng'
import { xpForLevel } from './xp'

const HOUR = 60 * 60 * 1000

function scripted(...values: number[]): Rng {
  let index = 0
  return () => values[index++]
}

function training(skillId: SkillId, baseXp = 10, dexXp = 0): AdvanceState {
  const skills = initialSkillProgress()
  skills.thievery = { xp: dexXp }
  return {
    skills,
    inventory: {},
    gold: 0,
    activeAction: {
      kind: 'skill',
      skillId,
      activityId: 'basic',
      label: 'Basic Training',
      baseIntervalMs: 6000,
      requiredLevel: 1,
      baseXp,
      progressMs: 0,
    },
  }
}

test('advance over 60s at a 6s interval resolves exactly 10 actions', () => {
  const result = advance(training('mining', 10), 60_000, mulberry32(1))

  expect(result.log.filter((event) => event.kind === 'skill')).toHaveLength(10)
  expect(result.state.activeAction).toMatchObject({ kind: 'skill', progressMs: 0 })
  expect(result.state.inventory).toEqual({})
  expect(result.state.skills.mining.xp).toBeGreaterThan(0)
})

test('a partial interval is kept for the next tick', () => {
  const result = advance(training('mining', 10), 5_999, scripted(0.45))

  expect(result.log).toHaveLength(0)
  expect(result.state.activeAction).toMatchObject({ progressMs: 5999 })
  expect(result.state.skills.mining.xp).toBe(0)
})

test('XP uses the skill check and ability modifiers', () => {
  const result = advance(training('mining', 10), 6000, scripted(0.45), modifiersFor('barbarian'))

  expect(result.log[0]).toMatchObject({
    roll: 10,
    total: 12,
    dc: 10,
    tier: 'standard',
    xp: 13,
  })
  expect(result.state.skills.mining.xp).toBe(13)
})

test('DEX is ignored for an INT skill', () => {
  const dexXp = xpForLevel(99)
  const physical = training('mining', 0, dexXp)
  const mental = training('enchanting', 0, dexXp)

  expect(deriveAbilities(physical.skills).find((ability) => ability.abbr === 'DEX')?.modifier).toBe(5)

  const fast = advance(physical, 60_000, mulberry32(2))
  const slow = advance(mental, 60_000, mulberry32(2))

  expect(fast.log.length).toBeGreaterThan(10)
  expect(slow.log).toHaveLength(10)
  expect(slow.state.activeAction).toMatchObject({ progressMs: 0 })
})

test('summarizeGains reports skill XP, levels, item gains, and gold', () => {
  const before = initialSkillProgress()
  const after = initialSkillProgress()
  after.mining = { xp: 100 }

  expect(summarizeGains(before, after, { 'iron-ore': 1 }, { 'iron-ore': 1, 'steel-bar': 2 }, 5, 9)).toEqual({
    skills: [{ skillId: 'mining', xp: 100, levels: 1 }],
    items: [{ id: 'steel-bar', name: 'Steel Bar', quantity: 2 }],
    gold: 4,
    favor: 0,
    classXp: 0,
    kills: 0,
    defeated: false,
  })
})

function doing(skillId: SkillId, activityId: string, inventory: Inventory = {}): AdvanceState {
  const activity = getActivity(skillId, activityId)
  if (!activity) throw new Error(`missing activity ${skillId}:${activityId}`)
  return {
    skills: initialSkillProgress(),
    inventory,
    gold: 0,
    activeAction: {
      kind: 'skill',
      skillId,
      activityId: activity.id,
      label: activity.name,
      baseIntervalMs: activity.baseIntervalMs,
      requiredLevel: activity.requiredLevel,
      baseXp: activity.xp,
      progressMs: 0,
    },
  }
}

test('a critical doubles outputs and rolls the rare table', () => {
  // After the crit d20: skip mica, skip sulfur, hit rare coal, skip rare quartz.
  const result = advance(doing('mining', 'mine-iron'), 6000, scripted(0.95, 0.99, 0.99, 0, 0.99))

  expect(result.log[0]).toMatchObject({ tier: 'exceptional' })
  expect(result.state.inventory).toEqual({ 'iron-ore': 2, coal: 2 })
})

test('a failed craft consumes every input and grants nothing', () => {
  const result = advance(doing('smithing', 'smith-steel', { 'iron-ore': 1, coal: 1 }), 6000, scripted(0.2))

  expect(result.log[0]).toMatchObject({ tier: 'fail', items: [] })
  expect(result.state.inventory).toEqual({})
  expect(result.state.skills.smithing.xp).toBeGreaterThan(0)
  expect(result.state.activeAction).not.toBeNull()
})

test('a fumble can grant the byproduct after spending inputs', () => {
  const result = advance(doing('smithing', 'smith-steel', { 'iron-ore': 1, coal: 1 }), 6000, scripted(0, 0))

  expect(result.log[0]).toMatchObject({ tier: 'fumble' })
  expect(result.state.inventory).toEqual({ slag: 1 })
})

test('the action stops when an input is missing and spends nothing', () => {
  const result = advance(doing('smithing', 'smith-steel', { 'iron-ore': 1 }), 6000, scripted(0.45))

  expect(result.log.map((event) => event.kind)).toEqual(['materials'])
  expect(result.state.inventory).toEqual({ 'iron-ore': 1 })
  expect(result.state.skills.smithing.xp).toBe(0)
  expect(result.state.activeAction).toBeNull()
})

test('the action stops once inputs run out', () => {
  let calls = 0
  const rng: Rng = () => {
    calls += 1
    return 0.45
  }
  const result = advance(doing('smithing', 'smith-steel', { 'iron-ore': 1, coal: 1 }), 18_000, rng)

  expect(result.log.map((event) => event.kind)).toEqual(['skill', 'materials'])
  expect(result.state.inventory).toEqual({ 'steel-bar': 1 })
  expect(result.state.activeAction).toBeNull()
  // Skill check + Rank-1 STR yield fractional roll.
  expect(calls).toBe(2)
})

test('pickpocketing adds gold', () => {
  const result = advance(doing('thievery', 'pickpocket-peasant'), 6000, scripted(0.45, 0))

  expect(result.log[0]).toMatchObject({ tier: 'standard', gold: 2, items: [] })
  expect(result.state.gold).toBe(2)
  expect(result.state.inventory).toEqual({})
})

test('a fine smithing check produces a fine longsword, not extra swords', () => {
  const result = advance(doing('smithing', 'smith-longsword', { 'iron-bar': 3 }), 6000, scripted(0.6, 0.99))
  expect(result.log[0]).toMatchObject({ tier: 'fine' })
  expect(result.state.inventory).toEqual({ 'longsword@fine': 1 })
})

test('enchanting keeps the consumed weapon quality', () => {
  const result = advance(
    doing('enchanting', 'enchant-longsword-plus1', {
      'longsword@fine': 1,
      'arcane-dust': 5,
      'cut-quartz': 1,
      sulfur: 1,
    }),
    6000,
    scripted(0.45, 0.99),
  )
  expect(result.state.inventory['longsword@fine+1']).toBe(1)
  expect(result.state.inventory['longsword@fine']).toBeUndefined()
})

test('a fine mining check multiplies ore and does not mint a quality item', () => {
  const result = advance(doing('mining', 'mine-iron'), 6000, scripted(0.6, 0.99, 0.99, 0, 0.99))
  expect(result.state.inventory['iron-ore']).toBe(2)
  expect(result.state.inventory['iron-ore@fine']).toBeUndefined()
})

test('cooking turns a raw fish into a meal', () => {
  const result = advance(doing('cooking', 'cook-forest-fish', { 'raw-forest-fish': 1 }), 6000, scripted(0.45))

  expect(result.state.inventory).toEqual({ 'cooked-forest-fish': 1 })
  expect(result.state.activeAction).not.toBeNull()
})

test('the offline cap clamps 48h to 24h', () => {
  expect(cappedAway(48 * HOUR)).toEqual({ elapsedMs: 24 * HOUR, cappedMs: 24 * HOUR })
  expect(cappedAway(HOUR)).toEqual({ elapsedMs: HOUR, cappedMs: 0 })
  expect(cappedAway(-5)).toEqual({ elapsedMs: 0, cappedMs: 0 })
})
