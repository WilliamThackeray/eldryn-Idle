import type { AbilityAbbr } from '../types/game'

interface AbilityDefinition {
  id: string
  name: string
  abbr: AbilityAbbr
  description: string
}

export const ABILITIES = [
  { id: 'strength', name: 'Strength', abbr: 'STR', description: 'be strong' },
  { id: 'dexterity', name: 'Dexterity', abbr: 'DEX', description: 'be quick' },
  { id: 'constitution', name: 'Constitution', abbr: 'CON', description: 'be solid' },
  { id: 'intelligence', name: 'Intelligence', abbr: 'INT', description: 'be smart' },
  { id: 'wisdom', name: 'Wisdom', abbr: 'WIS', description: 'be wise' },
  { id: 'charisma', name: 'Charisma', abbr: 'CHA', description: 'be rizzy' },
] as const satisfies readonly AbilityDefinition[]

export type AbilityId = (typeof ABILITIES)[number]['id']
