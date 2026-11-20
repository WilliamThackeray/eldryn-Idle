import { ARMOR } from '../items/armor'
import type { ItemId } from '../items'
import { activity, drop, stack } from './define'

function vestments() {
  return ARMOR.filter((item) => item.id.startsWith('vestment-')).map((item) => {
    const isChest = item.id.endsWith('-chest')
    return activity({
      skillId: 'religion',
      id: `craft-${item.id}`,
      name: `Craft ${item.name}`,
      description: `Stitch ${item.name.toLowerCase()}.`,
      requiredLevel: 1,
      inputs: [stack('forest-herbs', isChest ? 2 : 1)],
      outputs: [drop(item.id as ItemId)],
    })
  })
}

const holyWater = [drop('holy-water', 5, 10)]

export const religionActivities = [
  activity({
    skillId: 'religion',
    id: 'village-shrine',
    name: 'Village Shrine',
    description: 'Keep a village shrine. Bless Holy Water.',
    requiredLevel: 1,
    outputs: holyWater,
  }),
  activity({
    skillId: 'religion',
    id: 'town-temple',
    name: 'Town Temple',
    description: 'Attend rites at the town temple. Bless Holy Water.',
    requiredLevel: 20,
    outputs: holyWater,
  }),
  activity({
    skillId: 'religion',
    id: 'cathedral',
    name: 'Cathedral',
    description: 'Attend rites at the cathedral. Bless Holy Water.',
    requiredLevel: 40,
    outputs: holyWater,
  }),
  activity({
    skillId: 'religion',
    id: 'craft-holy-symbol',
    name: 'Craft Holy Symbol',
    description: 'Bless a holy symbol for the off hand.',
    requiredLevel: 1,
    inputs: [stack('bones')],
    outputs: [drop('holy-symbol')],
  }),
  activity({
    skillId: 'religion',
    id: 'craft-blessed-parchment',
    name: 'Craft Blessed Parchment',
    description: 'Ink holy text onto parchment.',
    requiredLevel: 1,
    inputs: [stack('ink')],
    outputs: [drop('blessed-parchment')],
  }),
  ...vestments(),
]
