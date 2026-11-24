import { withCombatGates } from './gates'
import { activity, drop, stack } from './define'
import type { ActivityDef } from './types'
import type { ItemId } from '../items'

const CASTER_PIECES = [
  { slot: 'helmet', label: 'Hood' },
  { slot: 'chest', label: 'Robe' },
  { slot: 'chaps', label: 'Trousers' },
  { slot: 'gauntlets', label: 'Gloves' },
  { slot: 'boots', label: 'Slippers' },
] as const

function clothSet(
  prefix: string,
  cloth: ItemId,
  requiredLevel: number,
  verb: string,
): ActivityDef[] {
  return CASTER_PIECES.map((piece, index) => {
    const id = `${prefix}-${piece.slot}` as ItemId
    const isChest = piece.slot === 'chest'
    return activity({
      skillId: 'weaving',
      id: `craft-${id}`,
      name: `Craft ${prefix.charAt(0).toUpperCase()}${prefix.slice(1)} ${piece.label}`,
      description: `${verb} a ${prefix} ${piece.label.toLowerCase()}.`,
      requiredLevel,
      inputs: [stack(cloth, isChest ? 2 : 1)],
      outputs: [drop(id)],
      category: 'Tailoring',
      group: prefix.charAt(0).toUpperCase() + prefix.slice(1),
      sortOrder: index,
    })
  })
}

function attire(
  prefix: string,
  cloth: ItemId,
  requiredLevel: number,
  verb: string,
  labels: Record<string, string>,
): ActivityDef[] {
  return (['helmet', 'chest', 'chaps', 'gauntlets', 'boots'] as const).map((slot, index) => {
    const id = `${prefix}-${slot}` as ItemId
    const label = labels[slot] ?? slot
    const isChest = slot === 'chest'
    return activity({
      skillId: 'weaving',
      id: `craft-${id}`,
      name: `Craft ${prefix.charAt(0).toUpperCase()}${prefix.slice(1)} ${label}`,
      description: `${verb} ${label.toLowerCase()}.`,
      requiredLevel,
      inputs: [stack(cloth, isChest ? 2 : 1)],
      outputs: [drop(id)],
      category: 'Tailoring',
      group: prefix.charAt(0).toUpperCase() + prefix.slice(1),
      sortOrder: 100 + index,
    })
  })
}

export const weavingActivities: ActivityDef[] = withCombatGates([
  activity({
    skillId: 'weaving',
    id: 'spin-flax',
    name: 'Spin Flax',
    description: 'Spin flax into linen thread.',
    requiredLevel: 1,
    inputs: [stack('flax')],
    outputs: [drop('linen-thread')],
    category: 'Spinning',
  }),
  activity({
    skillId: 'weaving',
    id: 'spin-wool',
    name: 'Spin Wool',
    description: 'Spin wool into yarn.',
    requiredLevel: 20,
    inputs: [stack('wool')],
    outputs: [drop('wool-yarn')],
    category: 'Spinning',
  }),
  activity({
    skillId: 'weaving',
    id: 'spin-silk',
    name: 'Spin Silk',
    description: 'Spin spider silk into thread.',
    requiredLevel: 40,
    inputs: [stack('spider-silk')],
    outputs: [drop('silk-thread')],
    category: 'Spinning',
  }),
  activity({
    skillId: 'weaving',
    id: 'loom-linen',
    name: 'Weave Linen Cloth',
    description: 'Loom linen thread into cloth.',
    requiredLevel: 10,
    inputs: [stack('linen-thread', 2)],
    outputs: [drop('linen-cloth')],
    category: 'Loom',
  }),
  activity({
    skillId: 'weaving',
    id: 'loom-wool',
    name: 'Weave Wool Cloth',
    description: 'Loom wool yarn into cloth.',
    requiredLevel: 30,
    inputs: [stack('wool-yarn', 2)],
    outputs: [drop('wool-cloth')],
    category: 'Loom',
  }),
  activity({
    skillId: 'weaving',
    id: 'loom-silk',
    name: 'Weave Silk Cloth',
    description: 'Loom silk thread into cloth.',
    requiredLevel: 50,
    inputs: [stack('silk-thread', 2)],
    outputs: [drop('silk-cloth')],
    category: 'Loom',
  }),
  ...clothSet('linen', 'linen-cloth', 10, 'Tailor'),
  ...clothSet('wool', 'wool-cloth', 40, 'Tailor'),
  ...clothSet('silk', 'silk-cloth', 70, 'Tailor'),
  activity({
    skillId: 'weaving',
    id: 'gather-shadowsilk',
    name: 'Gather Shadowsilk',
    description: 'Collect shadowsilk. The Underdark looms are not open yet.',
    requiredLevel: 60,
    outputs: [drop('shadowsilk')],
    category: 'Spinning',
  }),
  activity({
    skillId: 'weaving',
    id: 'gather-starweave',
    name: 'Gather Starweave',
    description: 'Collect starweave. The peaks are not open yet.',
    requiredLevel: 80,
    outputs: [drop('starweave')],
    category: 'Spinning',
  }),
  ...clothSet('shadowsilk', 'shadowsilk', 60, 'Tailor'),
  ...clothSet('starweave', 'starweave', 80, 'Tailor'),
  ...attire('wildweave', 'linen-cloth', 20, 'Weave', {
    helmet: 'Hood',
    chest: 'Wrap',
    chaps: 'Leggings',
    gauntlets: 'Gloves',
    boots: 'Boots',
  }),
  ...attire('arcane', 'wool-cloth', 50, 'Stitch', {
    helmet: 'Hood',
    chest: 'Robe',
    chaps: 'Trousers',
    gauntlets: 'Gloves',
    boots: 'Slippers',
  }),
  ...attire('vestment', 'silk-cloth', 90, 'Stitch', {
    helmet: 'Cowl',
    chest: 'Robe',
    chaps: 'Leggings',
    gauntlets: 'Gloves',
    boots: 'Sandals',
  }),
])
