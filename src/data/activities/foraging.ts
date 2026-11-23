import { activity, drop } from './define'

const PLOT_MS = 30 * 60 * 1000

export const foragingActivities = [
  activity({
    skillId: 'foraging',
    id: 'forage-forest',
    name: 'Forage Forest Herbs',
    description: 'Gather herbs on the forest floor.',
    requiredLevel: 1,
    outputs: [drop('forest-herbs')],
    category: 'Foraging',
  }),
  activity({
    skillId: 'foraging',
    id: 'forage-desert',
    name: 'Forage Desert Herbs',
    description: 'Gather bitter plants from dry ground.',
    requiredLevel: 20,
    outputs: [drop('desert-herbs')],
    category: 'Foraging',
  }),
  activity({
    skillId: 'foraging',
    id: 'forage-spices',
    name: 'Forage Desert Spices',
    description: 'Gather spices in the waste.',
    requiredLevel: 40,
    outputs: [drop('desert-spices')],
    category: 'Foraging',
  }),
  activity({
    skillId: 'foraging',
    id: 'forage-fey',
    name: 'Forage Fey Herbs',
    description: 'Gather herbs where the Feywild leaks through.',
    requiredLevel: 70,
    outputs: [drop('fey-herbs')],
    category: 'Foraging',
  }),
  activity({
    skillId: 'foraging',
    id: 'gardening',
    name: 'Gardening',
    description: 'Tend mistletoe for primal cantrips.',
    requiredLevel: 1,
    outputs: [drop('mistletoe-sprig', 5, 10)],
    category: 'Plots',
  }),
  activity({
    skillId: 'foraging',
    id: 'herb-plot',
    name: 'Herb Plot',
    description: 'One plot. Grows forest herbs on a long timer.',
    requiredLevel: 1,
    outputs: [drop('forest-herbs', 1, 3)],
    baseIntervalMs: PLOT_MS,
    category: 'Plots',
  }),
]
