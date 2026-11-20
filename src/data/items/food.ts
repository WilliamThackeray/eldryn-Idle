import type { ItemDef } from './types'

export const FOOD = [
  { id: 'raw-forest-fish', name: 'Raw Forest Fish', description: 'A freshwater fish, still raw.', category: 'food', rarity: 'common', stackable: true, sellValue: 3, tags: ['fish', 'raw'] },
  { id: 'raw-desert-fish', name: 'Raw Desert Fish', description: 'A fish from an oasis, still raw.', category: 'food', rarity: 'uncommon', stackable: true, sellValue: 6, tags: ['fish', 'raw'] },
  { id: 'raw-coastal-fish', name: 'Raw Coastal Fish', description: 'A saltwater fish, still raw.', category: 'food', rarity: 'rare', stackable: true, sellValue: 10, tags: ['fish', 'raw'] },
  { id: 'raw-meat', name: 'Raw Meat', description: 'Butchered meat, still raw.', category: 'food', rarity: 'common', stackable: true, sellValue: 4, tags: ['meat', 'raw'] },
  { id: 'raw-fowl', name: 'Raw Fowl', description: 'Butchered bird, still raw.', category: 'food', rarity: 'common', stackable: true, sellValue: 5, tags: ['meat', 'raw'] },
  { id: 'cooked-forest-fish', name: 'Cooked Forest Fish', description: 'A plain cooked freshwater fish.', category: 'food', rarity: 'common', stackable: true, sellValue: 8, tags: ['fish', 'cooked'], heal: 5 },
  { id: 'cooked-desert-fish', name: 'Cooked Desert Fish', description: 'A cooked oasis fish.', category: 'food', rarity: 'uncommon', stackable: true, sellValue: 14, tags: ['fish', 'cooked'], heal: 35 },
  { id: 'cooked-coastal-fish', name: 'Cooked Coastal Fish', description: 'A cooked saltwater fish.', category: 'food', rarity: 'rare', stackable: true, sellValue: 22, tags: ['fish', 'cooked'], heal: 50 },
  { id: 'cooked-meat', name: 'Cooked Meat', description: 'Roasted meat.', category: 'food', rarity: 'common', stackable: true, sellValue: 10, tags: ['meat', 'cooked'], heal: 12 },
  { id: 'cooked-fowl', name: 'Cooked Fowl', description: 'Roasted bird.', category: 'food', rarity: 'common', stackable: true, sellValue: 12, tags: ['meat', 'cooked'], heal: 22 },
  { id: 'eggs', name: 'Eggs', description: 'Ranch eggs.', category: 'food', rarity: 'common', stackable: true, sellValue: 2, tags: ['raw'] },
] as const satisfies readonly ItemDef[]
