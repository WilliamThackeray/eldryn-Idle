import { ACCESSORIES } from '../items/accessories'
import { ARMOR } from '../items/armor'
import type { ItemId } from '../items'
import { withCombatGates } from './gates'
import { activity, drop, stack } from './define'
import type { ActivityDef } from './types'

const SETS: Record<string, { material: ItemId; extra?: ItemId }> = {
  leather: { material: 'hide' },
  hide: { material: 'thick-hide' },
  'studded-leather': { material: 'hide', extra: 'iron-bar' },
  croc: { material: 'croc-leather' },
  rothe: { material: 'rothe-hide' },
  dragonhide: { material: 'dragonhide' },
}

const LEVEL: Record<string, number> = {
  'leather-boots': 1,
  'leather-gauntlets': 2,
  'leather-belt': 3,
  'leather-helmet': 4,
  sling: 5,
  'leather-chaps': 6,
  'leather-cloak': 7,
  'leather-chest': 9,
  'minstrel-boots': 14,
  'hide-boots': 15,
  whip: 16,
  'hide-gauntlets': 17,
  'minstrel-gauntlets': 18,
  'hide-helmet': 19,
  'hide-chaps': 20,
  'hide-chest': 23,
  'minstrel-helmet': 21,
  'studded-leather-boots': 22,
  'minstrel-chaps': 24,
  'minstrel-chest': 25,
  'studded-leather-gauntlets': 26,
  'studded-leather-helmet': 28,
  'studded-leather-chaps': 30,
  'studded-leather-chest': 32,
  'croc-boots': 35,
  'croc-gauntlets': 38,
  'croc-helmet': 41,
  'croc-chaps': 44,
  'croc-cloak': 46,
  'croc-chest': 48,
  'rothe-boots': 60,
  'rothe-gauntlets': 63,
  'rothe-helmet': 66,
  'rothe-chaps': 68,
  'rothe-cloak': 70,
  'rothe-chest': 72,
  'dragonhide-boots': 80,
  'dragonhide-gauntlets': 83,
  'dragonhide-helmet': 86,
  'dragonhide-chaps': 89,
  'dragonhide-cloak': 90,
  'dragonhide-chest': 92,
}

function leatherArmor(): ActivityDef[] {
  const recipes: ActivityDef[] = []
  for (const item of ARMOR) {
    const setId = item.id.replace(/-(helmet|chest|chaps|gauntlets|boots)$/, '')
    const spec = SETS[setId]
    if (!spec) continue
    const isChest = item.id.endsWith('-chest')
    const activityId = setId === 'leather' ? item.id : `craft-${item.id}`
    const inputs = [stack(spec.material, isChest ? 2 : 1)]
    if (spec.extra) inputs.push(stack(spec.extra))
    recipes.push(
      activity({
        skillId: 'leatherworking',
        id: activityId,
        name: `Leatherworking ${item.name}`,
        description: `Stitch ${item.name.toLowerCase()}.`,
        requiredLevel: LEVEL[item.id] ?? 1,
        inputs,
        outputs: [drop(item.id as ItemId)],
        category: 'Armor',
        group: item.name.replace(/ (Helmet|Chest|Chaps|Gauntlets|Boots)$/, ''),
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
        requiredLevel: LEVEL[item.id] ?? 1,
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
      requiredLevel: LEVEL[item.id] ?? 1,
      inputs: [stack('animal-scraps', isChest ? 2 : 1)],
      outputs: [drop(item.id as ItemId)],
      category: 'Attire',
      sortOrder: index,
    })
  })
}

function cloak(id: ItemId, name: string, material: ItemId, group: string): ActivityDef {
  return activity({
    skillId: 'leatherworking',
    id: `craft-${id}`,
    name: `Craft ${name}`,
    description: `Stitch a cloak from ${material.split('-').join(' ')}.`,
    requiredLevel: LEVEL[id] ?? 1,
    inputs: [stack(material, 2)],
    outputs: [drop(id)],
    category: 'Armor',
    group,
  })
}

export const leatherworkingActivities: ActivityDef[] = withCombatGates([
  ...leatherArmor(),
  activity({
    skillId: 'leatherworking',
    id: 'craft-whip',
    name: 'Craft Whip',
    description: 'Shape a whip.',
    requiredLevel: LEVEL.whip ?? 16,
    inputs: [stack('hide')],
    outputs: [drop('whip')],
    category: 'Weapons',
  }),
  activity({
    skillId: 'leatherworking',
    id: 'craft-sling',
    name: 'Craft Sling',
    description: 'Shape a sling.',
    requiredLevel: LEVEL.sling ?? 5,
    inputs: [stack('hide')],
    outputs: [drop('sling')],
    category: 'Weapons',
  }),
  cloak('croc-cloak', 'Croc Cloak', 'croc-leather', 'Croc Leather'),
  cloak('rothe-cloak', 'Rothé Cloak', 'rothe-hide', 'Rothé Hide'),
  cloak('dragonhide-cloak', 'Dragonhide Cloak', 'dragonhide', 'Dragonhide'),
  ...minstrelAttire(),
])
