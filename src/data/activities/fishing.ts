import { activity, drop } from './define'

export const fishingActivities = [
  activity({
    skillId: 'fishing',
    id: 'fish-forest',
    name: 'Forest Fishing',
    description: 'Fish a forest stream.',
    requiredLevel: 1,
    outputs: [drop('raw-forest-fish')],
    category: 'Fishing',
  }),
  activity({
    skillId: 'fishing',
    id: 'fish-desert',
    name: 'Oasis Fishing',
    description: 'Fish a desert oasis.',
    requiredLevel: 20,
    outputs: [drop('raw-desert-fish')],
    category: 'Fishing',
  }),
  activity({
    skillId: 'fishing',
    id: 'fish-coastal',
    name: 'Coastal Fishing',
    description: 'Fish the coast.',
    requiredLevel: 40,
    outputs: [drop('raw-coastal-fish')],
    category: 'Fishing',
  }),
]
