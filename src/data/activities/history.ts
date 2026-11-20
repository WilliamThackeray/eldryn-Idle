import { historyCraftActivities } from '../historyContent'
import { activity, drop } from './define'

export const historyActivities = [
  activity({
    skillId: 'history',
    id: 'chronicles',
    name: 'Chronicles of Eldryn',
    description: 'Read the chronicles of the shattered realm.',
    requiredLevel: 1,
    kind: 'train',
    outputs: [drop('ancient-page', 1, 1, 0.15)],
  }),
  activity({
    skillId: 'history',
    id: 'lost-runes',
    name: 'Lost Runes',
    description: 'Study rune fragments. Scrolls come later.',
    requiredLevel: 20,
  }),
  ...historyCraftActivities,
]
