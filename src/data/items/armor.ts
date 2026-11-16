import {
  magicBonusForRarity,
  type ArmorWeightClass,
  type GearMaterial,
  type GearSlot,
  type ItemDef,
} from './types'

const PIECES = ['helmet', 'chest', 'chaps', 'gauntlets', 'boots'] as const satisfies readonly GearSlot[]

const PIECE_LABEL: Record<(typeof PIECES)[number], string> = {
  helmet: 'Helmet',
  chest: 'Chest',
  chaps: 'Chaps',
  gauntlets: 'Gauntlets',
  boots: 'Boots',
}

function sellFromBuy(buy: number): number {
  return Math.max(1, Math.floor(buy / 2))
}

function armorSet(spec: {
  id: string
  name: string
  description: string
  /** Buy price for one piece (ceil of set SRD price / 5). */
  pieceBuy: number
  weightClass: ArmorWeightClass
  armorValue: number
  stealthDisadvantage: boolean
  strRequirement?: number
  material?: GearMaterial
}): ItemDef[] {
  return PIECES.map((slot) => ({
    id: `${spec.id}-${slot}`,
    name: `${spec.name} ${PIECE_LABEL[slot]}`,
    description: spec.description,
    category: 'gear' as const,
    rarity: 'common' as const,
    stackable: true,
    sellValue: sellFromBuy(spec.pieceBuy),
    tags: ['armor', spec.weightClass],
    gear: {
      slot,
      material: spec.material,
      magicBonus: magicBonusForRarity('common'),
      armor: {
        weightClass: spec.weightClass,
        armorValue: spec.armorValue,
        strRequirement: spec.strRequirement,
        stealthDisadvantage: spec.stealthDisadvantage,
      },
    },
  }))
}

export const ARMOR = [
  ...armorSet({
    id: 'padded',
    name: 'Padded',
    description: 'Quilted cloth armor.',
    pieceBuy: 1,
    weightClass: 'light',
    armorValue: 1,
    stealthDisadvantage: true,
  }),
  ...armorSet({
    id: 'leather',
    name: 'Leather',
    description: 'Hardened leather armor.',
    pieceBuy: 2,
    weightClass: 'light',
    armorValue: 1,
    stealthDisadvantage: false,
  }),
  ...armorSet({
    id: 'studded-leather',
    name: 'Studded Leather',
    description: 'Leather reinforced with metal studs.',
    pieceBuy: 9,
    weightClass: 'light',
    armorValue: 2,
    stealthDisadvantage: false,
  }),
  ...armorSet({
    id: 'hide',
    name: 'Hide',
    description: 'Thick animal hides.',
    pieceBuy: 2,
    weightClass: 'medium',
    armorValue: 2,
    stealthDisadvantage: false,
  }),
  ...armorSet({
    id: 'chain-shirt',
    name: 'Chain Shirt',
    description: 'A shirt of interlocking rings.',
    pieceBuy: 10,
    weightClass: 'medium',
    armorValue: 3,
    stealthDisadvantage: false,
    material: 'iron',
  }),
  ...armorSet({
    id: 'scale-mail',
    name: 'Scale Mail',
    description: 'Overlapping metal scales.',
    pieceBuy: 10,
    weightClass: 'medium',
    armorValue: 4,
    stealthDisadvantage: true,
    material: 'iron',
  }),
  ...armorSet({
    id: 'breastplate',
    name: 'Breastplate',
    description: 'A fitted steel torso plate.',
    pieceBuy: 80,
    weightClass: 'medium',
    armorValue: 4,
    stealthDisadvantage: false,
    material: 'steel',
  }),
  ...armorSet({
    id: 'half-plate',
    name: 'Half Plate',
    description: 'Partial plate over flexible joints.',
    pieceBuy: 150,
    weightClass: 'medium',
    armorValue: 5,
    stealthDisadvantage: true,
    material: 'iron',
  }),
  ...armorSet({
    id: 'ring-mail',
    name: 'Ring Mail',
    description: 'Heavy rings sewn onto leather.',
    pieceBuy: 6,
    weightClass: 'heavy',
    armorValue: 4,
    stealthDisadvantage: true,
    material: 'iron',
  }),
  ...armorSet({
    id: 'chain-mail',
    name: 'Chain Mail',
    description: 'A full suit of interlocking rings.',
    pieceBuy: 15,
    weightClass: 'heavy',
    armorValue: 6,
    stealthDisadvantage: true,
    strRequirement: 13,
    material: 'iron',
  }),
  ...armorSet({
    id: 'splint',
    name: 'Splint',
    description: 'Narrow vertical strips of metal.',
    pieceBuy: 40,
    weightClass: 'heavy',
    armorValue: 7,
    stealthDisadvantage: true,
    strRequirement: 15,
    material: 'iron',
  }),
  ...armorSet({
    id: 'plate',
    name: 'Plate',
    description: 'A full suit of fitted plates.',
    pieceBuy: 300,
    weightClass: 'heavy',
    armorValue: 8,
    stealthDisadvantage: true,
    strRequirement: 15,
    material: 'iron',
  }),
  {
    id: 'shield',
    name: 'Shield',
    description: 'A wooden or metal shield for the off hand.',
    category: 'gear',
    rarity: 'common',
    stackable: true,
    sellValue: 5,
    tags: ['shield'],
    gear: {
      slot: 'offHand',
      magicBonus: magicBonusForRarity('common'),
      shield: true,
    },
  },
] as const satisfies readonly ItemDef[]
