import { activity } from './define'

export const religionActivities = [
  activity({ skillId: 'religion', id: 'village-shrine', name: 'Village Shrine', description: 'Keep a village shrine.', requiredLevel: 1 }),
  activity({ skillId: 'religion', id: 'town-temple', name: 'Town Temple', description: 'Attend rites at the town temple.', requiredLevel: 20 }),
  activity({ skillId: 'religion', id: 'cathedral', name: 'Cathedral', description: 'Attend rites at the cathedral.', requiredLevel: 40 }),
]
