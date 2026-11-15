import { expect, test } from 'vitest'
import { SKILL_ABILITY_GROUPS, SKILLS } from './skills'

test('lists the 5e skills plus hidden Vitality on Constitution', () => {
  const ids = (ability: string) => SKILLS.filter((skill) => skill.ability === ability).map((skill) => skill.id)

  expect(SKILLS).toHaveLength(19)
  expect(ids('STR')).toEqual(['athletics'])
  expect(ids('DEX')).toEqual(['acrobatics', 'sleightOfHand', 'stealth'])
  expect(ids('CON')).toEqual(['vitality'])
  expect(ids('INT')).toEqual(['arcana', 'history', 'investigation', 'nature', 'religion'])
  expect(ids('WIS')).toEqual(['animalHandling', 'insight', 'medicine', 'perception', 'survival'])
  expect(ids('CHA')).toEqual(['deception', 'intimidation', 'performance', 'persuasion'])
  expect(SKILL_ABILITY_GROUPS).not.toContain('CON')
})
