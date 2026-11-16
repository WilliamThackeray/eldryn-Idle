import type { ItemDef } from './types'

export const AMMO = [
  {
    id: 'arrows',
    name: 'Arrows',
    description: 'A bundle of arrows for bows.',
    category: 'ammo',
    rarity: 'common',
    stackable: true,
    sellValue: 1,
    tags: ['ammo', 'bow'],
    gear: { slot: 'ammo', magicBonus: 0 },
  },
  {
    id: 'bolts',
    name: 'Bolts',
    description: 'Crossbow bolts.',
    category: 'ammo',
    rarity: 'common',
    stackable: true,
    sellValue: 1,
    tags: ['ammo', 'crossbow'],
    gear: { slot: 'ammo', magicBonus: 0 },
  },
  {
    id: 'sling-bullets',
    name: 'Sling Bullets',
    description: 'Lead pellets for a sling.',
    category: 'ammo',
    rarity: 'common',
    stackable: true,
    sellValue: 1,
    tags: ['ammo', 'sling'],
    gear: { slot: 'ammo', magicBonus: 0 },
  },
] as const satisfies readonly ItemDef[]
