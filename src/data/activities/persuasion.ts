import { activity } from './define'

export const persuasionActivities = [
  activity({ skillId: 'persuasion', id: 'haggle', name: 'Haggle at Market', description: 'Practice a bargain. Shop discounts come later.', requiredLevel: 1 }),
  activity({ skillId: 'persuasion', id: 'petition-guilds', name: 'Petition the Guilds', description: 'Petition for access. Shop tiers come later.', requiredLevel: 20 }),
  activity({ skillId: 'persuasion', id: 'trade-deals', name: 'Negotiate Trade Deals', description: 'Close a small trade for coin.', requiredLevel: 35, gold: { min: 8, max: 18 } }),
]
