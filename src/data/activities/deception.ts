import { activity, drop } from './define'

export const deceptionActivities = [
  activity({
    skillId: 'deception',
    id: 'card-sharping',
    name: 'Card Sharping',
    description: 'Cheat a friendly game of cards.',
    requiredLevel: 1,
    outputs: [drop('marked-cards'), drop('disguise-kit', 1, 1, 0.2)],
    gold: { min: 2, max: 4 },
  }),
  activity({
    skillId: 'deception',
    id: 'snake-oil',
    name: 'Snake-Oil Sales',
    description: 'Sell a harmless lie to a crowd.',
    requiredLevel: 10,
    gold: { min: 3, max: 6 },
    outputs: [drop('false-papers', 1, 1, 0.3), drop('disguise-kit', 1, 1, 0.15)],
  }),
  activity({
    skillId: 'deception',
    id: 'forgery-papers',
    name: 'Forge Travel Papers',
    description: 'Fake travel papers and a forged writ for dungeon access.',
    requiredLevel: 15,
    gold: { min: 4, max: 8 },
    outputs: [drop('forged-writ'), drop('false-papers', 1, 1, 0.25)],
  }),
]
