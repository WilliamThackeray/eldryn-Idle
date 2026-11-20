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

export const performanceActivities = [
  activity({ skillId: 'performance', id: 'local-music', name: 'Local Music', description: 'Play a set in a local tavern.', requiredLevel: 1, gold: { min: 2, max: 6 } }),
  activity({ skillId: 'performance', id: 'traveling-music', name: 'Traveling Music', description: 'Play for a road crowd.', requiredLevel: 10, gold: { min: 4, max: 10 } }),
  activity({ skillId: 'performance', id: 'local-play', name: 'Local Play', description: 'Act in a local play.', requiredLevel: 20, gold: { min: 6, max: 12 } }),
  ...minstrelGear(),
]
