import { activity, drop } from './define'

export const perceptionActivities = [
  activity({ skillId: 'perception', id: 'watch-duty', name: 'Watch Duty', description: 'Stand a watch and learn to notice movement.', requiredLevel: 1 }),
  activity({ skillId: 'perception', id: 'ship-lookout', name: 'Ship Lookout', description: 'Watch the horizon from a mast.', requiredLevel: 15 }),
  activity({ skillId: 'perception', id: 'scout-wilds', name: 'Scout the Wilds', description: 'Scout a biome and write what you find.', requiredLevel: 30, outputs: [drop('scouting-report')] }),
]
