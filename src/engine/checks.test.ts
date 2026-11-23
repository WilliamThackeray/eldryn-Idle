import { expect, test } from 'vitest'
import { initialSkillProgress } from '../data/skills'
import { xpForLevel } from './xp'
import { checkModifier, formatCheck, rollCheck, toolCheckModifier } from './checks'
import type { Rng } from './rng'

function scripted(...values: number[]): Rng {
  let index = 0
  return () => values[index++]!
}

test('proficient Fighter athletics gets class proficiency; arcana does not', () => {
  const state = {
    skills: initialSkillProgress(),
    classId: 'fighter' as const,
    classXp: 0,
  }
  const athletics = checkModifier(state, 'athletics')
  expect(athletics).toMatchObject({
    proficient: true,
    proficiency: 2,
    abilityMod: 0,
    total: 2,
  })
  const arcana = checkModifier(state, 'arcana')
  expect(arcana).toMatchObject({
    proficient: false,
    proficiency: 0,
    total: 0,
  })
})

test('class level 21 is proficiency +3', () => {
  const state = {
    skills: initialSkillProgress(),
    classId: 'fighter' as const,
    classXp: xpForLevel(21),
  }
  expect(checkModifier(state, 'athletics').proficiency).toBe(3)
})

test('tool check uses the trade skill tier, not class proficiency', () => {
  const skills = initialSkillProgress()
  skills.thievery = { xp: xpForLevel(21) }
  const mod = toolCheckModifier({ skills }, 'thievery')
  expect(mod).toMatchObject({
    proficient: true,
    proficiency: 3,
    ability: 'DEX',
  })
})

test('formatCheck omits Proficient when not proficient', () => {
  expect(
    formatCheck({
      name: 'Arcana',
      ability: 'INT',
      abilityMod: 1,
      proficiency: 0,
      total: 1,
      proficient: false,
    }),
  ).toBe('Arcana +1 (INT +1)')
  expect(
    formatCheck({
      name: 'Perception',
      ability: 'WIS',
      abilityMod: 2,
      proficiency: 3,
      total: 5,
      proficient: true,
    }),
  ).toBe('Perception +5 (WIS +2, Proficient +3)')
})

test('advantage keeps the higher d20; nat 1 fails even when total beats DC', () => {
  const mod = {
    name: 'Athletics',
    ability: 'STR' as const,
    abilityMod: 20,
    proficiency: 0,
    total: 20,
    proficient: false,
  }
  expect(rollCheck(scripted(0, 0.95), mod, 10, 'advantage')).toMatchObject({
    roll: 20,
    success: true,
  })
  expect(rollCheck(scripted(0), mod, 10)).toMatchObject({
    roll: 1,
    success: false,
  })
})
