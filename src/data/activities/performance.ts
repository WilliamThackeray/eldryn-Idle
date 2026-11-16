import { activity } from './define'

export const performanceActivities = [
  activity({ skillId: 'performance', id: 'local-music', name: 'Local Music', description: 'Play a set in a local tavern.', requiredLevel: 1, gold: { min: 2, max: 6 } }),
  activity({ skillId: 'performance', id: 'traveling-music', name: 'Traveling Music', description: 'Play for a road crowd.', requiredLevel: 10, gold: { min: 4, max: 10 } }),
  activity({ skillId: 'performance', id: 'local-play', name: 'Local Play', description: 'Act in a local play.', requiredLevel: 20, gold: { min: 6, max: 12 } }),
]
