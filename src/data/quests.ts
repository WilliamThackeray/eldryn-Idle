import type { CheckSkillId } from './checkSkills'
import type { ItemId } from './items'
import type { CreatureType } from './monsters'
import type { TradeSkillId } from './skills'

export interface NpcDef {
  id: string
  name: string
  title: string
  location: 'mile-camp'
  description: string
}

export type Objective =
  | { type: 'have' | 'deliver'; itemId: ItemId; qty: number }
  | { type: 'kill'; monsterId: string; qty: number }
  | { type: 'kill'; creatureType: CreatureType; qty: number }
  | { type: 'gather' | 'craft'; activityId: string; qty: number }
  | { type: 'reachLevel'; skillId: TradeSkillId | 'class'; level: number }
  | { type: 'clearDungeon'; dungeonId: string }

export type PrepEffect = 'advantage' | 'autoPass' | 'plus'

export interface CheckApproach {
  id: string
  label: string
  checkSkillId: CheckSkillId
  dc: number
  prep?: { itemId: ItemId; effect: PrepEffect; value?: number }
  goldCost?: number
  /** Hidden unless CHA Rank 10 extraQuestApproach is active. */
  extra?: boolean
}

export interface Outcome {
  text: string
  nextStage?: number
  addStages?: QuestStage[]
  rewardMod?: number
}

export interface CheckDef {
  prompt: string
  approaches: CheckApproach[]
  success: Outcome
  failure: Outcome
}

export type QuestStage = { objectives: Objective[] } | { check: CheckDef }

export interface QuestRewards {
  gold?: number
  favor?: number
  items?: { itemId: ItemId; quantity: number }[]
  unlockActivity?: string
  unlockDungeon?: string
  /** A level-1 spell scroll from the character's class list. */
  level1Scroll?: boolean
}

export interface QuestPrerequisites {
  quests?: string[]
  level?: { skillId: TradeSkillId | 'class'; level: number }
  items?: { itemId: ItemId; quantity: number }[]
  /** Only a class that prepares spells. */
  caster?: boolean
}

export interface QuestDef {
  id: string
  title: string
  chapter: number
  giverNpcId: string
  turnInNpcId: string
  prerequisites: QuestPrerequisites
  stages: QuestStage[]
  rewards: QuestRewards
  description: string
}

export const NPCS: NpcDef[] = [
  {
    id: 'cook',
    name: 'Marta',
    title: 'Cook',
    location: 'mile-camp',
    description: 'Keeps the mile-camp pot simmering while the road forgets its own shape.',
  },
  {
    id: 'hedge-witch',
    name: 'Ilyra',
    title: 'Hedge-Witch',
    location: 'mile-camp',
    description: 'Reads the flux in herbs and offers quiet bargains.',
  },
  {
    id: 'guard-captain',
    name: 'Bren',
    title: 'Guard Captain',
    location: 'mile-camp',
    description: 'Watches the shifting mile-markers and the wolves that follow them.',
  },
  {
    id: 'guildmaster',
    name: 'Orrin',
    title: 'Guildmaster',
    location: 'mile-camp',
    description: 'Speaks for the guilds when the realm still has enough of a road to tax.',
  },
]

const banditFight: QuestStage = {
  objectives: [{ type: 'kill', monsterId: 'bandit', qty: 2 }],
}

