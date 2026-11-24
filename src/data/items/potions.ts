import type { ItemDef } from './types'

export const POTIONS = [
  { id: 'healing-potion', name: 'Healing Potion', description: 'A weak draught brewed from forest herbs.', category: 'potion', rarity: 'common', stackable: true, sellValue: 15, tags: ['healing'], qualityKind: 'potion' },
  { id: 'greater-healing-potion', name: 'Greater Healing Potion', description: 'Brewed from desert herbs.', category: 'potion', rarity: 'uncommon', stackable: true, sellValue: 40, tags: ['healing'], qualityKind: 'potion' },
  { id: 'superior-healing-potion', name: 'Superior Healing Potion', description: 'Brewed from desert herbs and spices.', category: 'potion', rarity: 'rare', stackable: true, sellValue: 90, tags: ['healing'], qualityKind: 'potion' },
  { id: 'supreme-healing-potion', name: 'Supreme Healing Potion', description: 'Brewed from fey herbs.', category: 'potion', rarity: 'very-rare', stackable: true, sellValue: 200, tags: ['healing'], qualityKind: 'potion' },
  { id: 'antitoxin', name: 'Antitoxin', description: 'A draught that steadies the stomach.', category: 'potion', rarity: 'common', stackable: true, sellValue: 12, tags: ['healing'], qualityKind: 'potion' },
  { id: 'elixir-of-health', name: 'Elixir of Health', description: 'A tier IV draught brewed from fey herbs.', category: 'potion', rarity: 'very-rare', stackable: true, sellValue: 280, tags: ['healing'], qualityKind: 'potion' },
  { id: 'phoenix-draught', name: 'Phoenix Draught', description: 'A tier V draught. The last of the old recipes.', category: 'potion', rarity: 'legendary', stackable: true, sellValue: 400, tags: ['healing'], qualityKind: 'potion' },
] as const satisfies readonly ItemDef[]
