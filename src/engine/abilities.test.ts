import { expect, test } from 'vitest'
import { ABILITIES } from '../data/abilities'
import { initialSkillProgress, type SkillId } from '../data/skills'
import { abilityModifier, abilityScoreFromLevels, deriveAbilities } from './abilities'
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
  expect(fresh.every((ability) => ability.score === 10 && ability.modifier === 0)).toBe(true)

  const mastered = initialSkillProgress()
  for (const id of Object.keys(mastered) as SkillId[]) mastered[id] = { xp: xpForLevel(99) }
  const derived = deriveAbilities(mastered, { STR: 4 })
  expect(derived.every((ability) => ability.abbr === 'STR' || ability.score === 20)).toBe(true)
  expect(derived.find((ability) => ability.abbr === 'STR')).toMatchObject({ score: 24, modifier: 7 })
  expect(derived.find((ability) => ability.abbr === 'CON')?.score).toBe(20)
})
