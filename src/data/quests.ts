import type { ClassId } from './classes'
import type { ItemId } from './items'
import type { BiomeId } from './monsters'
import type { SkillId } from './skills'

export type DialogueSkillId = 'persuasion' | 'intimidation' | 'deception' | 'insight'

export type QuestUnlock =
  | { type: 'classLevel'; level: number; classId?: ClassId }
  | { type: 'item'; itemId: ItemId }

export type QuestStep =
  | { type: 'combat'; monsterId: string; biome: BiomeId }
  | { type: 'dungeon'; dungeonId: string }
  | { type: 'skillCheck'; skillId: SkillId; requiredLevel: number; label: string }
  | {
      type: 'dialogue'
      text: string
      choices: {
        id: string
        text: string
        check?: { skillId: DialogueSkillId; requiredLevel: number }
      }[]
    }
  | { type: 'deliver'; itemId: ItemId; quantity: number; label: string }

export interface QuestDef {
  id: string
  title: string
  chapter: number
  unlock: QuestUnlock
  steps: QuestStep[]
}

/**
 * Sample chapter-1 quest. Story copy is TODO(design);
 * uses the README shattered, ever-changing realm premise.
 */
export const QUESTS: QuestDef[] = [
  {
    id: 'shattered-mile',
    title: 'A Shifting Road',
    chapter: 1,
    unlock: { type: 'classLevel', level: 1 },
    steps: [
      {
        type: 'dialogue',
        text:
          // TODO(design): full chapter dialogue
          'The mile-marker was not there yesterday. The road beyond it flickers like heat haze over the shattered empire.',
        choices: [
          {
            id: 'persuade-traveler',
            text: 'Ask a traveler what they remember of this road.',
            check: { skillId: 'persuasion', requiredLevel: 1 },
          },
          {
            id: 'read-marker',
            text: 'Study the marker for a lie in the stone.',
            check: { skillId: 'insight', requiredLevel: 1 },
          },
          {
            id: 'fake-authority',
            text: 'Claim you are a surveyor from the old empire.',
            check: { skillId: 'deception', requiredLevel: 1 },
          },
          { id: 'follow-anyway', text: 'Follow the road anyway.' },
        ],
      },
      {
        type: 'skillCheck',
        skillId: 'investigation',
        requiredLevel: 1,
        label: 'Search the mile-marker that was not there yesterday.',
      },
      { type: 'combat', monsterId: 'deer', biome: 'forest' },
      {
        type: 'deliver',
        itemId: 'raw-meat',
        quantity: 1,
        label: 'Deliver a cut of meat to the mile-camp cook.',
      },
      { type: 'dungeon', dungeonId: 'shifting-thicket' },
      {
        type: 'dialogue',
        text:
          // TODO(design)
          'The thicket settles for a breath. Somewhere in the flux, a road remembers itself.',
        choices: [{ id: 'done', text: 'Return to town.' }],
      },
    ],
  },
]

const BY_ID = new Map(QUESTS.map((q) => [q.id, q]))

export function getQuest(id: string): QuestDef | undefined {
  return BY_ID.get(id)
}

export function isQuestId(id: string): boolean {
  return BY_ID.has(id)
}
