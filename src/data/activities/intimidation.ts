import { activity, drop } from './define'

export const intimidationActivities = [
  activity({
    skillId: 'intimidation',
    id: 'tavern-bouncer',
    name: 'Tavern Bouncer',
    description: 'Keep the door and take a cut.',
    requiredLevel: 1,
    outputs: [drop('menace-token')],
    gold: { min: 2, max: 5 },
  }),
  activity({ skillId: 'intimidation', id: 'debt-collection', name: 'Debt Collection', description: 'Collect a debt that someone hoped you’d forget.', requiredLevel: 15, gold: { min: 5, max: 12 } }),
  activity({ skillId: 'intimidation', id: 'shake-down', name: 'Shake Down Smugglers', description: 'Lean on a smuggler for coin.', requiredLevel: 30, gold: { min: 8, max: 18 } }),
]
