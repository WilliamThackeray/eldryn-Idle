import { ACCESSORIES } from '../items/accessories'
import { ARMOR } from '../items/armor'
import type { ItemId } from '../items'
import { activity, drop, stack } from './define'
import type { ActivityDef } from './types'

const LEATHER_SETS = new Set(['leather', 'hide', 'padded', 'studded-leather'])

function leatherAndCloth(): ActivityDef[] {
  const recipes: ActivityDef[] = []
  for (const item of ARMOR) {
    const setId = item.id.replace(/-(helmet|chest|chaps|gauntlets|boots)$/, '')
    if (!LEATHER_SETS.has(setId)) continue
    const isChest = item.id.endsWith('-chest')
    const activityId = setId === 'leather' ? item.id : `craft-${item.id}`
    if (setId === 'studded-leather') {
      recipes.push(
        activity({
          skillId: 'survival',
          id: activityId,
          name: `Leatherworking ${item.name}`,
          description: `Stitch ${item.name.toLowerCase()}.`,
          requiredLevel: 1,
          inputs: [stack('hide'), stack('iron-bar')],
          outputs: [drop(item.id as ItemId)],
        }),
      )
      continue
    }
    if (setId === 'padded') {
      recipes.push(
        activity({
          skillId: 'survival',
          id: activityId,
          name: `Leatherworking ${item.name}`,
          description: `Stitch ${item.name.toLowerCase()}.`,
          requiredLevel: 1,
          inputs: [stack('animal-scraps', isChest ? 2 : 1)],
          outputs: [drop(item.id as ItemId)],
        }),
      )
      continue
    }
    recipes.push(
      activity({
        skillId: 'survival',
        id: activityId,
        name: `Leatherworking ${item.name}`,
        description: `Stitch ${item.name.toLowerCase()}.`,
        requiredLevel: 1,
        inputs: [stack('hide', isChest ? 2 : 1)],
        outputs: [drop(item.id as ItemId)],
      }),
    )
  }
  for (const item of ACCESSORIES) {
    if (item.id !== 'leather-belt' && item.id !== 'leather-cloak') continue
    recipes.push(
      activity({
        skillId: 'survival',
        id: `craft-${item.id}`,
        name: `Leatherworking ${item.name}`,
        description: `Stitch ${item.name.toLowerCase()}.`,
        requiredLevel: 1,
        inputs: [stack('hide')],
        outputs: [drop(item.id as ItemId)],
      }),
    )
  }
  return recipes
}

function woodGear(): ActivityDef[] {
  const specs: { id: ItemId; name: string; inputs: ReturnType<typeof stack>[]; level?: number }[] = [
    { id: 'club', name: 'Club', inputs: [stack('logs')] },
    { id: 'greatclub', name: 'Greatclub', inputs: [stack('logs')] },
    { id: 'quarterstaff', name: 'Quarterstaff', inputs: [stack('logs', 2)] },
    { id: 'whip', name: 'Whip', inputs: [stack('hide')] },
    { id: 'sling', name: 'Sling', inputs: [stack('hide')] },
  ]
  return specs.map((spec) =>
    activity({
      skillId: 'survival',
      id: `craft-${spec.id}`,
      name: `Craft ${spec.name}`,
      description: `Shape ${spec.name.toLowerCase()}.`,
      requiredLevel: spec.level ?? 1,
      inputs: spec.inputs,
      outputs: [drop(spec.id)],
    }),
  )
}

export const survivalActivities = [
  activity({ skillId: 'survival', id: 'chop-wood', name: 'Chop Wood', description: 'Fell ordinary trees for timber.', requiredLevel: 1, outputs: [drop('logs'), drop('oak-bark', 1, 1, 0.25)] }),
  activity({ skillId: 'survival', id: 'chop-hardwood', name: 'Chop Hardwood', description: 'Fell dense trees for bows and hafts.', requiredLevel: 20, outputs: [drop('hardwood'), drop('oak-bark', 1, 1, 0.25)] }),
  activity({ skillId: 'survival', id: 'chop-ironwood', name: 'Chop Ironwood', description: 'Fell ironwood.', requiredLevel: 50, outputs: [drop('ironwood'), drop('oak-bark', 1, 1, 0.25)] }),
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
  // shortcut: only iron arrowheads are fletched, add tiered ammo when ammo has a material.
  activity({
    skillId: 'survival',
    id: 'fletch-arrows',
    name: 'Fletch Arrows',
    description: 'Cut and fletch a bundle of arrows.',
    requiredLevel: 1,
    inputs: [stack('logs'), stack('iron-arrowhead')],
    outputs: [drop('arrows', 20)],
  }),
  activity({
    skillId: 'survival',
    id: 'fletch-bolts',
    name: 'Fletch Bolts',
    description: 'Cut and fletch a bundle of bolts.',
    requiredLevel: 1,
    inputs: [stack('logs'), stack('iron-arrowhead')],
    outputs: [drop('bolts', 20)],
  }),
  activity({
    skillId: 'survival',
    id: 'craft-sling-bullets',
    name: 'Craft Sling Bullets',
    description: 'Pack scrap into sling bullets.',
    requiredLevel: 1,
    inputs: [stack('animal-scraps')],
    outputs: [drop('sling-bullets', 20)],
  }),
  activity({ skillId: 'survival', id: 'fletch-shortbow', name: 'Fletch Shortbow', description: 'Shape hardwood into a shortbow.', requiredLevel: 20, inputs: [stack('hardwood', 2)], outputs: [drop('shortbow')] }),
  activity({ skillId: 'survival', id: 'fletch-longbow', name: 'Fletch Longbow', description: 'Shape hardwood into a longbow.', requiredLevel: 30, inputs: [stack('hardwood', 3)], outputs: [drop('longbow')] }),
  activity({
    skillId: 'survival',
    id: 'fletch-light-crossbow',
    name: 'Fletch Light Crossbow',
    description: 'Assemble a light crossbow.',
    requiredLevel: 20,
    inputs: [stack('hardwood', 2), stack('iron-bar')],
    outputs: [drop('light-crossbow')],
  }),
  activity({
    skillId: 'survival',
    id: 'fletch-hand-crossbow',
    name: 'Fletch Hand Crossbow',
    description: 'Assemble a hand crossbow.',
    requiredLevel: 40,
    inputs: [stack('ironwood'), stack('iron-bar')],
    outputs: [drop('hand-crossbow')],
  }),
  activity({
    skillId: 'survival',
    id: 'fletch-heavy-crossbow',
    name: 'Fletch Heavy Crossbow',
    description: 'Assemble a heavy crossbow.',
    requiredLevel: 50,
    inputs: [stack('ironwood', 2), stack('iron-bar')],
    outputs: [drop('heavy-crossbow')],
  }),
  ...woodGear(),
  ...leatherAndCloth(),
]
