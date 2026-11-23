import type { AbilityAbbr, SkillProgress } from '../types/game'

export type TradeSkillId =
  | 'mining'
  | 'smithing'
  | 'woodcutting'
  | 'woodcraft'
  | 'leatherworking'
  | 'jewelcrafting'
  | 'thievery'
  | 'cooking'
  | 'vitality'
  | 'alchemy'
  | 'scribing'
  | 'enchanting'
  | 'weaving'
  | 'foraging'
  | 'fishing'
  | 'hunting'
  | 'commerce'
  | 'performance'
  | 'binding'

export type TradeSkillRole = 'gather' | 'craft' | 'combat'
export type TradeSkillFeed = TradeSkillId | 'combat' | 'economy'

export interface SkillDefinition {
  id: TradeSkillId
  name: string
  ability: AbilityAbbr
  role: TradeSkillRole
  toolName?: string
  description: string
  feeds: TradeSkillFeed[]
}

export const SKILLS = [
  {
    id: 'mining',
    name: 'Mining',
    ability: 'STR',
    role: 'gather',
    description: 'Makes ore, coal, stone, raw gems. Excavation dig sites give relics and Ancient Pages.',
    feeds: ['smithing', 'jewelcrafting', 'scribing'],
  },
  {
    id: 'smithing',
    name: 'Smithing',
    ability: 'STR',
    role: 'craft',
    toolName: "Smith's Tools",
    description:
      'Makes bars, metal weapons, medium/heavy armor, shields, arrowheads, and skilling gear.',
    feeds: ['combat'],
  },
  {
    id: 'woodcutting',
    name: 'Woodcutting',
    ability: 'STR',
    role: 'gather',
    description: 'Makes logs by tier, bark, sap.',
    feeds: ['woodcraft', 'cooking', 'alchemy'],
  },
  {
    id: 'woodcraft',
    name: 'Woodcraft',
    ability: 'DEX',
    role: 'craft',
    toolName: "Woodcarver's Tools",
    description: 'Makes bows, crossbows, ammo, staves, wands, clubs, holy symbols, druidic focuses.',
    feeds: ['combat'],
  },
  {
    id: 'leatherworking',
    name: 'Leatherworking',
    ability: 'DEX',
    role: 'craft',
    toolName: "Leatherworker's Tools",
    description: 'Makes light armor, belts, cloaks, slings, whips, minstrel attire.',
    feeds: ['combat'],
  },
  {
    id: 'jewelcrafting',
    name: 'Jewelcrafting',
    ability: 'DEX',
    role: 'craft',
    toolName: "Jeweler's Tools",
    description: 'Makes cut gems, rings, amulets, crystal orbs.',
    feeds: ['enchanting', 'combat'],
  },
  {
    id: 'thievery',
    name: 'Thievery',
    ability: 'DEX',
    role: 'gather',
    toolName: "Thieves' Tools",
    description:
      'Makes pickpocketing and lockpicking loot, infiltration, strongboxes, Forged Writs, Disguise Kits, False Papers.',
    feeds: ['economy'],
  },
  {
    id: 'cooking',
    name: 'Cooking',
    ability: 'CON',
    role: 'craft',
    toolName: "Cook's Utensils / Brewer's Supplies",
    description: 'Makes food (HP), feasts and ales (timed buffs).',
    feeds: ['combat'],
  },
  {
    id: 'vitality',
    name: 'Vitality',
    ability: 'CON',
    role: 'combat',
    description: 'Makes HP. Trained in combat by taking and healing damage.',
    feeds: ['combat'],
  },
  {
    id: 'alchemy',
    name: 'Alchemy',
    ability: 'INT',
    role: 'craft',
    toolName: "Alchemist's Supplies",
    description: 'Makes potions, spell reagents, weapon oils, Holy Water, antitoxins.',
    feeds: ['combat'],
  },
  {
    id: 'scribing',
    name: 'Scribing',
    ability: 'INT',
    role: 'craft',
    toolName: "Calligrapher's Supplies",
    description:
      'Makes ink, parchment, spell scrolls, Tomes, Study Notes, Bestiaries, Field Notes.',
    feeds: [
      'mining',
      'smithing',
      'woodcutting',
      'woodcraft',
      'leatherworking',
      'jewelcrafting',
      'thievery',
      'cooking',
      'alchemy',
      'enchanting',
      'weaving',
      'foraging',
      'fishing',
      'hunting',
      'commerce',
      'performance',
      'binding',
      'combat',
    ],
  },
  {
    id: 'enchanting',
    name: 'Enchanting',
    ability: 'INT',
    role: 'craft',
    toolName: 'Arcane focus',
    description: 'Makes Arcane Dust and enchantments.',
    feeds: ['combat'],
  },
  {
    id: 'weaving',
    name: 'Weaving',
    ability: 'INT',
    role: 'craft',
    toolName: "Weaver's Tools",
    description: 'Makes linen, wool, silk cloth; caster armor; vestments; wildweave.',
    feeds: ['combat'],
  },
  {
    id: 'foraging',
    name: 'Foraging',
    ability: 'WIS',
    role: 'gather',
    toolName: 'Herbalism Kit',
    description: 'Makes herbs, mushrooms, flax, reagent plants, Mistletoe, seeds.',
    feeds: ['alchemy', 'cooking', 'weaving'],
  },
  {
    id: 'fishing',
    name: 'Fishing',
    ability: 'WIS',
    role: 'gather',
    toolName: 'Fishing Tackle',
    description: 'Makes fish by biome, pearls (rare).',
    feeds: ['cooking', 'alchemy', 'jewelcrafting'],
  },
  {
    id: 'hunting',
    name: 'Hunting',
    ability: 'WIS',
    role: 'gather',
    toolName: 'Hunting Trap',
    description: 'Makes meat, hides, bones, feathers, wool, eggs, live animals.',
    feeds: ['cooking', 'leatherworking', 'weaving', 'woodcraft', 'binding'],
  },
  {
    id: 'commerce',
    name: 'Commerce',
    ability: 'CHA',
    role: 'gather',
    description: 'Makes Guild Favor, Trade Contracts, Letters of Introduction, Rumors.',
    feeds: ['economy'],
  },
  {
    id: 'performance',
    name: 'Performance',
    ability: 'CHA',
    role: 'gather',
    toolName: 'musical instrument',
    description: 'Makes Inspiration, Renown, Rosin, gold.',
    feeds: ['combat', 'economy'],
  },
  {
    id: 'binding',
    name: 'Binding',
    ability: 'CHA',
    role: 'craft',
    description: 'Makes pacts and summons for the two summon slots.',
    feeds: ['combat'],
  },
] as const satisfies readonly SkillDefinition[]

/** @deprecated Use TradeSkillId. */
export type SkillId = TradeSkillId

/** Sidebar groups, including CON (Vitality). */
export const SKILL_ABILITY_GROUPS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const

const SKILL_IDS = new Set<string>(SKILLS.map((skill) => skill.id))

export function isSkillId(id: string): id is TradeSkillId {
  return SKILL_IDS.has(id)
}

const SKILL_BY_ID = Object.fromEntries(SKILLS.map((skill) => [skill.id, skill])) as Record<
  TradeSkillId,
  (typeof SKILLS)[number]
>

export function getSkill(id: TradeSkillId): (typeof SKILLS)[number] {
  return SKILL_BY_ID[id]
}

export function initialSkillProgress(): Record<TradeSkillId, SkillProgress> {
  const skills = {} as Record<TradeSkillId, SkillProgress>
  for (const skill of SKILLS) skills[skill.id] = { xp: 0 }
  return skills
}
