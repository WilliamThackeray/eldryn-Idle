import type { ItemDef } from './types'

export const MISC = [
  { id: 'rumor', name: 'Rumor', description: 'A lead on a quest, a dungeon, or a rare spawn.', category: 'misc', rarity: 'common', stackable: true, sellValue: 5, tags: ['knowledge'] },
  { id: 'scouting-report', name: 'Scouting Report', description: 'Notes that make rare spawns more likely in a biome.', category: 'misc', rarity: 'uncommon', stackable: true, sellValue: 8, tags: ['knowledge'] },
  { id: 'ancient-page', name: 'Ancient Page', description: 'A loose page. History can bind these later.', category: 'misc', rarity: 'rare', stackable: true, sellValue: 10, tags: ['knowledge'] },
  { id: 'valuables', name: 'Valuables', description: 'Gems and trinkets taken from a lockbox.', category: 'misc', rarity: 'uncommon', stackable: true, sellValue: 25, tags: ['treasure'] },
] as const satisfies readonly ItemDef[]
