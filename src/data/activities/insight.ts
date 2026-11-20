import { activity, drop } from './define'

export const insightActivities = [
  activity({
    skillId: 'insight',
    id: 'tavern-gossip',
    name: 'Tavern Gossip',
    description: 'Listen in the tavern until a lead slips.',
    requiredLevel: 1,
    outputs: [drop('rumor')],
  }),
  activity({
    skillId: 'insight',
    id: 'read-the-market',
    name: 'Read the Market',
    description: 'Watch who is buying. Gather Intel and Rumors.',
    requiredLevel: 15,
    outputs: [drop('intel', 1, 1, 0.4), drop('rumor', 1, 1, 0.25)],
  }),
  activity({
    skillId: 'insight',
    id: 'interrogation',
    name: 'Interrogation',
    description: 'Press a captive until they talk.',
    requiredLevel: 30,
    outputs: [drop('rumor'), drop('intel', 1, 1, 0.45)],
  }),
]
