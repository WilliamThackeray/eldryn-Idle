import {
  magicBonusForRarity,
  type DamageType,
  type GearMaterial,
  type ItemDef,
  type ItemRarity,
  type WeaponGear,
} from './types'

const longswordGear: WeaponGear = {
  dice: '1d8',
  damageType: 'slashing',
  properties: ['versatile'],
  versatileDice: '1d10',
  mastery: 'sap',
  category: 'martial',
  range: 'melee',
}

function enchantedSword(
  id: string,
  name: string,
  description: string,
  material: GearMaterial,
  buyPrice: number,
  options: { rarity?: ItemRarity; rider?: { dice: string; damageType: DamageType } } = {},
): ItemDef {
  const rarity = options.rarity ?? 'uncommon'
  return {
    id,
    name,
    description,
    category: 'gear',
    rarity,
    stackable: true,
    sellValue: Math.max(1, Math.floor(buyPrice / 2)),
    tags: ['weapon', 'enchanted'],
    gear: {
      slot: 'mainHand',
      material,
      magicBonus: magicBonusForRarity(rarity),
      weapon: longswordGear,
      rider: options.rider,
    },
  }
}

export const ENCHANTED = [
  enchantedSword('longsword+1', 'Longsword +1', 'A longsword with a +1 enchantment.', 'iron', 40),
  {
    id: 'chain-mail-chest+1',
    name: 'Chain Mail Chest +1',
    description: 'Chain mail with a +1 enchantment.',
    category: 'gear' as const,
    rarity: 'uncommon' as const,
    stackable: true,
    sellValue: 40,
    tags: ['armor', 'heavy', 'enchanted'],
    gear: {
      slot: 'chest' as const,
      material: 'iron' as const,
      magicBonus: 1,
      armor: {
        weightClass: 'heavy' as const,
        armorValue: 6,
        strRequirement: 13,
        stealthDisadvantage: true,
      },
    },
  },
  enchantedSword('steel-longsword-flame', 'Steel Longsword (Flame)', 'A steel longsword that bites with fire.', 'steel', 80, {
    rarity: 'rare',
    rider: { dice: '1d4', damageType: 'fire' },
  }),
  enchantedSword(
    'silvered-longsword-frost',
    'Silvered Longsword (Frost)',
    'A silvered longsword that bites with cold.',
    'silvered',
    120,
    { rarity: 'rare', rider: { dice: '1d4', damageType: 'cold' } },
  ),
  enchantedSword(
    'mithral-longsword-shock',
    'Mithral Longsword (Shock)',
    'A mithral longsword that bites with lightning.',
    'mithral',
    200,
    { rarity: 'rare', rider: { dice: '1d4', damageType: 'lightning' } },
  ),
  {
    id: 'leather-chest-fire-resist',
    name: 'Leather Chest (Fire Resist)',
    description: 'Leather armor warded against fire.',
    category: 'gear' as const,
    rarity: 'uncommon' as const,
    stackable: true,
    sellValue: 20,
    tags: ['armor', 'light', 'enchanted'],
    gear: {
      slot: 'chest' as const,
      magicBonus: 0,
      armor: {
        weightClass: 'light' as const,
        armorValue: 1,
        stealthDisadvantage: false,
      },
      stats: { resistances: ['fire' as const] },
    },
  },
  {
    id: 'smiths-ring',
    name: "Smith's Ring",
    description: 'A ring that hastens smithing practice.',
    category: 'gear' as const,
    rarity: 'uncommon' as const,
    stackable: true,
    sellValue: 25,
    tags: ['jewelry', 'enchanted'],
    gear: {
      slot: 'ring' as const,
      magicBonus: 0,
      stats: { skillXpPct: { smithing: 5 } },
    },
  },
  {
    id: 'alchemists-ring',
    name: "Alchemist's Ring",
    description: 'A ring that hastens alchemy practice.',
    category: 'gear' as const,
    rarity: 'uncommon' as const,
    stackable: true,
    sellValue: 25,
    tags: ['jewelry', 'enchanted'],
    gear: {
      slot: 'ring' as const,
      magicBonus: 0,
      stats: { skillXpPct: { alchemy: 5 } },
    },
  },
] as const satisfies readonly ItemDef[]
