import { activity, drop, stack } from './define'

export const survivalActivities = [
  activity({ skillId: 'survival', id: 'chop-wood', name: 'Chop Wood', description: 'Fell ordinary trees for timber.', requiredLevel: 1, outputs: [drop('logs')] }),
  activity({ skillId: 'survival', id: 'chop-hardwood', name: 'Chop Hardwood', description: 'Fell dense trees for bows and hafts.', requiredLevel: 20, outputs: [drop('hardwood')] }),
  activity({ skillId: 'survival', id: 'chop-ironwood', name: 'Chop Ironwood', description: 'Fell ironwood.', requiredLevel: 50, outputs: [drop('ironwood')] }),
  activity({ skillId: 'survival', id: 'forage-forest', name: 'Forage Forest Herbs', description: 'Gather herbs on the forest floor.', requiredLevel: 1, outputs: [drop('forest-herbs')] }),
  activity({ skillId: 'survival', id: 'forage-desert', name: 'Forage Desert Herbs', description: 'Gather bitter plants from dry ground.', requiredLevel: 20, outputs: [drop('desert-herbs')] }),
  activity({ skillId: 'survival', id: 'forage-spices', name: 'Forage Desert Spices', description: 'Gather spices in the waste.', requiredLevel: 40, outputs: [drop('desert-spices')] }),
  activity({ skillId: 'survival', id: 'forage-fey', name: 'Forage Fey Herbs', description: 'Gather herbs where the Feywild leaks through.', requiredLevel: 70, outputs: [drop('fey-herbs')] }),
  activity({ skillId: 'survival', id: 'fish-forest', name: 'Forest Fishing', description: 'Fish a forest stream.', requiredLevel: 1, outputs: [drop('raw-forest-fish')] }),
  activity({ skillId: 'survival', id: 'fish-desert', name: 'Oasis Fishing', description: 'Fish a desert oasis.', requiredLevel: 20, outputs: [drop('raw-desert-fish')] }),
  activity({ skillId: 'survival', id: 'fish-coastal', name: 'Coastal Fishing', description: 'Fish the coast.', requiredLevel: 40, outputs: [drop('raw-coastal-fish')] }),
  activity({ skillId: 'survival', id: 'butcher-small', name: 'Butcher Small Animal', description: 'Break a small catch into meat, hide, and bones.', requiredLevel: 1, inputs: [stack('small-animal')], outputs: [drop('raw-meat'), drop('hide'), drop('bones')] }),
  activity({ skillId: 'survival', id: 'butcher-fowl', name: 'Butcher Air Fowl', description: 'Break a bird into meat and bones.', requiredLevel: 20, inputs: [stack('air-fowl')], outputs: [drop('raw-fowl'), drop('bones')] }),
  activity({ skillId: 'survival', id: 'butcher-medium', name: 'Butcher Medium Animal', description: 'Break a medium catch into meat, hide, and bones.', requiredLevel: 30, inputs: [stack('medium-animal')], outputs: [drop('raw-meat', 2), drop('hide'), drop('bones', 2)] }),
  activity({ skillId: 'survival', id: 'butcher-large', name: 'Butcher Large Animal', description: 'Break a large catch into meat, hide, and bones.', requiredLevel: 50, inputs: [stack('large-animal')], outputs: [drop('raw-meat', 3), drop('hide', 2), drop('bones', 3)] }),
]
