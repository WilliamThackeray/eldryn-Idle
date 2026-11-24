import {
  LODGE_ACTIVE_MARKS,
  LODGE_BAIT_MARKS,
  LODGE_BOARD_MARKS,
  LODGE_GEAR_MARKS,
  LODGE_REROLL_MARKS,
  LODGE_SUMMON_MARKS,
  LODGE_TITLE_MARKS,
} from '../engine/config'

export const HUNTER_TITLES = [
  { id: 'the-cull', name: 'the Cull' },
  { id: 'grim-hunter', name: 'Grim Hunter' },
  { id: 'web-walker', name: 'Web-Walker' },
] as const

export type TitleId = (typeof HUNTER_TITLES)[number]['id']

export function getTitle(id: string): { id: string; name: string } | undefined {
  return HUNTER_TITLES.find((title) => title.id === id)
}

/** Weighted bounty reward table. No entry is a recipe input. */
export const BOUNTY_REWARD_TABLE = [
  { weight: 30, kind: 'item' as const, itemId: 'cooked-fowl' as const, qty: 2 },
  { weight: 25, kind: 'item' as const, itemId: 'cooked-fowl' as const, qty: 1 },
  { weight: 20, kind: 'item' as const, itemId: 'greater-healing-potion' as const, qty: 1 },
  { weight: 12, kind: 'bait' as const },
  { weight: 8, kind: 'title' as const, titleId: 'the-cull' as const },
  { weight: 5, kind: 'title' as const, titleId: 'grim-hunter' as const },
  { weight: 3, kind: 'item' as const, itemId: 'hunters-charm' as const, qty: 1 },
]

export const BOUNTY_EPITHETS = [
  'Grimfang',
  'Ashmaw',
  'Briarhide',
  'Mossheart',
  'Cindereye',
  'Hollowcry',
  'Redtusk',
  'Vileclaw',
  'Duskwing',
  'Miretooth',
  'Stonebrow',
  'Palehowl',
] as const

export type LodgeKind = 'bait' | 'reroll' | 'board' | 'active' | 'item' | 'title'

export interface LodgeOffer {
  id: string
  name: string
  detail: string
  marks: number
  renown: number
  kind: LodgeKind
  itemId?: string
  titleId?: string
}

export const LODGE_OFFERS: readonly LodgeOffer[] = [
  { id: 'bait', name: 'Bait', detail: 'The next Bounty offer targets a biome you choose.', marks: LODGE_BAIT_MARKS, renown: 0, kind: 'bait' },
  { id: 'reroll', name: 'Contract Reroll', detail: 'Replace the offers on the board.', marks: LODGE_REROLL_MARKS, renown: 0, kind: 'reroll' },
  { id: 'extra-board', name: '+1 Board Slot', detail: 'The board shows one more offer.', marks: LODGE_BOARD_MARKS, renown: 3, kind: 'board' },
  { id: 'extra-active', name: '+1 Active Contract', detail: 'Hold one more contract at a time.', marks: LODGE_ACTIVE_MARKS, renown: 6, kind: 'active' },
  { id: 'smiths-gauntlets', name: "Smith's Gauntlets", detail: 'Skilling gear for the forge.', marks: LODGE_GEAR_MARKS, renown: 1, kind: 'item', itemId: 'smiths-gauntlets' },
  { id: 'hunters-cloak', name: "Hunter's Cloak", detail: 'Skilling gear for the hunt.', marks: LODGE_GEAR_MARKS, renown: 1, kind: 'item', itemId: 'hunters-cloak' },
  { id: 'bound-wolf', name: 'Wolf Pact', detail: 'A bound wolf for a summon slot.', marks: LODGE_SUMMON_MARKS, renown: 2, kind: 'item', itemId: 'bound-wolf' },
  { id: 'title-cull', name: 'Title: the Cull', detail: 'Shown under your name.', marks: LODGE_TITLE_MARKS, renown: 1, kind: 'title', titleId: 'the-cull' },
  { id: 'title-grim', name: 'Title: Grim Hunter', detail: 'Shown under your name.', marks: LODGE_TITLE_MARKS, renown: 4, kind: 'title', titleId: 'grim-hunter' },
]
