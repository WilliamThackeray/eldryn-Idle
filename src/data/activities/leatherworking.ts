import { ACCESSORIES } from '../items/accessories'
import { ARMOR } from '../items/armor'
import type { ItemId } from '../items'
import { withCombatGates } from './gates'
import { activity, drop, stack } from './define'
import type { ActivityDef } from './types'

const LEATHER_SETS = new Set(['leather', 'hide', 'padded', 'studded-leather'])

function leatherArmor(): ActivityDef[] {
  const recipes: ActivityDef[] = []
  for (const item of ARMOR) {
    const setId = item.id.replace(/-(helmet|chest|chaps|gauntlets|boots)$/, '')
    if (!LEATHER_SETS.has(setId)) continue
    const isChest = item.id.endsWith('-chest')
    const activityId = setId === 'leather' ? item.id : `craft-${item.id}`
    if (setId === 'studded-leather') {
      recipes.push(
        activity({
          skillId: 'leatherworking',
          id: activityId,
          name: `Leatherworking ${item.name}`,
          description: `Stitch ${item.name.toLowerCase()}.`,
          requiredLevel: 1,
          inputs: [stack('hide'), stack('iron-bar')],
          outputs: [drop(item.id as ItemId)],
          category: 'Armor',
          group: 'Studded Leather',
        }),
      )
      continue
    }
    if (setId === 'padded') {
      recipes.push(
        activity({
          skillId: 'leatherworking',
          id: activityId,
          name: `Leatherworking ${item.name}`,
          description: `Stitch ${item.name.toLowerCase()}.`,
          requiredLevel: 1,
          inputs: [stack('animal-scraps', isChest ? 2 : 1)],
          outputs: [drop(item.id as ItemId)],
          category: 'Armor',
          group: 'Padded',
        }),
      )
      continue
    }
    const thick = setId === 'hide'
    recipes.push(
      activity({
        skillId: 'leatherworking',
        id: activityId,
        name: `Leatherworking ${item.name}`,
        description: `Stitch ${item.name.toLowerCase()}.`,
        requiredLevel: thick ? 15 : 1,
        inputs: [stack(thick ? 'thick-hide' : 'hide', (setId === 'leather' || thick) && isChest ? 2 : 1)],
        outputs: [drop(item.id as ItemId)],
        category: 'Armor',
        group: thick ? 'Hide' : 'Leather',
      }),
    )
  }
  for (const item of ACCESSORIES) {
    if (item.id !== 'leather-belt' && item.id !== 'leather-cloak') continue
    recipes.push(
      activity({
        skillId: 'leatherworking',
        id: `craft-${item.id}`,
        name: `Leatherworking ${item.name}`,
        description: `Stitch ${item.name.toLowerCase()}.`,
        requiredLevel: 1,
        inputs: [stack('hide')],
        outputs: [drop(item.id as ItemId)],
        category: 'Armor',
        group: 'Other',
      }),
    )
  }
  return recipes
}

function minstrelAttire(): ActivityDef[] {
  return ARMOR.filter((item) => item.id.startsWith('minstrel-')).map((item, index) => {
    const isChest = item.id.endsWith('-chest')
    return activity({
      skillId: 'leatherworking',
      id: `craft-${item.id}`,
      name: `Craft ${item.name}`,
      description: `Stitch ${item.name.toLowerCase()}.`,
      requiredLevel: 1,
      inputs: [stack('animal-scraps', isChest ? 2 : 1)],
      outputs: [drop(item.id as ItemId)],
      category: 'Attire',
      sortOrder: index,
    })
  })
}

export const leatherworkingActivities: ActivityDef[] = withCombatGates([
  ...leatherArmor(),
  activity({
    skillId: 'leatherworking',
    id: 'craft-whip',
    name: 'Craft Whip',
    description: 'Shape a whip.',
    requiredLevel: 1,
    inputs: [stack('hide')],
    outputs: [drop('whip')],
    category: 'Weapons',
  }),
  activity({
    skillId: 'leatherworking',
    id: 'craft-sling',
    name: 'Craft Sling',
    description: 'Shape a sling.',
    requiredLevel: 1,
    inputs: [stack('hide')],
    outputs: [drop('sling')],
    category: 'Weapons',
  }),
  activity({
    skillId: 'leatherworking',
    id: 'craft-croc-cloak',
    name: 'Craft Croc Cloak',
    description: 'Stitch a cloak from crocodile leather.',
    requiredLevel: 30,
    inputs: [stack('croc-leather', 2)],
    outputs: [drop('croc-cloak')],
    category: 'Armor',
    group: 'Croc Leather',
  }),
  activity({
    skillId: 'leatherworking',
    id: 'craft-rothe-cloak',
    name: 'Craft Rothé Cloak',
    description: 'Stitch a cloak from rothé hide. The herds are not open yet.',
    requiredLevel: 60,
    inputs: [stack('rothe-hide', 2)],
    outputs: [drop('rothe-cloak')],
    category: 'Armor',
    group: 'Rothé Hide',
  }),
  activity({
    skillId: 'leatherworking',
    id: 'craft-dragonhide-cloak',
    name: 'Craft Dragonhide Cloak',
    description: 'Stitch a cloak from dragonhide. The peaks are not open yet.',
    requiredLevel: 80,
    inputs: [stack('dragonhide', 2)],
    outputs: [drop('dragonhide-cloak')],
    category: 'Armor',
    group: 'Dragonhide',
  }),
  ...minstrelAttire(),
])
