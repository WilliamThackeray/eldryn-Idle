import { expect, test } from 'vitest'
import { SKILL_ABILITY_GROUPS, SKILLS } from './skills'

test('lists the 19 trade skills under the six abilities', () => {
  const ids = (ability: string) => SKILLS.filter((skill) => skill.ability === ability).map((skill) => skill.id)

  expect(SKILLS).toHaveLength(19)
  expect(ids('STR')).toEqual(['mining', 'smithing', 'woodcutting'])
  expect(ids('DEX')).toEqual(['woodcraft', 'leatherworking', 'jewelcrafting', 'thievery'])
  expect(ids('CON')).toEqual(['cooking', 'vitality'])
  expect(ids('INT')).toEqual(['alchemy', 'scribing', 'enchanting', 'weaving'])
  expect(ids('WIS')).toEqual(['foraging', 'fishing', 'hunting'])
  expect(ids('CHA')).toEqual(['commerce', 'performance', 'binding'])
  expect(SKILL_ABILITY_GROUPS).toEqual(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'])
})
