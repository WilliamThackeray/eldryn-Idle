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

const dust = [drop('arcane-dust', 5, 10)]

export const arcanaActivities = [
  activity({
    skillId: 'arcana',
    id: 'read-omens',
    name: 'Read Omens',
    description: 'Study the signs. Gather Arcane Dust.',
    requiredLevel: 1,
    outputs: dust,
  }),
  activity({
    skillId: 'arcana',
    id: 'fire-bolt-drills',
    name: 'Fire Bolt Drills',
    description: 'Practice evocation. Gather Arcane Dust.',
    requiredLevel: 10,
    outputs: dust,
  }),
  activity({
    skillId: 'arcana',
    id: 'scrying-pool',
    name: 'Scrying Pool',
    description: 'Practice divination. Gather Arcane Dust.',
    requiredLevel: 20,
    outputs: dust,
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
    id: 'craft-fireball-reagent',
    name: 'Craft Fireball Reagent',
    description: 'Bind bat guano with sulfur.',
    requiredLevel: 1,
    inputs: [stack('bat-guano'), stack('sulfur')],
    outputs: [drop('fireball-reagent')],
  }),
  activity({
    skillId: 'arcana',
    id: 'craft-troll-blood-tonic',
    name: 'Craft Troll-blood Tonic',
    description: 'Thicken a healing potion with ghoul ichor.',
    requiredLevel: 1,
    inputs: [stack('healing-potion'), stack('ghoul-ichor')],
    outputs: [drop('troll-blood-tonic')],
  }),
  activity({
    skillId: 'arcana',
    id: 'craft-warding-chalk',
    name: 'Craft Warding Chalk',
    description: 'Press silver and arcane dust into chalk.',
    requiredLevel: 1,
    inputs: [stack('silver-bar'), stack('arcane-dust')],
    outputs: [drop('warding-chalk')],
  }),
]
