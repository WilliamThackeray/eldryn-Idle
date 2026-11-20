import { ARMOR } from '../items/armor'
import type { GearMaterial, ItemId } from '../items'
import { WEAPONS } from '../items/weapons'
import { MATERIAL_LEVEL } from '../../engine/config'
import { activity, drop, stack } from './define'
import type { ActivityDef } from './types'

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

function smithMetalGear(): ActivityDef[] {
  const recipes: ActivityDef[] = []
  for (const item of [...WEAPONS, ...ARMOR]) {
    const material = item.gear?.material
    if (!material) continue
    const bars = barCount(item.id, item.gear?.slot)
    const barId = BAR_FOR[material]
    recipes.push(
      activity({
        skillId: 'athletics',
        id: `smith-${item.id}`,
        name: `Smith ${item.name}`,
        description: `Forge ${item.name.toLowerCase()} from ${barId.replace('-', ' ')}s.`,
        requiredLevel: MATERIAL_LEVEL[material],
        inputs: [stack(barId, bars)],
        outputs: [drop(item.id as ItemId)],
      }),
    )
  }
  for (const tip of ARROWHEADS) {
    recipes.push(
      activity({
        skillId: 'athletics',
        id: `smith-${tip.id}`,
        name: `Smith ${tip.name}`,
        description: `Forge a batch of ${tip.name.toLowerCase()}.`,
        requiredLevel: MATERIAL_LEVEL[tip.material],
        inputs: [stack(BAR_FOR[tip.material])],
        outputs: [drop(tip.id, 10)],
      }),
    )
  }
  return recipes
}

export const athleticsActivities = [
  activity({ skillId: 'athletics', id: 'mine-iron', name: 'Mine Iron', description: 'Work a surface vein of iron.', requiredLevel: 1, outputs: [drop('iron-ore'), drop('mica-chip', 1, 1, 0.25), drop('sulfur', 1, 1, 0.25)], rareTable: [drop('coal', 1, 1, 0.05)] }),
  activity({ skillId: 'athletics', id: 'mine-coal', name: 'Mine Coal', description: 'Dig coal for the forge.', requiredLevel: 15, outputs: [drop('coal'), drop('mica-chip', 1, 1, 0.25), drop('sulfur', 1, 1, 0.25)] }),
  activity({ skillId: 'athletics', id: 'mine-silver', name: 'Mine Silver', description: 'Follow a silver vein.', requiredLevel: 30, outputs: [drop('silver-ore'), drop('mica-chip', 1, 1, 0.25), drop('sulfur', 1, 1, 0.25)] }),
  activity({ skillId: 'athletics', id: 'mine-gold', name: 'Mine Gold Ore', description: 'Chip gold ore out of the rock.', requiredLevel: 40, outputs: [drop('gold-ore'), drop('mica-chip', 1, 1, 0.25), drop('sulfur', 1, 1, 0.25)] }),
  activity({ skillId: 'athletics', id: 'mine-mithral', name: 'Mine Mithral', description: 'Work a deep mithral seam.', requiredLevel: 60, outputs: [drop('mithral-ore'), drop('mica-chip', 1, 1, 0.25), drop('sulfur', 1, 1, 0.25)] }),
  activity({ skillId: 'athletics', id: 'mine-adamantine', name: 'Mine Adamantine', description: 'Break adamantine out of the deep rock.', requiredLevel: 80, outputs: [drop('adamantine-ore'), drop('mica-chip', 1, 1, 0.25), drop('sulfur', 1, 1, 0.25)] }),
  activity({ skillId: 'athletics', id: 'smith-iron', name: 'Smith Iron Bar', description: 'Smelt iron ore into a bar.', requiredLevel: 1, inputs: [stack('iron-ore')], outputs: [drop('iron-bar')], byproducts: slag }),
  activity({ skillId: 'athletics', id: 'smith-steel', name: 'Smith Steel Bar', description: 'Smelt iron ore with coal into steel.', requiredLevel: 15, inputs: [stack('iron-ore'), stack('coal')], outputs: [drop('steel-bar')], byproducts: slag }),
  activity({ skillId: 'athletics', id: 'smith-silver', name: 'Smith Silver Bar', description: 'Smelt silver ore into a bar.', requiredLevel: 30, inputs: [stack('silver-ore')], outputs: [drop('silver-bar')], byproducts: slag }),
  activity({ skillId: 'athletics', id: 'smith-gold', name: 'Smith Gold Bar', description: 'Smelt gold ore into a bar.', requiredLevel: 40, inputs: [stack('gold-ore')], outputs: [drop('gold-bar')], byproducts: slag }),
  activity({ skillId: 'athletics', id: 'smith-mithral', name: 'Smith Mithral Bar', description: 'Smelt mithral ore into a bar.', requiredLevel: 60, inputs: [stack('mithral-ore')], outputs: [drop('mithral-bar')], byproducts: slag }),
  activity({ skillId: 'athletics', id: 'smith-adamantine', name: 'Smith Adamantine Bar', description: 'Smelt adamantine ore into a bar.', requiredLevel: 80, inputs: [stack('adamantine-ore')], outputs: [drop('adamantine-bar')], byproducts: slag }),
  ...smithMetalGear(),
]
