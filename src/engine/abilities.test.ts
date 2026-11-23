import { expect, test } from 'vitest'
import { ABILITIES } from '../data/abilities'
import { initialSkillProgress, type SkillId } from '../data/skills'
import {
  abilityModifier,
  abilityScoreFromLevels,
  activePerks,
  deriveAbilities,
  effectTotal,
  nickCeiling,
} from './abilities'
import { xpForLevel } from './xp'

test('ability scores come from skill levels, and wisdom is spelled wisdom', () => {
  expect(ABILITIES.map((ability) => ability.id)).toEqual([
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
  ])
  expect(abilityScoreFromLevels([1])).toBe(10)
  expect(abilityScoreFromLevels([99])).toBe(20)
  expect(abilityScoreFromLevels([1, 99])).toBe(15)
  expect(abilityScoreFromLevels([1, 99], 'highest')).toBe(20)
  expect(abilityScoreFromLevels([])).toBe(10)
  expect(abilityModifier(10)).toBe(0)
  expect(abilityModifier(20)).toBe(5)
  expect(abilityModifier(22)).toBe(6)

  const fresh = deriveAbilities(initialSkillProgress())
  expect(fresh).toHaveLength(6)
  expect(fresh.every((ability) => ability.score === 10 && ability.modifier === 0 && ability.rank === 1)).toBe(
    true,
  )

  const mastered = initialSkillProgress()
  for (const id of Object.keys(mastered) as SkillId[]) mastered[id] = { xp: xpForLevel(99) }
  const derived = deriveAbilities(mastered, { STR: 4 }, 'average')
  expect(derived.every((ability) => ability.abbr === 'STR' || ability.score === 20)).toBe(true)
  expect(derived.find((ability) => ability.abbr === 'STR')).toMatchObject({ score: 24, modifier: 7 })
  expect(derived.find((ability) => ability.abbr === 'CON')?.score).toBe(20)

  const ranked = deriveAbilities(mastered, { STR: 4 }, 'rank')
  expect(ranked.every((ability) => ability.abbr === 'STR' || ability.score === 20)).toBe(true)
  expect(ranked.find((ability) => ability.abbr === 'STR')).toMatchObject({ score: 24, rank: 20 })
})

test('Mining 99 alone → STR Rank 20 Score 20', () => {
  const skills = initialSkillProgress()
  skills.mining = { xp: xpForLevel(99) }
  const derived = deriveAbilities(skills, {}, 'rank')
  expect(derived.find((a) => a.abbr === 'STR')).toMatchObject({ rank: 20, score: 20 })
  expect(derived.filter((a) => a.abbr !== 'STR').every((a) => a.rank === 1 && a.score === 10)).toBe(true)
})

test('Enchanting 50 alone → INT Rank 10 Score 15', () => {
  const skills = initialSkillProgress()
  skills.enchanting = { xp: xpForLevel(50) }
  const derived = deriveAbilities(skills, {}, 'rank')
  expect(derived.find((a) => a.abbr === 'INT')).toMatchObject({ rank: 10, score: 15 })
})

test('INT reaches Rank 20 from a mix of 5 skills at level 80', () => {
  const skills = initialSkillProgress()
  for (const id of ['alchemy', 'scribing', 'enchanting', 'weaving'] as const) {
    skills[id] = { xp: xpForLevel(99) }
  }
  const derived = deriveAbilities(skills, {}, 'rank')
  expect(derived.find((a) => a.abbr === 'INT')).toMatchObject({ rank: 20, score: 20 })
})

test('mastery perks activate at the right ranks', () => {
  const at = (level: number) => {
    const skills = initialSkillProgress()
    skills.mining = { xp: xpForLevel(level) }
    skills.thievery = { xp: xpForLevel(level) }
    skills.vitality = { xp: xpForLevel(level) }
    return activePerks({ skills })
  }

  // Rank 4 = tier(level) for levels 16–20
  const rank4 = at(16)
  expect(rank4.some((p) => p.id === 'str-save-bar')).toBe(false)
  expect(effectTotal(rank4, 'skillYieldPct', 'STR')).toBeCloseTo(0.04)

  const rank5 = at(21)
  expect(rank5.some((p) => p.id === 'str-save-bar')).toBe(true)
  expect(effectTotal(rank5, 'skillYieldPct', 'STR')).toBeCloseTo(0.05)

  const rank10 = at(46)
  expect(nickCeiling(rank10)).toBe(3)
  expect(effectTotal(rank10, 'skillYieldPct', 'STR')).toBeCloseTo(0.1)

  const rank20 = at(99)
  expect(effectTotal(rank20, 'brutalCritDice')).toBe(1)
  expect(rank20.some((p) => p.id === 'con-survive')).toBe(true)
})
