import { activity, drop } from './define'

const dust = [drop('arcane-dust', 5, 10)]

export const enchantingActivities = [
  activity({
    skillId: 'enchanting',
    id: 'read-omens',
    name: 'Read Omens',
    description: 'Study the signs. Gather Arcane Dust.',
    requiredLevel: 1,
    outputs: dust,
    category: 'Arcane Study',
  }),
  activity({
    skillId: 'enchanting',
    id: 'scrying-pool',
    name: 'Scrying Pool',
    description: 'Practice divination. Gather Arcane Dust.',
    requiredLevel: 20,
    outputs: dust,
    category: 'Arcane Study',
  }),
]
