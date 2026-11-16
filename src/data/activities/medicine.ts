import { activity, drop, stack } from './define'

export const medicineActivities = [
  activity({ skillId: 'medicine', id: 'tend-wounded', name: 'Tend the Wounded', description: 'Patch travelers for a few coins. No herbs required.', requiredLevel: 1, gold: { min: 1, max: 4 } }),
  activity({ skillId: 'medicine', id: 'brew-healing', name: 'Brew Healing Potion', description: 'Brew a healing potion from forest herbs.', requiredLevel: 1, inputs: [stack('forest-herbs')], outputs: [drop('healing-potion')] }),
  activity({ skillId: 'medicine', id: 'brew-greater', name: 'Brew Greater Healing Potion', description: 'Brew a greater healing potion from desert herbs.', requiredLevel: 20, inputs: [stack('desert-herbs')], outputs: [drop('greater-healing-potion')] }),
  activity({ skillId: 'medicine', id: 'brew-superior', name: 'Brew Superior Healing Potion', description: 'Brew a superior healing potion from desert herbs and spices.', requiredLevel: 45, inputs: [stack('desert-herbs'), stack('desert-spices')], outputs: [drop('superior-healing-potion')] }),
  activity({ skillId: 'medicine', id: 'brew-supreme', name: 'Brew Supreme Healing Potion', description: 'Brew a supreme healing potion from fey herbs.', requiredLevel: 70, inputs: [stack('fey-herbs')], outputs: [drop('supreme-healing-potion')] }),
]
