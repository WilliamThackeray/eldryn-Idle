import { activity, drop, stack } from './define'
import { fillDisplay } from './display'

const holyWater = [drop('holy-water', 5, 10)]

export const alchemyActivities = fillDisplay(
  [
    activity({
      skillId: 'alchemy',
      id: 'brew-healing',
      name: 'Brew Healing Potion',
      description: 'Brew a healing potion from forest herbs.',
      requiredLevel: 1,
      inputs: [stack('forest-herbs')],
      outputs: [drop('healing-potion')],
    }),
    activity({
      skillId: 'alchemy',
      id: 'brew-greater',
      name: 'Brew Greater Healing Potion',
      description: 'Brew a greater healing potion from desert herbs.',
      requiredLevel: 20,
      inputs: [stack('desert-herbs')],
      outputs: [drop('greater-healing-potion')],
    }),
    activity({
      skillId: 'alchemy',
      id: 'brew-superior',
      name: 'Brew Superior Healing Potion',
      description: 'Brew a superior healing potion from desert herbs and spices.',
      requiredLevel: 45,
      inputs: [stack('desert-herbs'), stack('desert-spices')],
      outputs: [drop('superior-healing-potion')],
    }),
    activity({
      skillId: 'alchemy',
      id: 'brew-supreme',
      name: 'Brew Supreme Healing Potion',
      description: 'Brew a supreme healing potion from fey herbs.',
      requiredLevel: 70,
      inputs: [stack('fey-herbs')],
      outputs: [drop('supreme-healing-potion')],
    }),
    activity({
      skillId: 'alchemy',
      id: 'craft-fireball-reagent',
      name: 'Craft Fireball Reagent',
      description: 'Bind bat guano with sulfur.',
      requiredLevel: 1,
      inputs: [stack('bat-guano'), stack('sulfur')],
      outputs: [drop('fireball-reagent')],
    }),
    activity({
      skillId: 'alchemy',
      id: 'craft-troll-blood-tonic',
      name: 'Craft Troll-blood Tonic',
      description: 'Thicken a healing potion with ghoul ichor.',
      requiredLevel: 1,
      inputs: [stack('healing-potion'), stack('ghoul-ichor')],
      outputs: [drop('troll-blood-tonic')],
    }),
    activity({
      skillId: 'alchemy',
      id: 'craft-warding-chalk',
      name: 'Craft Warding Chalk',
      description: 'Press silver and arcane dust into chalk.',
      requiredLevel: 1,
      inputs: [stack('silver-bar'), stack('arcane-dust')],
      outputs: [drop('warding-chalk')],
    }),
    activity({
      skillId: 'alchemy',
      id: 'village-shrine',
      name: 'Village Shrine',
      description: 'Keep a village shrine. Bless Holy Water.',
      requiredLevel: 1,
      outputs: holyWater,
    }),
    activity({
      skillId: 'alchemy',
      id: 'town-temple',
      name: 'Town Temple',
      description: 'Attend rites at the town temple. Bless Holy Water.',
      requiredLevel: 20,
      outputs: holyWater,
    }),
    activity({
      skillId: 'alchemy',
      id: 'cathedral',
      name: 'Cathedral',
      description: 'Attend rites at the cathedral. Bless Holy Water.',
      requiredLevel: 40,
      outputs: holyWater,
    }),
  ],
  (def, index) => ({
    category: def.id.startsWith('brew-')
      ? 'Potions'
      : def.id.startsWith('craft-')
        ? 'Reagents'
        : 'Holy Water',
    sortOrder: index,
  }),
)
