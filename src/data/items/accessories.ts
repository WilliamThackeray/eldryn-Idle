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
    gear: {
      slot,
      magicBonus: magicBonusForRarity('common'),
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
  accessory('arcane-orb', 'Arcane Orb', 'A glass orb for the off hand.', 15, 'offHand', ['focus', 'arcane']),
  accessory('holy-symbol', 'Holy Symbol', 'A blessed emblem for the off hand.', 10, 'offHand', ['focus', 'divine']),
  accessory('druidic-focus', 'Druidic Focus', 'A sprig and stone for the off hand.', 10, 'offHand', ['focus', 'primal']),
] as const satisfies readonly ItemDef[]
