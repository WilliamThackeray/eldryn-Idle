import { ARMOR } from '../items/armor'
import type { ItemId } from '../items'
import { activity, drop, stack } from './define'

function minstrelGear() {
  return ARMOR.filter((item) => item.id.startsWith('minstrel-')).map((item) => {
    const isChest = item.id.endsWith('-chest')
    return activity({
      skillId: 'performance',
      id: `craft-${item.id}`,
      name: `Craft ${item.name}`,
      description: `Stitch ${item.name.toLowerCase()}.`,
      requiredLevel: 1,
      inputs: [stack('animal-scraps', isChest ? 2 : 1)],
      outputs: [drop(item.id as ItemId)],
    })
  })
}

const rosin = [drop('rosin', 5, 10)]

export const performanceActivities = [
  activity({
    skillId: 'performance',
    id: 'local-music',
    name: 'Local Music',
    description: 'Play a set in a local tavern. Collect Rosin.',
    requiredLevel: 1,
    outputs: rosin,
    gold: { min: 2, max: 6 },
  }),
  activity({
    skillId: 'performance',
    id: 'traveling-music',
    name: 'Traveling Music',
    description: 'Play for a road crowd. Collect Rosin.',
    requiredLevel: 10,
    outputs: rosin,
    gold: { min: 4, max: 10 },
  }),
  activity({
    skillId: 'performance',
    id: 'local-play',
    name: 'Local Play',
    description: 'Act in a local play. Collect Rosin.',
    requiredLevel: 20,
    outputs: rosin,
    gold: { min: 6, max: 12 },
  }),
  ...minstrelGear(),
]
