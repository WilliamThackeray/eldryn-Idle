import { magicBonusForRarity, type GearSlot, type ItemDef } from './types'

function accessory(
  id: string,
  name: string,
  description: string,
  sellValue: number,
  slot: GearSlot,
  tags: string[] = [],
): ItemDef {
  return {
    id,
    name,
    description,
    category: 'gear',
    rarity: 'common',
    stackable: true,
    sellValue,
    tags,
    qualityKind: tags.includes('jewelry') ? 'jewelry' : 'none',
    gear: {
      slot,
      magicBonus: magicBonusForRarity('common'),
    },
  }
}

function jeweled(
  id: string,
  name: string,
  description: string,
  sellValue: number,
  slot: GearSlot,
  stats: NonNullable<ItemDef['gear']>['stats'],
): ItemDef {
  return {
    id,
    name,
    description,
    category: 'gear',
    rarity: 'uncommon',
    stackable: true,
    sellValue,
    tags: ['jewelry'],
    qualityKind: 'jewelry',
    gear: {
      slot,
      magicBonus: magicBonusForRarity('uncommon'),
      stats,
    },
  }
}

export const ACCESSORIES = [
  accessory('ring', 'Ring', 'A plain metal band.', 10, 'ring', ['jewelry']),
  accessory('necklace', 'Necklace', 'A simple pendant on a cord.', 15, 'necklace', ['jewelry']),
  accessory('leather-belt', 'Leather Belt', 'A sturdy leather belt.', 4, 'belt', ['armor']),
  accessory('leather-cloak', 'Leather Cloak', 'A travel cloak of treated hide.', 6, 'cloak', ['armor']),
  accessory('arcane-wand', 'Arcane Wand', 'A slim focus for the off hand.', 8, 'offHand', ['focus', 'arcane']),
  accessory('arcane-staff', 'Arcane Staff', 'A carved staff for the off hand.', 12, 'offHand', ['focus', 'arcane']),
  accessory('holy-symbol', 'Holy Symbol', 'A blessed emblem for the off hand.', 10, 'offHand', ['focus', 'divine']),
  accessory('druidic-focus', 'Druidic Focus', 'A sprig and stone for the off hand.', 10, 'offHand', ['focus', 'primal']),
  jeweled('quartz-ring', 'Quartz Ring', 'Silver set with cut quartz.', 18, 'ring', { maxHp: 2 }),
  jeweled('amethyst-amulet', 'Amethyst Amulet', 'Gold set with cut amethyst.', 28, 'necklace', { saveBonus: 1 }),
  jeweled('sapphire-ring', 'Sapphire Ring', 'Gold set with cut sapphire.', 40, 'ring', { maxHp: 4 }),
  jeweled('pearl-amulet', 'Pearl Amulet', 'Gold set with a pearl.', 36, 'necklace', { saveBonus: 1 }),
  {
    id: 'crystal-orb',
    name: 'Crystal Orb',
    description: 'A quartz orb bound with Arcane Dust.',
    category: 'gear' as const,
    rarity: 'uncommon' as const,
    stackable: true,
    sellValue: 22,
    tags: ['focus', 'arcane'],
    gear: {
      slot: 'offHand' as const,
      magicBonus: magicBonusForRarity('uncommon'),
      stats: { spellAttack: 1 },
    },
  },
] as const satisfies readonly ItemDef[]
