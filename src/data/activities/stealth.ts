import { activity } from './define'

export const stealthActivities = [
  activity({ skillId: 'stealth', id: 'merchant-warehouse', name: 'Merchant Warehouse', description: 'Slip through a merchant warehouse.', requiredLevel: 1, gold: { min: 4, max: 10 } }),
  activity({ skillId: 'stealth', id: 'guard-barracks', name: 'Guard Barracks', description: 'Slip through a guard barracks.', requiredLevel: 15, gold: { min: 8, max: 16 } }),
  activity({ skillId: 'stealth', id: 'thieves-guild', name: 'Thieves’ Guild', description: 'Slip through the thieves’ guild.', requiredLevel: 30, gold: { min: 12, max: 24 } }),
]
