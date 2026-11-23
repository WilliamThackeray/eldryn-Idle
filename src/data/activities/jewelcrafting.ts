import { activity, drop, stack } from './define'

export const jewelcraftingActivities = [
  activity({
    skillId: 'jewelcrafting',
    id: 'craft-ring',
    name: 'Craft Ring',
    description: 'Set a gem in a plain band.',
    requiredLevel: 10,
    inputs: [stack('gem')],
    outputs: [drop('ring')],
    category: 'Jewelry',
  }),
  activity({
    skillId: 'jewelcrafting',
    id: 'craft-necklace',
    name: 'Craft Necklace',
    description: 'Set a gem on a cord.',
    requiredLevel: 10,
    inputs: [stack('gem')],
    outputs: [drop('necklace')],
    category: 'Jewelry',
  }),
  activity({
    skillId: 'jewelcrafting',
    id: 'appraisal',
    name: 'Appraisal',
    description: 'Appraise a curio for coin. Magic identification comes later.',
    requiredLevel: 20,
    gold: { min: 6, max: 14 },
    category: 'Appraisal',
  }),
  activity({
    skillId: 'jewelcrafting',
    id: 'craft-arcane-orb',
    name: 'Craft Arcane Orb',
    description: 'Bind an orb for the off hand.',
    requiredLevel: 1,
    inputs: [stack('bones'), stack('forest-herbs')],
    outputs: [drop('arcane-orb')],
    category: 'Focuses',
  }),
]
