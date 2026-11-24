import { activity, drop } from './define'
import type { ItemId } from '../items'

const PLOT_MS = 30 * 60 * 1000

function forage(
  id: string,
  name: string,
  description: string,
  level: number,
  item: ItemId,
  category = 'Foraging',
  min = 1,
  max = min,
) {
  return activity({
    skillId: 'foraging',
    id,
    name,
    description,
    requiredLevel: level,
    outputs: [drop(item, min, max)],
    category,
  })
}

export const foragingActivities = [
  forage('forage-forest', 'Forage Forest Herbs', 'Gather herbs on the forest floor.', 1, 'forest-herbs'),
  forage('forage-flax', 'Gather Flax', 'Pull flax from the field edge.', 4, 'flax'),
  forage('forage-verge', 'Walk the Verge', 'Pick the herbs along the field edge.', 8, 'forest-herbs'),
  activity({
    skillId: 'foraging',
    id: 'herb-plot',
    name: 'Herb Plot',
    description: 'One plot. Grows forest herbs on a long timer.',
    requiredLevel: 8,
    outputs: [drop('forest-herbs', 1, 3)],
    baseIntervalMs: PLOT_MS,
    category: 'Plots',
  }),
  forage('gardening', 'Gardening', 'Tend mistletoe for primal cantrips.', 12, 'mistletoe-sprig', 'Plots', 5, 10),
  forage('forage-desert', 'Forage Desert Herbs', 'Gather bitter plants from dry ground.', 18, 'desert-herbs'),
  forage('forage-riverbank', 'Forage the Riverbank', 'Pick herbs along the water.', 24, 'forest-herbs'),
  forage('forage-spices', 'Forage Desert Spices', 'Gather spices in the waste.', 30, 'desert-spices'),
  forage('forage-thicket', 'Forage the Thicket', 'Push into a dry thicket for herbs.', 36, 'desert-herbs'),
  forage('forage-highland', 'Forage the Highland', 'Gather spices on the high slope.', 42, 'desert-spices'),
  forage('forage-glade', 'Forage a Glade', 'Pick a sunlit glade clean.', 48, 'forest-herbs'),
  forage('forage-moss', 'Gather Moss', 'Scrape moss for the pot.', 54, 'forest-herbs'),
  forage('forage-fey', 'Forage Fey Herbs', 'Gather herbs where the Feywild leaks through.', 64, 'fey-herbs'),
  forage('forage-starlight', 'Forage by Starlight', 'Gather fey herbs after dusk.', 74, 'fey-herbs'),
  forage('forage-moonherb', 'Gather Moonherb', 'The last high meadow.', 84, 'fey-herbs'),
]
