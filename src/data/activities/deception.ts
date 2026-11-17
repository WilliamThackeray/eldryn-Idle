import { activity, drop } from './define'

export const deceptionActivities = [
  activity({ skillId: 'deception', id: 'card-sharping', name: 'Card Sharping', description: 'Cheat a friendly game of cards.', requiredLevel: 1, gold: { min: 3, max: 8 } }),
  activity({ skillId: 'deception', id: 'snake-oil', name: 'Snake-Oil Sales', description: 'Sell a harmless lie to a crowd.', requiredLevel: 10, gold: { min: 5, max: 12 } }),
  activity({
    skillId: 'deception',
    id: 'forgery-papers',
    name: 'Forge Travel Papers',
    description: 'Fake travel papers and a guild writ for dungeon access.',
    requiredLevel: 15,
    gold: { min: 8, max: 16 },
    outputs: [drop('guild-writ')],
  }),
]
