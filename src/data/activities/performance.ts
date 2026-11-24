import { activity, drop } from './define'

const venueOutputs = [drop('rosin', 5, 10), drop('inspiration', 1, 1, 0.35)]

const VENUES: { id: string; name: string; description: string; level: number; renown?: number; gold: [number, number] }[] = [
  { id: 'local-music', name: 'Local Music', description: 'Play a set in a local tavern. Collect Rosin and Inspiration.', level: 1, gold: [1, 3] },
  { id: 'traveling-music', name: 'Traveling Music', description: 'Play for a road crowd. Collect Rosin and Inspiration.', level: 6, renown: 5, gold: [2, 5] },
  { id: 'local-play', name: 'Local Play', description: 'Act in a local play. Collect Rosin and Inspiration.', level: 12, renown: 15, gold: [3, 6] },
  { id: 'arena-music', name: 'Arena Music', description: 'Play for the arena. Collect Rosin and Inspiration.', level: 18, renown: 30, gold: [4, 8] },
  { id: 'traveling-play', name: 'Traveling Play', description: 'Tour with a play. Collect Rosin and Inspiration.', level: 24, renown: 50, gold: [6, 12] },
  { id: 'courtyard', name: 'Courtyard Set', description: 'Play a courtyard between shows.', level: 30, renown: 40, gold: [5, 10] },
  { id: 'festival', name: 'Festival Stage', description: 'Take a festival stage.', level: 36, renown: 60, gold: [6, 12] },
  { id: 'masque', name: 'The Masque', description: 'Perform at a masked ball.', level: 42, renown: 70, gold: [7, 14] },
  { id: 'grand-theater', name: 'Grand Theater', description: 'Take the grand stage. Collect Rosin and Inspiration.', level: 48, renown: 80, gold: [8, 16] },
  { id: 'rehearsal', name: 'Closed Rehearsal', description: 'Rehearse for the opera.', level: 54, renown: 90, gold: [9, 18] },
  { id: 'opera', name: 'Opera House', description: 'Sing at the opera.', level: 58, renown: 100, gold: [10, 20] },
  { id: 'royal-court', name: 'Royal Court', description: 'Perform for the court.', level: 68, renown: 120, gold: [12, 24] },
  { id: 'gala', name: 'Winter Gala', description: 'Play the winter gala.', level: 78, renown: 140, gold: [14, 28] },
  { id: 'royal-command', name: 'Royal Command', description: 'A command performance.', level: 88, renown: 160, gold: [16, 32] },
]

export const performanceActivities = VENUES.map((venue) =>
  activity({
    skillId: 'performance',
    id: venue.id,
    name: venue.name,
    description: venue.description,
    requiredLevel: venue.level,
    renownRequired: venue.renown,
    outputs: venueOutputs,
    gold: { min: venue.gold[0], max: venue.gold[1] },
    category: 'Venues',
  }),
)
