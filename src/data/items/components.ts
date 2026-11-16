import type { ItemDef } from './types'

export const COMPONENTS = [
  { id: 'small-animal', name: 'Small Animal', description: 'A live catch. Train it later, or butcher it.', category: 'component', rarity: 'common', stackable: true, sellValue: 6, tags: ['animal'] },
  { id: 'air-fowl', name: 'Air Fowl', description: 'A live bird. Train it later, or butcher it.', category: 'component', rarity: 'common', stackable: true, sellValue: 8, tags: ['animal'] },
  { id: 'medium-animal', name: 'Medium Animal', description: 'A live catch. Train it later, or butcher it.', category: 'component', rarity: 'uncommon', stackable: true, sellValue: 15, tags: ['animal'] },
  { id: 'large-animal', name: 'Large Animal', description: 'A live catch. Train it later, or butcher it.', category: 'component', rarity: 'rare', stackable: true, sellValue: 30, tags: ['animal'] },
] as const satisfies readonly ItemDef[]
