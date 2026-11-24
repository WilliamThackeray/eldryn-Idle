import { activity, drop } from './define'
import { fillDisplay } from './display'

export const thieveryActivities = fillDisplay(
  [
    activity({
      skillId: 'thievery',
      id: 'pickpocket-peasant',
      name: 'Pickpocket a Peasant',
      description: 'Lift a few coins from a crowd.',
      requiredLevel: 1,
      gold: { min: 2, max: 5 },
    }),
    activity({
      skillId: 'thievery',
      id: 'pickpocket-merchant',
      name: 'Pickpocket a Merchant',
      description: 'Lift a purse in the market.',
      requiredLevel: 16,
      gold: { min: 4, max: 9 },
    }),
    activity({
      skillId: 'thievery',
      id: 'pickpocket-guard',
      name: 'Pickpocket a Guard',
      description: 'Lift a guard’s coin while they look away.',
      requiredLevel: 28,
      gold: { min: 6, max: 14 },
    }),
    activity({
      skillId: 'thievery',
      id: 'pickpocket-noble',
      name: 'Pickpocket a Noble',
      description: 'Lift a noble’s spending money.',
      requiredLevel: 46,
      gold: { min: 12, max: 24 },
    }),
    activity({
      skillId: 'thievery',
      id: 'pickpocket-royal',
      name: 'Pickpocket Royalty',
      description: 'Lift coins from a royal retinue.',
      requiredLevel: 72,
      gold: { min: 20, max: 40 },
    }),
    activity({
      skillId: 'thievery',
      id: 'lockpick-shop',
      name: 'Pick a Shopkeep’s Safe',
      description: 'Open a shop safe for coin and trinkets.',
      requiredLevel: 5,
      outputs: [drop('valuables')],
      gold: { min: 5, max: 12 },
    }),
    activity({
      skillId: 'thievery',
      id: 'lockpick-bank',
      name: 'Pick a Bank Safe',
      description: 'Open a bank safe.',
      requiredLevel: 52,
      outputs: [drop('valuables', 1, 2)],
      gold: { min: 10, max: 22 },
    }),
    activity({
      skillId: 'thievery',
      id: 'lockpick-noble',
      name: 'Pick a Noble Vault',
      description: 'Open a noble vault.',
      requiredLevel: 62,
      outputs: [drop('valuables', 1, 2)],
      gold: { min: 18, max: 36 },
    }),
    activity({
      skillId: 'thievery',
      id: 'lockpick-royal',
      name: 'Pick the Royal Treasury',
      description: 'Open a treasury lock.',
      requiredLevel: 82,
      outputs: [drop('valuables', 2, 4)],
      gold: { min: 30, max: 60 },
    }),
    activity({
      skillId: 'thievery',
      id: 'merchant-warehouse',
      name: 'Merchant Warehouse',
      description: 'Slip through a merchant warehouse.',
      requiredLevel: 10,
      outputs: [drop('black-cloth')],
      gold: { min: 4, max: 10 },
    }),
    activity({
      skillId: 'thievery',
      id: 'guard-barracks',
      name: 'Guard Barracks',
      description: 'Slip through a guard barracks.',
      requiredLevel: 34,
      gold: { min: 8, max: 16 },
    }),
    activity({
      skillId: 'thievery',
      id: 'thieves-guild',
      name: 'Thieves’ Guild',
      description: 'Slip through the thieves’ guild.',
      requiredLevel: 40,
      gold: { min: 12, max: 24 },
    }),
    activity({
      skillId: 'thievery',
      id: 'forgery-papers',
      name: 'Forge Travel Papers',
      description: 'Fake travel papers and a forged writ for dungeon access.',
      requiredLevel: 22,
      gold: { min: 4, max: 8 },
      outputs: [drop('forged-writ'), drop('false-papers', 1, 1, 0.25)],
    }),
  ],
  (def, index) => ({
    category: def.id.startsWith('pickpocket-')
      ? 'Pickpocketing'
      : def.id.startsWith('lockpick-')
        ? 'Lockpicking'
        : def.id === 'forgery-papers'
          ? 'Forgery'
          : 'Infiltration',
    sortOrder: index,
  }),
)
