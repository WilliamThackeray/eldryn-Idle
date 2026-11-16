import { activity, drop } from './define'

export const sleightOfHandActivities = [
  activity({ skillId: 'sleightOfHand', id: 'trap-small', name: 'Trap Small Animals', description: 'Set snares for small game.', requiredLevel: 1, outputs: [drop('small-animal'), drop('animal-scraps')] }),
  activity({ skillId: 'sleightOfHand', id: 'trap-fowl', name: 'Trap Air Fowl', description: 'Net birds on the wing.', requiredLevel: 20, outputs: [drop('air-fowl'), drop('animal-scraps')] }),
  activity({ skillId: 'sleightOfHand', id: 'trap-medium', name: 'Trap Medium Animals', description: 'Set traps for wolves, boar, and the like.', requiredLevel: 30, outputs: [drop('medium-animal'), drop('animal-scraps')] }),
  activity({ skillId: 'sleightOfHand', id: 'trap-large', name: 'Trap Large Animals', description: 'Set traps for bears, elk, and the like.', requiredLevel: 50, outputs: [drop('large-animal'), drop('animal-scraps')] }),
  activity({ skillId: 'sleightOfHand', id: 'pickpocket-peasant', name: 'Pickpocket a Peasant', description: 'Lift a few coins from a crowd.', requiredLevel: 1, gold: { min: 2, max: 5 } }),
  activity({ skillId: 'sleightOfHand', id: 'pickpocket-merchant', name: 'Pickpocket a Merchant', description: 'Lift a purse in the market.', requiredLevel: 10, gold: { min: 4, max: 9 } }),
  activity({ skillId: 'sleightOfHand', id: 'pickpocket-guard', name: 'Pickpocket a Guard', description: 'Lift a guard’s coin while they look away.', requiredLevel: 20, gold: { min: 6, max: 14 } }),
  activity({ skillId: 'sleightOfHand', id: 'pickpocket-noble', name: 'Pickpocket a Noble', description: 'Lift a noble’s spending money.', requiredLevel: 40, gold: { min: 12, max: 24 } }),
  activity({ skillId: 'sleightOfHand', id: 'pickpocket-royal', name: 'Pickpocket Royalty', description: 'Lift coins from a royal retinue.', requiredLevel: 70, gold: { min: 20, max: 40 } }),
  activity({ skillId: 'sleightOfHand', id: 'lockpick-shop', name: 'Pick a Shopkeep’s Safe', description: 'Open a shop safe for coin and trinkets.', requiredLevel: 1, outputs: [drop('valuables')], gold: { min: 5, max: 12 } }),
  activity({ skillId: 'sleightOfHand', id: 'lockpick-bank', name: 'Pick a Bank Safe', description: 'Open a bank safe.', requiredLevel: 20, outputs: [drop('valuables', 1, 2)], gold: { min: 10, max: 22 } }),
  activity({ skillId: 'sleightOfHand', id: 'lockpick-noble', name: 'Pick a Noble Vault', description: 'Open a noble vault.', requiredLevel: 40, outputs: [drop('valuables', 1, 2)], gold: { min: 18, max: 36 } }),
  activity({ skillId: 'sleightOfHand', id: 'lockpick-royal', name: 'Pick the Royal Treasury', description: 'Open a treasury lock.', requiredLevel: 70, outputs: [drop('valuables', 2, 4)], gold: { min: 30, max: 60 } }),
]
