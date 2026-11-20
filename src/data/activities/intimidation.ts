import { activity, drop } from './define'

export const intimidationActivities = [
  activity({
    skillId: 'intimidation',
    id: 'tavern-bouncer',
    name: 'Tavern Bouncer',
    description: 'Keep the door and take a cut.',
    requiredLevel: 1,
    outputs: [
      drop('menace-token'),
      drop('bounty-contract', 1, 1, 0.3),
      drop('menace-trophy', 1, 1, 0.15),
    ],
    gold: { min: 1, max: 3 },
  }),
  activity({
    skillId: 'intimidation',
    id: 'debt-collection',
    name: 'Debt Collection',
    description: 'Collect a debt that someone hoped you’d forget.',
    requiredLevel: 15,
    gold: { min: 3, max: 6 },
    outputs: [drop('bounty-contract', 1, 1, 0.4)],
  }),
  activity({
    skillId: 'intimidation',
    id: 'shake-down',
    name: 'Shake Down Smugglers',
    description: 'Lean on a smuggler for coin.',
    requiredLevel: 30,
    gold: { min: 4, max: 9 },
    outputs: [drop('bounty-contract', 1, 1, 0.35), drop('menace-trophy', 1, 1, 0.25)],
  }),
]
