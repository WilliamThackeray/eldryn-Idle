import { ARMOR } from '../items/armor'
import type { ItemId } from '../items'
import { activity, drop, stack } from './define'
import type { ActivityDef } from './types'

function attire(prefix: string, verb: string): ActivityDef[] {
  return ARMOR.filter((item) => item.id.startsWith(`${prefix}-`)).map((item, index) => {
    const isChest = item.id.endsWith('-chest')
    return activity({
      skillId: 'weaving',
      id: `craft-${item.id}`,
      name: `Craft ${item.name}`,
      description: `${verb} ${item.name.toLowerCase()}.`,
      requiredLevel: 1,
      inputs: [stack('forest-herbs', isChest ? 2 : 1)],
      outputs: [drop(item.id as ItemId)],
      category: 'Attire',
      group: prefix.charAt(0).toUpperCase() + prefix.slice(1),
      sortOrder: index,
    })
  })
}

export const weavingActivities: ActivityDef[] = [
  ...attire('wildweave', 'Weave'),
  ...attire('arcane', 'Stitch'),
  ...attire('vestment', 'Stitch'),
]
