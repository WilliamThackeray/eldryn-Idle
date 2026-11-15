import { expect, test } from 'vitest'
import { ABILITIES } from '../data/abilities'
import { initialSkillProgress } from '../data/skills'
import { abilityModifier, abilityScoreFromLevels, deriveAbilities } from './abilities'

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
  expect(abilityScoreFromLevels([])).toBe(10)
  expect(abilityModifier(10)).toBe(0)
  expect(abilityModifier(20)).toBe(5)

  const derived = deriveAbilities(initialSkillProgress())
  expect(derived.every((ability) => ability.score === 10 && ability.modifier === 0)).toBe(true)
})
