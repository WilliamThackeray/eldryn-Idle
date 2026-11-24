import type { CreatureType } from '../monsters/types'
import { TOME_FIRST_LEVEL, TOME_LEVEL_STEP } from '../../engine/config'
import { SKILLS, type TradeSkillId } from '../skills'
import type { ItemDef } from './types'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const

/** Skills that receive Art-of tomes (all trade skills except Scribing and Vitality). */
export const TOME_SKILLS = SKILLS.filter(
  (skill) => skill.id !== 'scribing' && skill.id !== 'vitality',
).map((skill) => skill.id)

export const TOME_VOLUME_LEVELS = Array.from({ length: 10 }, (_, index) => TOME_FIRST_LEVEL + index * TOME_LEVEL_STEP)

export const BESTIARY_TYPES = ['beast', 'undead', 'fey', 'monstrosity', 'giant'] as const satisfies readonly CreatureType[]
export type BestiaryType = (typeof BESTIARY_TYPES)[number]

export const BESTIARY_VOLUME_LEVELS = [10, 30, 50] as const
export const BESTIARY_TROPHY_COSTS = [5, 10, 20] as const

export const NOTE_GROUPS = [
  { id: 'mining', name: 'Mining', prefix: 'mine-', inputs: [{ itemId: 'iron-ore' as const, quantity: 2 }] },
  { id: 'smithing', name: 'Smithing', prefix: 'smith-', inputs: [{ itemId: 'iron-bar' as const, quantity: 1 }] },
  { id: 'fishing', name: 'Fishing', prefix: 'fish-', inputs: [{ itemId: 'raw-forest-fish' as const, quantity: 2 }] },
  { id: 'cooking', name: 'Cooking', prefix: 'cook-', inputs: [{ itemId: 'cooked-meat' as const, quantity: 1 }] },
  { id: 'foraging', name: 'Foraging', prefix: 'forage-', inputs: [{ itemId: 'forest-herbs' as const, quantity: 2 }] },
] as const

export type NoteGroupId = (typeof NOTE_GROUPS)[number]['id']

export function tomeItemId(skillId: TradeSkillId, volume: number): string {
  return `tome-${skillId}-vol-${volume}`
}

export function noteItemId(groupId: NoteGroupId): string {
  return `notes-${groupId}`
}

export function bestiaryItemId(type: BestiaryType, volume: number): string {
  return `bestiary-${type}-vol-${volume}`
}

export function trophyItemId(type: BestiaryType): string {
  return `${type}-trophy`
}

function titleCase(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

const TOKENS: ItemDef[] = [
  {
    id: 'practice-ribbon',
    name: 'Practice Ribbon',
    description: 'A ribbon from acrobat drills. History binds it into tomes.',
    category: 'misc',
    rarity: 'common',
    stackable: true,
    sellValue: 1,
    tags: ['knowledge', 'tome-token'],
  },
  {
    id: 'black-cloth',
    name: 'Black Cloth',
    description: 'Cloth from quiet work in the dark. History binds it into tomes.',
    category: 'misc',
    rarity: 'common',
    stackable: true,
    sellValue: 1,
    tags: ['knowledge', 'tome-token'],
  },
  {
    id: 'menace-token',
    name: 'Menace Token',
    description: 'A scratched token from a shakedown. History binds it into tomes.',
    category: 'misc',
    rarity: 'common',
    stackable: true,
    sellValue: 1,
    tags: ['knowledge', 'tome-token'],
  },
  {
    id: 'silver-tongue',
    name: 'Silver Tongue Note',
    description: 'A scrap from a bargain. History binds it into tomes.',
    category: 'misc',
    rarity: 'common',
    stackable: true,
    sellValue: 1,
    tags: ['knowledge', 'tome-token'],
  },
  {
    id: 'field-notes',
    name: 'Field Notes',
    description: 'Rough notes from panning and poking about. History binds them into tomes.',
    category: 'misc',
    rarity: 'common',
    stackable: true,
    sellValue: 1,
    tags: ['knowledge', 'tome-token'],
  },
  {
    id: 'watch-mark',
    name: 'Watch Mark',
    description: 'A tally from a long watch. History binds it into tomes.',
    category: 'misc',
    rarity: 'common',
    stackable: true,
    sellValue: 1,
    tags: ['knowledge', 'tome-token'],
  },
  {
    id: 'marked-cards',
    name: 'Marked Cards',
    description: 'A deck with quiet tells. History binds them into tomes.',
    category: 'misc',
    rarity: 'common',
    stackable: true,
    sellValue: 1,
    tags: ['knowledge', 'tome-token'],
  },
]

const TROPHIES: ItemDef[] = BESTIARY_TYPES.map((type) => ({
  id: trophyItemId(type),
  name: `${titleCase(type)} Trophy`,
  description: `A trophy taken from a ${type}. Used to write bestiaries.`,
  category: 'misc' as const,
  rarity: 'uncommon' as const,
  stackable: true,
  sellValue: 8,
  tags: ['trophy', 'knowledge'],
}))

function tomeItems(): ItemDef[] {
  const items: ItemDef[] = []
  for (const skillId of TOME_SKILLS) {
    const skill = SKILLS.find((entry) => entry.id === skillId)!
    for (let volume = 1; volume <= 10; volume++) {
      items.push({
        id: tomeItemId(skillId, volume),
        name: `The Art of ${skill.name}, Vol. ${ROMAN[volume - 1]}`,
        description: `A bound volume on ${skill.name}. Read it for a permanent bonus.`,
        category: 'misc',
        rarity: volume >= 10 ? 'rare' : volume >= 5 ? 'uncommon' : 'common',
        stackable: true,
        sellValue: volume * 5,
        tags: ['tome', 'knowledge'],
      })
    }
  }
  return items
}

function noteItems(): ItemDef[] {
  return NOTE_GROUPS.map((group) => ({
    id: noteItemId(group.id),
    name: `Notes on ${group.name}`,
    description: `Study notes. +10% ${group.name.toLowerCase()} yield for 1 hour of active time.`,
    category: 'misc' as const,
    rarity: 'common' as const,
    stackable: true,
    sellValue: 3,
    tags: ['notes', 'knowledge'],
  }))
}

function bestiaryItems(): ItemDef[] {
  const items: ItemDef[] = []
  for (const type of BESTIARY_TYPES) {
    for (let volume = 1; volume <= 3; volume++) {
      items.push({
        id: bestiaryItemId(type, volume),
        name: `${titleCase(type)} Bestiary, Vol. ${ROMAN[volume - 1]}`,
        description: `Notes on fighting ${type}s. Read for +1 to hit against that type.`,
        category: 'misc',
        rarity: volume >= 3 ? 'rare' : 'uncommon',
        stackable: true,
        sellValue: volume * 10,
        tags: ['bestiary', 'knowledge'],
      })
    }
  }
  return items
}

export const KNOWLEDGE = [
  ...TOKENS,
  ...TROPHIES,
  ...tomeItems(),
  ...noteItems(),
  ...bestiaryItems(),
] as const satisfies readonly ItemDef[]
