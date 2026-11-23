import { expect, test } from 'vitest'
import { getActivity } from '../data/activities'
import { modifiersFor } from '../data/classes'
import { getMonster } from '../data/monsters'
import { initialSkillProgress } from '../data/skills'
import { advance, activityIntervalMs, type AdvanceState } from './advance'
import { emptyEquipment } from './equipment'
import {
  discountTomeInputs,
  noteYieldPct,
  tickBuffs,
  tomeCheckBonus,
  tomePageCost,
  tomeSpeedBonus,
  tomeXpPct,
  type ActiveBuff,
} from './history'
import { computeCombatStats } from './combatStats'
import { playerToHitBonus } from './combat/attack'
import { skillCheck } from './skillCheck'
import { applyXpModifiers, xpForLevel } from './xp'
import { mulberry32 } from './rng'
import { HISTORY_NOTE_DURATION_MS, HISTORY_NOTE_YIELD_PCT } from './config'

test('tome XP stacks with class modifiers and caps at HISTORY_MAX_XP_PCT', () => {
  const barbarian = modifiersFor('barbarian')
  expect(applyXpModifiers(100, 'STR', barbarian, tomeXpPct({ mining: 3 }, 'mining'))).toBeCloseTo(133)
  expect(applyXpModifiers(100, 'STR', {}, tomeXpPct({ mining: 10 }, 'mining'))).toBeCloseTo(110)
  expect(applyXpModifiers(100, 'STR', {}, tomeXpPct({ mining: 99 }, 'mining'))).toBeCloseTo(110)
})

test('Vol. V cuts the skill interval by 5% before the floor', () => {
  const skills = initialSkillProgress()
  const base = activityIntervalMs('mining', 6000, skills, emptyEquipment(), 0)
  const faster = activityIntervalMs(
    'mining',
    6000,
    skills,
    emptyEquipment(),
    tomeSpeedBonus({ mining: 5 }, 'mining'),
  )
  expect(faster).toBeCloseTo(base * 0.95, 5)
  expect(tomeSpeedBonus({ mining: 4 }, 'mining')).toBe(0)
})

test('Vol. X adds +1 to the skill-check total', () => {
  expect(tomeCheckBonus({ mining: 10 }, 'mining')).toBe(1)
  const without = skillCheck({
    rng: () => 0.45,
    abilityModifier: 0,
    skillLevel: 1,
    requiredLevel: 1,
  })
  const withTome = skillCheck({
    rng: () => 0.45,
    abilityModifier: 0,
    skillLevel: 1,
    requiredLevel: 1,
    checkBonus: tomeCheckBonus({ mining: 10 }, 'mining'),
  })
  expect(withTome.total).toBe(without.total + 1)
})

test('buffs tick with action time, expire offline, and idle does not tick', () => {
  const buff: ActiveBuff = {
    id: 'notes-mining',
    effect: { type: 'noteYield', groupId: 'mining', value: HISTORY_NOTE_YIELD_PCT },
    remainingMs: HISTORY_NOTE_DURATION_MS,
  }
  const skills = initialSkillProgress()
  const state: AdvanceState = {
    skills,
    inventory: {},
    gold: 0,
    activeAction: {
      kind: 'skill',
      skillId: 'mining',
      activityId: 'mine-iron',
      label: 'Mine Iron',
      baseIntervalMs: 6000,
      requiredLevel: 1,
      baseXp: 10,
      progressMs: 0,
    },
    activeBuffs: [buff],
  }
  const ticked = advance(state, 6000, mulberry32(1))
  expect(ticked.state.activeBuffs?.[0]?.remainingMs).toBe(HISTORY_NOTE_DURATION_MS - 6000)

  const expired = advance(
    { ...state, activeBuffs: [{ ...buff, remainingMs: 3000 }] },
    60 * 60 * 1000,
    mulberry32(2),
  )
  expect(expired.state.activeBuffs).toEqual([])

  const idle = advance(
    { ...state, activeAction: null, activeBuffs: [buff] },
    60_000,
    mulberry32(3),
  )
  expect(idle.state.activeBuffs?.[0]?.remainingMs).toBe(HISTORY_NOTE_DURATION_MS)
})

test('mining notes boost mine yield and leave smithing alone', () => {
  const buffs: ActiveBuff[] = [
    {
      id: 'notes-mining',
      effect: { type: 'noteYield', groupId: 'mining', value: HISTORY_NOTE_YIELD_PCT },
      remainingMs: HISTORY_NOTE_DURATION_MS,
    },
  ]
  expect(noteYieldPct(buffs, 'mine-iron')).toBe(0.1)
  expect(noteYieldPct(buffs, 'smith-iron')).toBe(0)

  const skills = initialSkillProgress()
  const withNote: AdvanceState = {
    skills,
    inventory: {},
    gold: 0,
    activeAction: {
      kind: 'skill',
      skillId: 'mining',
      activityId: 'mine-iron',
      label: 'Mine Iron',
      baseIntervalMs: 6000,
      requiredLevel: 1,
      baseXp: 10,
      progressMs: 0,
    },
    activeBuffs: buffs,
  }
  const noted = advance(withNote, 6000, () => 0.99)
  const plain = advance({ ...withNote, activeBuffs: [] }, 6000, () => 0.99)
  const notedOre = noted.state.inventory['iron-ore'] ?? 0
  const plainOre = plain.state.inventory['iron-ore'] ?? 0
  expect(notedOre).toBeGreaterThanOrEqual(plainOre)
})

test('INT R10 removes one Ancient Page from tome costs', () => {
  expect(tomePageCost(1, 1)).toBe(0)
  expect(tomePageCost(3, 1)).toBe(2)
  const activity = getActivity('scribing', 'craft-tome-mining-1')
  expect(activity).toBeTruthy()
  const discounted = discountTomeInputs(activity!.id, activity!.inputs ?? [], 1)
  expect(discounted.find((stack) => stack.itemId === 'ancient-page')?.quantity).toBe(0)
  const vol3 = getActivity('scribing', 'craft-tome-mining-3')!
  expect(discountTomeInputs(vol3.id, vol3.inputs ?? [], 1).find((s) => s.itemId === 'ancient-page')?.quantity).toBe(2)
})

test('bestiary volumes add to-hit in combatStats against that creature type', () => {
  const skills = initialSkillProgress()
  skills.mining = { xp: xpForLevel(20) }
  const equipment = emptyEquipment()
  const monster = getMonster('wolf')!
  const bestiaries = { beast: 2 }
  const stats = computeCombatStats(
    {
      skills,
      equipment,
      classId: 'fighter',
      classXp: xpForLevel(15),
      inventory: {},
      bestiaries,
    },
    monster,
  )
  expect(stats.toHit.parts.some((part) => part.label === 'Bestiary' && part.value === 2)).toBe(true)
  expect(stats.toHit.value).toBe(
    playerToHitBonus(skills, equipment, xpForLevel(15), 'fighter', 2),
  )
})

test('tickBuffs removes expired entries', () => {
  expect(tickBuffs([{ id: 'a', effect: { type: 'noteYield', groupId: 'mining', value: 0.1 }, remainingMs: 5 }], 10)).toEqual([])
})
