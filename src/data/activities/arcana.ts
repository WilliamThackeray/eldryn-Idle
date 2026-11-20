import { ARMOR } from '../items/armor'
import type { ItemId } from '../items'
import { activity, drop, stack } from './define'

function arcaneRobes() {
  return ARMOR.filter((item) => item.id.startsWith('arcane-')).map((item) => {
    const isChest = item.id.endsWith('-chest')
    return activity({
      skillId: 'arcana',
      id: `craft-${item.id}`,
      name: `Craft ${item.name}`,
      description: `Stitch ${item.name.toLowerCase()}.`,
      requiredLevel: 1,
      inputs: [stack('forest-herbs', isChest ? 2 : 1)],
      outputs: [drop(item.id as ItemId)],
    })
  })
}

export const arcanaActivities = [
  activity({
    skillId: 'arcana',
    id: 'read-omens',
    name: 'Read Omens',
    description: 'Study the signs. Components come later.',
    requiredLevel: 1,
  }),
  activity({
    skillId: 'arcana',
    id: 'fire-bolt-drills',
    name: 'Fire Bolt Drills',
    description: 'Practice evocation. Components come later.',
    requiredLevel: 10,
  }),
  activity({
    skillId: 'arcana',
    id: 'scrying-pool',
    name: 'Scrying Pool',
    description: 'Practice divination. Components come later.',
    requiredLevel: 20,
  }),
  activity({
    skillId: 'arcana',
    id: 'craft-arcane-wand',
    name: 'Craft Arcane Wand',
    description: 'Carve a wand for the off hand.',
    requiredLevel: 1,
    inputs: [stack('bones'), stack('forest-herbs')],
    outputs: [drop('arcane-wand')],
  }),
  activity({
    skillId: 'arcana',
    id: 'craft-arcane-staff',
    name: 'Craft Arcane Staff',
    description: 'Carve a staff for the off hand.',
    requiredLevel: 1,
    inputs: [stack('bones'), stack('forest-herbs')],
    outputs: [drop('arcane-staff')],
  }),
  activity({
    skillId: 'arcana',
    id: 'craft-arcane-orb',
    name: 'Craft Arcane Orb',
    description: 'Bind an orb for the off hand.',
    requiredLevel: 1,
    inputs: [stack('bones'), stack('forest-herbs')],
    outputs: [drop('arcane-orb')],
  }),
  ...arcaneRobes(),
  activity({
    skillId: 'arcana',
    id: 'craft-component-basic',
    name: 'Basic Spell Components',
    description: 'Bind herbs, gems, and bones into a Basic component bag.',
    requiredLevel: 1,
    inputs: [stack('forest-herbs'), stack('valuables'), stack('bones')],
    outputs: [drop('component-bag-basic')],
  }),
  activity({
    skillId: 'arcana',
    id: 'craft-component-fine',
    name: 'Fine Spell Components',
    description: 'Bind desert herbs, gems, and bones into a Fine component bag.',
    requiredLevel: 20,
    inputs: [stack('desert-herbs'), stack('valuables'), stack('bones')],
    outputs: [drop('component-bag-fine')],
  }),
  activity({
    skillId: 'arcana',
    id: 'craft-component-rare',
    name: 'Rare Spell Components',
    description: 'Bind desert spices, gems, and bones into a Rare component bag.',
    requiredLevel: 40,
    inputs: [stack('desert-spices'), stack('valuables'), stack('bones')],
    outputs: [drop('component-bag-rare')],
  }),
  activity({
    skillId: 'arcana',
    id: 'craft-component-exotic',
    name: 'Exotic Spell Components',
    description: 'Bind fey herbs, gems, and bones into an Exotic component bag.',
    requiredLevel: 60,
    inputs: [stack('fey-herbs'), stack('valuables'), stack('bones')],
    outputs: [drop('component-bag-exotic')],
  }),
  activity({
    skillId: 'arcana',
    id: 'craft-component-legendary',
    name: 'Legendary Spell Components',
    description: 'Bind rare reagents into a Legendary component bag.',
    requiredLevel: 80,
    inputs: [
      stack('fey-herbs', 2),
      stack('valuables', 2),
      stack('bones', 2),
    ],
    outputs: [drop('component-bag-legendary')],
  }),
]
