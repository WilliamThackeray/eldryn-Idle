import type { ItemRarity } from '../data/items'

export const RARITY_TEXT: Record<ItemRarity, string> = {
  common: 'text-parchment',
  uncommon: 'text-sage',
  rare: 'text-[#7EB6D9]',
  'very-rare': 'text-[#C58BE2]',
  legendary: 'text-gold',
  artifact: 'text-[#E85D4C]',
}
