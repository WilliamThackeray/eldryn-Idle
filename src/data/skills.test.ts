import { expect, test } from 'vitest'
import { SKILLS } from './skills'

test('lists the 18 skills on their 5e abilities', () => {
  const ids = (ability: string) => SKILLS.filter((skill) => skill.ability === ability).map((skill) => skill.id)

  expect(SKILLS).toHaveLength(18)
  expect(ids('STR')).toEqual(['athletics'])
  expect(ids('DEX')).toEqual(['acrobatics', 'sleightOfHand', 'stealth'])
  expect(ids('INT')).toEqual(['arcana', 'history', 'investigation', 'nature', 'religion'])
  expect(ids('WIS')).toEqual(['animalHandling', 'insight', 'medicine', 'perception', 'survival'])
  expect(ids('CHA')).toEqual(['deception', 'intimidation', 'performance', 'persuasion'])
  expect(ids('CON')).toEqual([])
})
