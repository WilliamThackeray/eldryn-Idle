import { activity, drop } from './define'

export const insightActivities = [
  activity({ skillId: 'insight', id: 'tavern-gossip', name: 'Tavern Gossip', description: 'Listen in the tavern until a lead slips.', requiredLevel: 1, outputs: [drop('rumor')] }),
  activity({ skillId: 'insight', id: 'read-the-market', name: 'Read the Market', description: 'Watch who is buying. Better prices come later.', requiredLevel: 15 }),
  activity({ skillId: 'insight', id: 'interrogation', name: 'Interrogation', description: 'Press a captive until they talk.', requiredLevel: 30, outputs: [drop('rumor')] }),
]
