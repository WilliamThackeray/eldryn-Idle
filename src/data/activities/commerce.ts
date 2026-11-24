import { activity, drop, stack } from './define'
import { fillDisplay } from './display'

export const commerceActivities = fillDisplay(
  [
    activity({
      skillId: 'commerce',
      id: 'haggle',
      name: 'Haggle at Market',
      description: 'Practice a bargain. Earn Guild Favor for shop discounts.',
      requiredLevel: 1,
      favor: { min: 1, max: 2 },
    }),
    activity({
      skillId: 'commerce',
      id: 'card-sharping',
      name: 'Card Sharping',
      description: 'Cheat a friendly game of cards for gold.',
      requiredLevel: 1,
      outputs: [drop('marked-cards'), drop('disguise-kit', 1, 1, 0.2)],
      gold: { min: 2, max: 4 },
    }),
    activity({
      skillId: 'commerce',
      id: 'snake-oil',
      name: 'Snake-Oil Sales',
      description: 'Sell a harmless lie to a crowd for gold.',
      requiredLevel: 10,
      gold: { min: 3, max: 6 },
      outputs: [drop('false-papers', 1, 1, 0.3), drop('disguise-kit', 1, 1, 0.15)],
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
      id: 'petition-guilds',
      name: 'Petition the Guilds',
      description: 'Spend a Trade Contract for a Letter of Introduction.',
      requiredLevel: 20,
      inputs: [stack('trade-contract')],
      outputs: [drop('letter-of-introduction')],
      favor: { min: 1, max: 2 },
    }),
    activity({
      skillId: 'commerce',
      id: 'trade-deals',
      name: 'Negotiate Trade Deals',
      description: 'Close a trade for coin and a Trade Contract.',
      requiredLevel: 35,
      gold: { min: 4, max: 9 },
      outputs: [drop('trade-contract')],
    }),
  ],
  (def, index) => ({
    category:
      def.id === 'card-sharping' || def.id === 'snake-oil'
        ? 'Schemes'
        : def.id === 'tavern-gossip' || def.id === 'read-the-market'
          ? 'Rumors'
          : 'Trade',
    sortOrder: index,
  }),
)
