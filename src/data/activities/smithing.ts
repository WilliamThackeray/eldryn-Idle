import { ARMOR } from '../items/armor'
import type { GearMaterial, ItemId } from '../items'
import { WEAPONS } from '../items/weapons'
import {
  ARMOR_PIECE_LEVELS,
  ARROWHEAD_TYPE_LEVEL,
  MATERIAL_LEVEL,
  SHIELD_TYPE_LEVEL,
  WEAPON_TYPE_LEVEL,
} from '../../engine/config'
import { lockUnlock } from './capLevels'
import { withCombatGates } from './gates'
import { activity, drop, stack } from './define'
import type { ActivityDef } from './types'

// TODO(design): should equipping heavy armor TYPES also need a Class Level?

const TIER_NAME: Record<GearMaterial, string> = {
  iron: 'Iron',
  steel: 'Steel',
  silvered: 'Silvered',
  mithral: 'Mithral',
  adamantine: 'Adamantine',
}

const TIER_RANK: Record<GearMaterial, number> = {
  iron: 0,
  steel: 1,
  silvered: 2,
  mithral: 3,
  adamantine: 4,
}

const slag = [drop('slag')]

const BAR_FOR: Record<GearMaterial, ItemId> = {
  iron: 'iron-bar',
  steel: 'steel-bar',
  silvered: 'silver-bar',
  mithral: 'mithral-bar',
  adamantine: 'adamantine-bar',
}

const ARROWHEADS: { id: ItemId; material: GearMaterial; name: string }[] = [
  { id: 'iron-arrowhead', material: 'iron', name: 'Iron Arrowheads' },
  { id: 'steel-arrowhead', material: 'steel', name: 'Steel Arrowheads' },
  { id: 'silvered-arrowhead', material: 'silvered', name: 'Silvered Arrowheads' },
  { id: 'mithral-arrowhead', material: 'mithral', name: 'Mithral Arrowheads' },
  { id: 'adamantine-arrowhead', material: 'adamantine', name: 'Adamantine Arrowheads' },
]

function barCount(itemId: string, slot?: string): number {
  if (itemId === 'dagger' || itemId === 'dart' || itemId === 'sickle') return 1
  if (itemId.endsWith('-longsword') || itemId === 'longsword') return 3
  if (slot === 'chest' || itemId.endsWith('-chest')) return 3
  return 2
}

function gearLevel(item: (typeof WEAPONS)[number] | (typeof ARMOR)[number], material: GearMaterial): number {
  const band = MATERIAL_LEVEL[material]
  if (item.gear?.shield || item.id.includes('shield')) return Math.max(SHIELD_TYPE_LEVEL, band)
  if (item.id.endsWith('arrowhead')) return Math.max(ARROWHEAD_TYPE_LEVEL, band)
  const armor = item.id.match(/^(?:(?:steel|silvered|mithral|adamantine)-)?(.+)-(helmet|chest|chaps|gauntlets|boots)$/)
  if (armor) {
    const piece = ARMOR_PIECE_LEVELS[armor[1]!]?.[armor[2]!]
    if (piece != null) return Math.max(piece, band)
  }
  const base = item.id.replace(/^(steel|silvered|mithral|adamantine)-/, '')
  const typed = WEAPON_TYPE_LEVEL[base as keyof typeof WEAPON_TYPE_LEVEL]
  return Math.max(typed ?? band, band)
}

function smithSection(item: (typeof WEAPONS)[number] | (typeof ARMOR)[number], tier: string) {
  if (item.gear?.shield || item.id.includes('shield')) return { group: tier, category: 'Shields', section: 2 }
  if (item.gear?.weapon) return { group: tier, category: 'Weapons', section: 0 }
  const set = item.name.replace(/ (Helmet|Chest|Chaps|Gauntlets|Boots)$/, '')
  return { group: `${tier} / ${set}`, category: 'Armor', section: 1 }
}

