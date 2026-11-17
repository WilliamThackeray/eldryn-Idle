import type { AbilityAbbr, SkillProgress } from '../types/game'

export interface SkillDefinition {
  id: string
  name: string
  ability: AbilityAbbr
  description: string
}

export const SKILLS = [
  {
    id: 'athletics',
    name: 'Athletics',
    ability: 'STR',
    description: 'Perform physical feats of strength and endurance.',
  },
  {
    id: 'vitality',
    name: 'Vitality',
    ability: 'CON',
    description: 'Constitution. Rises when you take or heal damage.',
  },
  {
    id: 'acrobatics',
    name: 'Acrobatics',
    ability: 'DEX',
    description: 'Demonstrate agility, balance, and coordination.',
  },
  {
    id: 'sleightOfHand',
    name: 'Sleight of Hand',
    ability: 'DEX',
    description: 'Master the art of dexterity and finesse.',
  },
  {
    id: 'stealth',
    name: 'Stealth',
    ability: 'DEX',
    description:
      'Conceal yourself from enemies, sneaking past guards, slipping away without being noticed, or hiding during combat.',
  },
  {
    id: 'arcana',
    name: 'Arcana',
    ability: 'INT',
    description:
      'Recall lore about spells, magic items, eldritch symbols, magical traditions, planes of existence, and the inhabitants of those planes.',
  },
  {
    id: 'history',
    name: 'History',
    ability: 'INT',
    description:
      'Recall lore about historical events, legendary people, ancient kingdoms, past wars, and lost civilizations.',
  },
  {
    id: 'investigation',
    name: 'Investigation',
    ability: 'INT',
    description: 'Make deductions based on clues and find hidden information.',
  },
  {
    id: 'nature',
    name: 'Nature',
    ability: 'INT',
    description: 'Recall lore about terrain, plants, animals, weather, and natural cycles.',
  },
  {
    id: 'religion',
    name: 'Religion',
    ability: 'INT',
    description:
      'Recall lore about deities, rites and prayers, religious hierarchies, holy symbols, and the practices of secret cults.',
  },
  {
    id: 'animalHandling',
    name: 'Animal Handling',
    ability: 'WIS',
    description: 'Calm domestic animals and understand their intentions.',
  },
  {
    id: 'insight',
    name: 'Insight',
    ability: 'WIS',
    description:
      'Determine the true intentions of a creature, such as when searching out a lie or predicting someone’s next move.',
  },
  {
    id: 'medicine',
    name: 'Medicine',
    ability: 'WIS',
    description: 'Stabilize a dying companion or diagnose an illness.',
  },
  {
    id: 'perception',
    name: 'Perception',
    ability: 'WIS',
    description: 'Notice details in your environment and detect hidden threats.',
  },
  {
    id: 'survival',
    name: 'Survival',
    ability: 'WIS',
    description:
      'Follow tracks, hunt wild game, guide your group through frozen wastelands, identify signs that bear weather is near, and avoid quicksand and other natural hazards.',
  },
  {
    id: 'deception',
    name: 'Deception',
    ability: 'CHA',
    description: 'Conceal the truth, either verbally or through actions.',
  },
  {
    id: 'intimidation',
    name: 'Intimidation',
    ability: 'CHA',
    description: 'Influence someone through threats, hostile actions, and physical violence.',
  },
  {
    id: 'performance',
    name: 'Performance',
    ability: 'CHA',
    description:
      'Entertain an audience through acting, singing, dancing, playing a musical instrument, or other forms of entertainment.',
  },
  {
    id: 'persuasion',
    name: 'Persuasion',
    ability: 'CHA',
    description: 'Influence someone with tact, social graces, or good nature.',
  },
] as const satisfies readonly SkillDefinition[]

export type SkillId = (typeof SKILLS)[number]['id']

/** Sidebar groups. Vitality is CON and stays off this list. */
export const SKILL_ABILITY_GROUPS = ['STR', 'DEX', 'INT', 'WIS', 'CHA'] as const

const SKILL_IDS = new Set<string>(SKILLS.map((skill) => skill.id))

export function isSkillId(id: string): id is SkillId {
  return SKILL_IDS.has(id)
}

const SKILL_BY_ID = Object.fromEntries(SKILLS.map((skill) => [skill.id, skill])) as Record<
  SkillId,
  (typeof SKILLS)[number]
>

export function getSkill(id: SkillId): (typeof SKILLS)[number] {
  return SKILL_BY_ID[id]
}

export function initialSkillProgress(): Record<SkillId, SkillProgress> {
  const skills = {} as Record<SkillId, SkillProgress>
  for (const skill of SKILLS) skills[skill.id] = { xp: 0 }
  return skills
}
