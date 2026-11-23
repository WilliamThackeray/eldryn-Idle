import type { ItemRarity } from '../data/items'

export const RARITY_TEXT: Record<ItemRarity, string> = {
  common: 'text-rarity-common',
  uncommon: 'text-rarity-uncommon',
  rare: 'text-rarity-rare',
  'very-rare': 'text-rarity-very-rare',
  legendary: 'text-rarity-legendary',
  artifact: 'text-rarity-artifact',
}

export const RARITY_BORDER: Record<ItemRarity, string> = {
  common: 'border-rarity-common/40',
  uncommon: 'border-rarity-uncommon',
  rare: 'border-rarity-rare',
  'very-rare': 'border-rarity-very-rare',
  legendary: 'border-rarity-legendary',
  artifact: 'border-rarity-artifact',
}