function smithMetalGear(): ActivityDef[] {
  const recipes: ActivityDef[] = []
  for (const item of [...WEAPONS, ...ARMOR]) {
    const material = item.gear?.material
    if (!material) continue
    const bars = barCount(item.id, item.gear?.slot)
    const barId = BAR_FOR[material]
    const tier = TIER_NAME[material]
    const { group, category, section } = smithSection(item, tier)
    const id = `smith-${item.id}`
    const requiredLevel = gearLevel(item, material)
    if (material === 'iron') lockUnlock('smithing', id)
    recipes.push(
      activity({
        skillId: 'smithing',
        id,
        name: `Smith ${item.name}`,
        description: `Forge ${item.name.toLowerCase()} from ${barId.replace('-', ' ')}s.`,
        requiredLevel,
        inputs: [stack(barId, bars)],
        outputs: [drop(item.id as ItemId)],
        category,
        group,
        sortOrder: TIER_RANK[material] * 10000 + section * 1000 + recipes.length,
      }),
    )
  }
  for (const tip of ARROWHEADS) {
    const id = `smith-${tip.id}`
    if (tip.material === 'iron') lockUnlock('smithing', id)
    recipes.push(
      activity({
        skillId: 'smithing',
        id,
        name: `Smith ${tip.name}`,
        description: `Forge a batch of ${tip.name.toLowerCase()}.`,
        requiredLevel: Math.max(ARROWHEAD_TYPE_LEVEL, MATERIAL_LEVEL[tip.material]),
        inputs: [stack(BAR_FOR[tip.material])],
        outputs: [drop(tip.id, 10)],
        category: 'Weapons',
        group: TIER_NAME[tip.material],
        sortOrder: TIER_RANK[tip.material] * 10000 + 3 * 1000 + recipes.length,
      }),
    )
  }
  return recipes
}

const SMELT: ActivityDef[] = [
  activity({
    skillId: 'smithing',
    id: 'smith-iron',
    name: 'Smith Iron Bar',
    description: 'Smelt iron ore into a bar.',
    requiredLevel: 1,
    inputs: [stack('iron-ore')],
    outputs: [drop('iron-bar')],
    byproducts: slag,
    category: 'Smelting',
    sortOrder: 0,
  }),
  activity({
    skillId: 'smithing',
    id: 'smith-steel',
    name: 'Smith Steel Bar',
    description: 'Smelt iron ore with coal into steel.',
    requiredLevel: 15,
    inputs: [stack('iron-ore'), stack('coal')],
    outputs: [drop('steel-bar')],
    byproducts: slag,
    category: 'Smelting',
    sortOrder: 1,
  }),
  activity({
    skillId: 'smithing',
    id: 'smith-silver',
    name: 'Smith Silver Bar',
    description: 'Smelt silver ore into a bar.',
    requiredLevel: 30,
    inputs: [stack('silver-ore')],
    outputs: [drop('silver-bar')],
    byproducts: slag,
    category: 'Smelting',
    sortOrder: 2,
  }),
  activity({
    skillId: 'smithing',
    id: 'smith-gold',
    name: 'Smith Gold Bar',
    description: 'Smelt gold ore into a bar.',
    requiredLevel: 40,
    inputs: [stack('gold-ore')],
    outputs: [drop('gold-bar')],
    byproducts: slag,
    category: 'Smelting',
    sortOrder: 3,
  }),
  activity({
    skillId: 'smithing',
    id: 'smith-mithral',
    name: 'Smith Mithral Bar',
    description: 'Smelt mithral ore into a bar.',
    requiredLevel: 60,
    inputs: [stack('mithral-ore')],
    outputs: [drop('mithral-bar')],
    byproducts: slag,
    category: 'Smelting',
    sortOrder: 4,
  }),
  activity({
    skillId: 'smithing',
    id: 'smith-adamantine',
    name: 'Smith Adamantine Bar',
    description: 'Smelt adamantine ore into a bar.',
    requiredLevel: 80,
    inputs: [stack('adamantine-ore')],
    outputs: [drop('adamantine-bar')],
    byproducts: slag,
    category: 'Smelting',
    sortOrder: 5,
  }),
]

for (const bar of SMELT) lockUnlock('smithing', bar.id)

const DRILL: ActivityDef[] = [
  activity({
    skillId: 'smithing',
    id: 'temper-mithral',
    name: 'Temper Mithral',
    description: 'Practice the heat that mithral wants.',
    requiredLevel: 74,
    category: 'Smelting',
  }),
  activity({
    skillId: 'smithing',
    id: 'plan-adamantine',
    name: 'Plan the Adamantine',
    description: 'Study how adamantine takes a heat.',
    requiredLevel: 78,
    category: 'Smelting',
  }),
]

export const smithingActivities: ActivityDef[] = withCombatGates([...SMELT, ...smithMetalGear(), ...DRILL])
