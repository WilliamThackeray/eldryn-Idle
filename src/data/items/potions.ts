import type { ItemDef } from './types'

export const POTIONS = [
  { id: 'healing-potion', name: 'Healing Potion', description: 'A weak draught brewed from forest herbs.', category: 'potion', rarity: 'common', stackable: true, sellValue: 15, tags: ['healing'] },
  { id: 'greater-healing-potion', name: 'Greater Healing Potion', description: 'Brewed from desert herbs.', category: 'potion', rarity: 'uncommon', stackable: true, sellValue: 40, tags: ['healing'] },
  { id: 'superior-healing-potion', name: 'Superior Healing Potion', description: 'Brewed from desert herbs and spices.', category: 'potion', rarity: 'rare', stackable: true, sellValue: 90, tags: ['healing'] },
  { id: 'supreme-healing-potion', name: 'Supreme Healing Potion', description: 'Brewed from fey herbs.', category: 'potion', rarity: 'very-rare', stackable: true, sellValue: 200, tags: ['healing'] },
] as const satisfies readonly ItemDef[]
