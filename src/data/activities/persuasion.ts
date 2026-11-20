import { activity, drop } from './define'

export const persuasionActivities = [
  activity({
    skillId: 'persuasion',
    id: 'haggle',
    name: 'Haggle at Market',
    description: 'Practice a bargain. Earn Guild Favor and Trade Contracts.',
    requiredLevel: 1,
    outputs: [drop('silver-tongue'), drop('trade-contract', 1, 1, 0.25)],
    favor: { min: 1, max: 2 },
  }),
  activity({
    skillId: 'persuasion',
    id: 'petition-guilds',
    name: 'Petition the Guilds',
    description: 'Petition for access. Earn Guild Favor and letters.',
    requiredLevel: 20,
    outputs: [drop('letter-of-introduction', 1, 1, 0.35), drop('trade-contract', 1, 1, 0.2)],
    favor: { min: 2, max: 4 },
  }),
  activity({
    skillId: 'persuasion',
    id: 'trade-deals',
    name: 'Negotiate Trade Deals',
    description: 'Close a small trade for coin and contracts.',
    requiredLevel: 35,
    gold: { min: 4, max: 9 },
    outputs: [drop('trade-contract', 1, 1, 0.5), drop('letter-of-introduction', 1, 1, 0.15)],
  }),
]
