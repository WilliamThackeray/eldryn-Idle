import { activity, drop } from './define'

export const woodcuttingActivities = [
  activity({
    skillId: 'woodcutting',
    id: 'chop-wood',
    name: 'Chop Wood',
    description: 'Fell ordinary trees for timber.',
    requiredLevel: 1,
    outputs: [drop('logs'), drop('oak-bark', 1, 1, 0.25)],
    category: 'Woodcutting',
  }),
  activity({
    skillId: 'woodcutting',
    id: 'chop-hardwood',
    name: 'Chop Hardwood',
    description: 'Fell dense trees for bows and hafts.',
    requiredLevel: 20,
    outputs: [drop('hardwood'), drop('oak-bark', 1, 1, 0.25)],
    category: 'Woodcutting',
  }),
  activity({
    skillId: 'woodcutting',
    id: 'chop-ironwood',
    name: 'Chop Ironwood',
    description: 'Fell ironwood.',
    requiredLevel: 50,
    outputs: [drop('ironwood'), drop('oak-bark', 1, 1, 0.25)],
    category: 'Woodcutting',
  }),
]
