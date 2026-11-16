import { activity } from './define'

export const historyActivities = [
  activity({ skillId: 'history', id: 'chronicles', name: 'Chronicles of Eldryn', description: 'Read the chronicles of the shattered realm.', requiredLevel: 1 }),
  activity({ skillId: 'history', id: 'bestiary', name: 'Study a Bestiary', description: 'Read notes on a creature type.', requiredLevel: 10 }),
  activity({ skillId: 'history', id: 'lost-runes', name: 'Lost Runes', description: 'Study rune fragments. Scrolls come later.', requiredLevel: 20 }),
]
