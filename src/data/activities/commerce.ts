import { activity, drop } from './define'
import { fillDisplay } from './display'

export const commerceActivities = fillDisplay(
  [
    activity({
      skillId: 'commerce',
      id: 'card-sharping',
      name: 'Card Sharping',
      description: 'Cheat a friendly game of cards.',
      requiredLevel: 1,
      outputs: [drop('marked-cards'), drop('disguise-kit', 1, 1, 0.2)],
      gold: { min: 2, max: 4 },
    }),
    activity({
      skillId: 'commerce',
      id: 'snake-oil',
      name: 'Snake-Oil Sales',
      description: 'Sell a harmless lie to a crowd.',
      requiredLevel: 10,
      gold: { min: 3, max: 6 },
      outputs: [drop('false-papers', 1, 1, 0.3), drop('disguise-kit', 1, 1, 0.15)],
    }),
    activity({
      skillId: 'commerce',
      id: 'haggle',
      name: 'Haggle at Market',
      description: 'Practice a bargain. Earn Guild Favor and Trade Contracts.',
      requiredLevel: 1,
      outputs: [drop('silver-tongue'), drop('trade-contract', 1, 1, 0.25)],
      favor: { min: 1, max: 2 },
    }),
    activity({
      skillId: 'commerce',
      id: 'petition-guilds',
      name: 'Petition the Guilds',
      description: 'Petition for access. Earn Guild Favor and letters.',
      requiredLevel: 20,
      outputs: [drop('letter-of-introduction', 1, 1, 0.35), drop('trade-contract', 1, 1, 0.2)],
      favor: { min: 2, max: 4 },
    }),
    activity({
      skillId: 'commerce',
      id: 'trade-deals',
      name: 'Negotiate Trade Deals',
      description: 'Close a small trade for coin and contracts.',
      requiredLevel: 35,
      gold: { min: 4, max: 9 },
      outputs: [drop('trade-contract', 1, 1, 0.5), drop('letter-of-introduction', 1, 1, 0.15)],
    }),
    activity({
      skillId: 'commerce',
      id: 'tavern-gossip',
      name: 'Tavern Gossip',
      description: 'Listen in the tavern until a lead slips.',
      requiredLevel: 1,
      outputs: [drop('rumor')],
    }),
    activity({
      skillId: 'commerce',
      id: 'read-the-market',
      name: 'Read the Market',
      description: 'Watch who is buying. Gather Intel and Rumors.',
      requiredLevel: 15,
      outputs: [drop('intel', 1, 1, 0.4), drop('rumor', 1, 1, 0.25)],
    }),
    activity({
      skillId: 'commerce',
      id: 'debt-collection',
      name: 'Debt Collection',
      description: 'Collect a debt that someone hoped you’d forget.',
      requiredLevel: 15,
      gold: { min: 3, max: 6 },
      outputs: [drop('bounty-contract', 1, 1, 0.4)],
    }),
  ],
  (def, index) => ({
    category:
      def.id === 'card-sharping' || def.id === 'snake-oil'
        ? 'Schemes'
        : def.id === 'tavern-gossip' || def.id === 'read-the-market'
          ? 'Rumors'
          : def.id === 'debt-collection'
            ? 'Debts'
            : 'Trade',
    sortOrder: index,
  }),
)
