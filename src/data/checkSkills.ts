import type { AbilityAbbr } from '../types/game'

export interface CheckSkillDefinition {
  id: string
  name: string
  ability: AbilityAbbr
}

export const CHECK_SKILLS = [
  { id: 'athletics', name: 'Athletics', ability: 'STR' },
  { id: 'acrobatics', name: 'Acrobatics', ability: 'DEX' },
  { id: 'sleightOfHand', name: 'Sleight of Hand', ability: 'DEX' },
  { id: 'stealth', name: 'Stealth', ability: 'DEX' },
  { id: 'arcana', name: 'Arcana', ability: 'INT' },
  { id: 'history', name: 'History', ability: 'INT' },
  { id: 'investigation', name: 'Investigation', ability: 'INT' },
  { id: 'nature', name: 'Nature', ability: 'INT' },
  { id: 'religion', name: 'Religion', ability: 'INT' },
  { id: 'animalHandling', name: 'Animal Handling', ability: 'WIS' },
  { id: 'insight', name: 'Insight', ability: 'WIS' },
  { id: 'medicine', name: 'Medicine', ability: 'WIS' },
  { id: 'perception', name: 'Perception', ability: 'WIS' },
  { id: 'survival', name: 'Survival', ability: 'WIS' },
  { id: 'deception', name: 'Deception', ability: 'CHA' },
  { id: 'intimidation', name: 'Intimidation', ability: 'CHA' },
  { id: 'performance', name: 'Performance', ability: 'CHA' },
  { id: 'persuasion', name: 'Persuasion', ability: 'CHA' },
] as const satisfies readonly CheckSkillDefinition[]

export type CheckSkillId = (typeof CHECK_SKILLS)[number]['id']

const CHECK_IDS = new Set<string>(CHECK_SKILLS.map((skill) => skill.id))

export function isCheckSkillId(id: string): id is CheckSkillId {
  return CHECK_IDS.has(id)
}

const BY_ID = Object.fromEntries(CHECK_SKILLS.map((skill) => [skill.id, skill])) as Record<
  CheckSkillId,
  (typeof CHECK_SKILLS)[number]
>

export function getCheckSkill(id: CheckSkillId): (typeof CHECK_SKILLS)[number] {
  return BY_ID[id]
}
