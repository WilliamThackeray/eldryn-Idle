import { scribingCraftActivities } from '../historyContent'
import { scrollActivities } from './scrolls'
import { activity, drop, stack } from './define'
import { fillDisplay } from './display'

export const scribingActivities = fillDisplay(
  [
    activity({
      skillId: 'scribing',
      id: 'chronicles',
      name: 'Chronicles of Eldryn',
      description: 'Read the chronicles of the shattered realm.',
      requiredLevel: 1,
      kind: 'train',
      outputs: [drop('ancient-page', 1, 1, 0.15)],
    }),
    activity({
      skillId: 'scribing',
      id: 'lost-runes',
      name: 'Lost Runes',
      description: 'Study rune fragments.',
      requiredLevel: 20,
    }),
    activity({
      skillId: 'scribing',
      id: 'craft-ink',
      name: 'Craft Ink',
      description: 'Boil herbs with coal into black ink.',
      requiredLevel: 1,
      inputs: [stack('forest-herbs'), stack('coal')],
      outputs: [drop('ink')],
    }),
    activity({
      skillId: 'scribing',
      id: 'craft-parchment',
      name: 'Craft Parchment',
      description: 'Scrape a hide into a writing sheet.',
      requiredLevel: 1,
      inputs: [stack('hide')],
      outputs: [drop('parchment')],
    }),
    activity({
      skillId: 'scribing',
      id: 'craft-blessed-parchment',
      name: 'Craft Blessed Parchment',
      description: 'Ink holy text onto parchment.',
      requiredLevel: 1,
      inputs: [stack('ink')],
      outputs: [drop('blessed-parchment')],
    }),
    activity({
      skillId: 'scribing',
      id: 'interrogation',
      name: 'Interrogation',
      description: 'Press a captive until they talk.',
      requiredLevel: 30,
      outputs: [drop('rumor'), drop('intel', 1, 1, 0.45)],
    }),
    ...scribingCraftActivities,
    ...scrollActivities,
  ],
  (def, index) => {
    if (def.category) return { category: def.category, group: def.group, sortOrder: def.sortOrder ?? index }
    if (def.id === 'chronicles' || def.id === 'lost-runes') return { category: 'Lore', sortOrder: index }
    if (def.id === 'craft-ink' || def.id === 'craft-parchment' || def.id === 'craft-blessed-parchment') {
      return { category: 'Ink', sortOrder: index }
    }
    if (def.id === 'interrogation') return { category: 'Field Notes', sortOrder: index }
    return { category: 'Lore', sortOrder: index }
  },
)