export const QUESTS: QuestDef[] = [
  {
    id: 'supper-at-the-mile-camp',
    title: 'Supper at the Mile-Camp',
    chapter: 1,
    giverNpcId: 'cook',
    turnInNpcId: 'cook',
    prerequisites: {},
    description:
      'The cook needs meat for the pot. In a shattered realm the camp is the only place that stays put long enough to eat.',
    stages: [{ objectives: [{ type: 'deliver', itemId: 'cooked-meat', qty: 5 }] }],
    rewards: { unlockActivity: 'cook-stew' },
  },
  {
    id: 'wolves-at-the-edge',
    title: 'Wolves at the Edge',
    chapter: 1,
    giverNpcId: 'guard-captain',
    turnInNpcId: 'guard-captain',
    prerequisites: { quests: ['supper-at-the-mile-camp'] },
    description:
      'Wolves hunt the tree line where the forest blinked into place overnight. Thin the pack and bring hides for the camp.',
    stages: [
      {
        objectives: [
          { type: 'kill', monsterId: 'wolf', qty: 5 },
          { type: 'deliver', itemId: 'hide', qty: 3 },
        ],
      },
    ],
    rewards: { gold: 40 },
  },
  {
    id: 'the-marker-that-wasnt',
    title: "The Marker That Wasn't",
    chapter: 1,
    giverNpcId: 'guard-captain',
    turnInNpcId: 'guard-captain',
    prerequisites: { quests: ['wolves-at-the-edge'] },
    description:
      'A mile-marker stands where none stood yesterday. The road beyond flickers like heat haze over the shattered empire.',
    stages: [
      {
        objectives: [
          { type: 'reachLevel', skillId: 'mining', level: 5 },
          { type: 'have', itemId: 'ancient-page', qty: 1 },
        ],
      },
      {
        check: {
          prompt:
            'A surveyor claims the marker has always been here. Convince them, read them, or buy their silence before the flux moves again.',
          approaches: [
            {
              id: 'persuade',
              label: 'Persuade',
              checkSkillId: 'persuasion',
              dc: 12,
              prep: { itemId: 'letter-of-introduction', effect: 'advantage' },
            },
            {
              id: 'insight',
              label: 'Insight',
              checkSkillId: 'insight',
              dc: 12,
              prep: { itemId: 'rumor', effect: 'advantage' },
            },
            {
              id: 'deceive',
              label: 'Deceive',
              checkSkillId: 'deception',
              dc: 12,
              prep: { itemId: 'false-papers', effect: 'autoPass' },
            },
            { id: 'intimidate', label: 'Intimidate', checkSkillId: 'intimidation', dc: 14, extra: true },
            { id: 'bribe', label: 'Bribe (50 gp)', checkSkillId: 'persuasion', dc: 0, goldCost: 50 },
          ],
          success: {
            text: 'The surveyor nods and the marker steadies for a breath. The road remembers itself.',
          },
          failure: {
            text: 'The surveyor calls for help. Bandits peel out of the haze — deal with them before the camp will believe you.',
            rewardMod: 0.5,
            addStages: [banditFight],
          },
        },
      },
    ],
    rewards: { gold: 80 },
  },
  {
    id: 'herbs-for-the-hedge-witch',
    title: 'Herbs for the Hedge-Witch',
    chapter: 1,
    giverNpcId: 'hedge-witch',
    turnInNpcId: 'hedge-witch',
    prerequisites: { quests: ['the-marker-that-wasnt'] },
    description:
      'The hedge-witch needs forest herbs and healing draughts before she will speak of the thicket that shifts with the realm.',
    stages: [
      {
        objectives: [
          { type: 'deliver', itemId: 'forest-herbs', qty: 10 },
          { type: 'deliver', itemId: 'healing-potion', qty: 2 },
        ],
      },
    ],
    rewards: { gold: 30, favor: 5 },
  },
  {
    id: 'hedge-witchs-primer',
    title: "The Hedge-Witch's Primer",
    chapter: 1,
    giverNpcId: 'hedge-witch',
    turnInNpcId: 'hedge-witch',
    prerequisites: { caster: true },
    description:
      'The hedge-witch keeps her primers locked. Bring her ink and a sheet of parchment and she will hand you a spell scroll to practice on.',
    stages: [
      {
        objectives: [
          { type: 'deliver', itemId: 'ink', qty: 1 },
          { type: 'deliver', itemId: 'parchment', qty: 1 },
        ],
      },
    ],
    rewards: { level1Scroll: true },
  },
  {
    id: 'into-the-thicket',
    title: 'Into the Thicket',
    chapter: 1,
    giverNpcId: 'hedge-witch',
    turnInNpcId: 'hedge-witch',
    prerequisites: { quests: ['herbs-for-the-hedge-witch'] },
    description:
      'Clear the Shifting Thicket once. After that, the camp will mark the path for hunters who need the flux to stay open a little longer.',
    stages: [{ objectives: [{ type: 'clearDungeon', dungeonId: 'shifting-thicket' }] }],
    rewards: { gold: 50 },
  },
]

const NPC_BY_ID = new Map(NPCS.map((npc) => [npc.id, npc]))
const QUEST_BY_ID = new Map(QUESTS.map((q) => [q.id, q]))

export function getNpc(id: string): NpcDef | undefined {
  return NPC_BY_ID.get(id)
}

export function getQuest(id: string): QuestDef | undefined {
  return QUEST_BY_ID.get(id)
}

export function isQuestId(id: string): boolean {
  return QUEST_BY_ID.has(id)
}

export function questsForNpc(npcId: string): QuestDef[] {
  return QUESTS.filter((q) => q.giverNpcId === npcId || q.turnInNpcId === npcId)
}
