import { activity, drop } from './define'
import type { ItemId } from '../items'

function spot(id: string, name: string, description: string, level: number, item: ItemId) {
  return activity({
    skillId: 'fishing',
    id,
    name,
    description,
    requiredLevel: level,
    outputs: [drop(item)],
    category: 'Fishing',
  })
}

export const fishingActivities = [
  spot('fish-forest', 'Forest Fishing', 'Cast a line in a forest stream.', 1, 'raw-forest-fish'),
  spot('fish-creek', 'Creek Fishing', 'Work a narrow creek.', 7, 'raw-forest-fish'),
  spot('fish-mill', 'Millpond Fishing', 'Fish the still water by the mill.', 13, 'raw-forest-fish'),
  spot('fish-desert', 'Desert Fishing', 'Cast a line in an oasis.', 19, 'raw-desert-fish'),
  spot('fish-reed', 'Reed Fishing', 'Cast among the reeds.', 25, 'raw-desert-fish'),
  spot('fish-hills', 'Hills Fishing', 'Cast a line in a hill stream.', 31, 'raw-hills-fish'),
  spot('fish-weir', 'Weir Fishing', 'Fish the weir.', 37, 'raw-hills-fish'),
  spot('fish-coastal', 'Coastal Fishing', 'Cast a line in the surf.', 43, 'raw-coastal-fish'),
  spot('fish-tidepool', 'Tidepool Fishing', 'Pick over the tidepools.', 49, 'raw-coastal-fish'),
  spot('fish-swamp', 'Swamp Fishing', 'Fish the murky shallows.', 55, 'raw-swamp-fish'),
  spot('fish-marsh', 'Marsh Fishing', 'Fish the deep marsh.', 65, 'raw-swamp-fish'),
  spot('fish-estuary', 'Estuary Fishing', 'Fish where the river meets the sea.', 75, 'raw-coastal-fish'),
  spot('pearl-diving', 'Pearl Diving', 'Dive for pearls in deep coastal beds.', 80, 'pearl'),
  spot('fish-deep', 'Deep Water', 'Fish past the shelf.', 90, 'raw-coastal-fish'),
]
