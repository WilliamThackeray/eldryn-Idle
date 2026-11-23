import { ARMOR } from '../items/armor'
import type { ItemId } from '../items'
import { activity, drop, stack } from './define'
import { fillDisplay } from './display'

function minstrelGear() {
  return ARMOR.filter((item) => item.id.startsWith('minstrel-')).map((item, index) => {
    const isChest = item.id.endsWith('-chest')
    return activity({
      skillId: 'performance',
      id: `craft-${item.id}`,
      name: `Craft ${item.name}`,
      description: `Stitch ${item.name.toLowerCase()}.`,
      requiredLevel: 1,
      inputs: [stack('animal-scraps', isChest ? 2 : 1)],
      outputs: [drop(item.id as ItemId)],
      category: 'Attire',
      sortOrder: index,
    })
  })
}

const venueOutputs = [drop('rosin', 5, 10), drop('inspiration', 1, 1, 0.35)]

export const performanceActivities = fillDisplay([
  activity({
    skillId: 'performance',
    id: 'local-music',
    name: 'Local Music',
    description: 'Play a set in a local tavern. Collect Rosin and Inspiration.',
    requiredLevel: 1,
    outputs: venueOutputs,
    gold: { min: 1, max: 3 },
  }),
  activity({
    skillId: 'performance',
    id: 'traveling-music',
    name: 'Traveling Music',
    description: 'Play for a road crowd. Collect Rosin and Inspiration.',
    requiredLevel: 10,
    renownRequired: 5,
    outputs: venueOutputs,
    gold: { min: 2, max: 5 },
  }),
  activity({
    skillId: 'performance',
    id: 'local-play',
    name: 'Local Play',
    description: 'Act in a local play. Collect Rosin and Inspiration.',
    requiredLevel: 20,
    renownRequired: 15,
    outputs: venueOutputs,
    gold: { min: 3, max: 6 },
  }),
  activity({
    skillId: 'performance',
    id: 'arena-music',
    name: 'Arena Music',
    description: 'Play for the arena. Collect Rosin and Inspiration.',
    requiredLevel: 30,
    renownRequired: 30,
    outputs: venueOutputs,
    gold: { min: 4, max: 8 },
  }),
  activity({
    skillId: 'performance',
    id: 'traveling-play',
    name: 'Traveling Play',
    description: 'Tour with a play. Collect Rosin and Inspiration.',
    requiredLevel: 45,
    renownRequired: 50,
    outputs: venueOutputs,
    gold: { min: 6, max: 12 },
  }),
  activity({
    skillId: 'performance',
    id: 'grand-theater',
    name: 'Grand Theater',
    description: 'Take the grand stage. Collect Rosin and Inspiration.',
    requiredLevel: 60,
    renownRequired: 80,
    outputs: venueOutputs,
    gold: { min: 8, max: 16 },
  }),
  ...minstrelGear(),
], (def, index) => ({
  category: def.id.startsWith('craft-minstrel') ? 'Attire' : 'Venues',
  sortOrder: index,
}))
