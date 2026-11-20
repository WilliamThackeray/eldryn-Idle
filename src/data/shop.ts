import { getItem, type ItemId } from './items'
import type { SkillId } from './skills'
import { SKILLS } from './skills'
import { addItems, hasItems, removeItems, type Inventory } from '../engine/inventory'
import { shopGoldCost } from '../engine/social'
import { levelForXp } from '../engine/xp'
import type { ItemStack } from './activities/types'
import type { SkillProgress } from '../types/game'

export type ShopSection = 'general' | SkillId | 'combat' | 'class'

export type UpgradeEffect =
  | { kind: 'inventoryTabs' }
  | { kind: 'interval'; match: 'mine' | 'chop' | 'fish' | 'herb-plot'; pct: number }
  | { kind: 'shopDiscount'; pct: number }
  | { kind: 'soon' }

export interface ShopUpgradeTier {
  cost: { gold: number; items?: ItemStack[]; favor?: number }
  effect: UpgradeEffect
  requires?: { skillId: SkillId; level: number }
}

export interface ShopUpgrade {
  id: string
  section: ShopSection
  name: string
  description: string
  tiers: ShopUpgradeTier[]
}

export interface ShopGood {
  itemId: ItemId
}

/** Cheap commons only. Price is sellValue × 2. */
export const GENERAL_GOODS: readonly ShopGood[] = [
  { itemId: 'cooked-meat' },
  { itemId: 'cooked-forest-fish' },
  { itemId: 'empty-vial' },
  { itemId: 'ink' },
  { itemId: 'bandages' },
]

const toolTiers = (
  gold: [number, number, number],
  items: [ItemStack, ItemStack, ItemStack],
  skillId: SkillId,
  match: 'mine' | 'chop' | 'fish',
): ShopUpgradeTier[] => [
  {
    cost: { gold: gold[0], items: [items[0]] },
    effect: { kind: 'interval', match, pct: 0.05 },
    requires: { skillId, level: 1 },
  },
  {
    cost: { gold: gold[1], items: [items[1]] },
    effect: { kind: 'interval', match, pct: 0.05 },
    requires: { skillId, level: 15 },
  },
  {
    cost: { gold: gold[2], items: [items[2]] },
    effect: { kind: 'interval', match, pct: 0.05 },
    requires: { skillId, level: 30 },
  },
]

const soon = (section: ShopSection, id: string, name: string, description: string): ShopUpgrade => ({
  id,
  section,
  name,
  description,
  tiers: [{ cost: { gold: 0 }, effect: { kind: 'soon' } }],
})

export const SHOP_UPGRADES: readonly ShopUpgrade[] = [
  {
    id: 'inventory-tabs',
    section: 'general',
    name: 'Inventory Tabs',
    description: 'Add another inventory tab.',
    tiers: [
      { cost: { gold: 100 }, effect: { kind: 'inventoryTabs' } },
      { cost: { gold: 250 }, effect: { kind: 'inventoryTabs' } },
      { cost: { gold: 500 }, effect: { kind: 'inventoryTabs' } },
      { cost: { gold: 1000 }, effect: { kind: 'inventoryTabs' } },
      { cost: { gold: 2000 }, effect: { kind: 'inventoryTabs' } },
    ],
  },
  {
    id: 'pickaxe',
    section: 'athletics',
    name: 'Pickaxe',
    description: 'Mining interval −5% per tier.',
    tiers: [
      {
        cost: { gold: 50, items: [{ itemId: 'iron-bar', quantity: 1 }] },
        effect: { kind: 'interval', match: 'mine', pct: 0.05 },
        requires: { skillId: 'athletics', level: 1 },
      },
      {
        cost: { gold: 200, items: [{ itemId: 'iron-bar', quantity: 5 }] },
        effect: { kind: 'interval', match: 'mine', pct: 0.05 },
        requires: { skillId: 'athletics', level: 15 },
      },
      {
        cost: { gold: 800, items: [{ itemId: 'steel-bar', quantity: 5 }], favor: 15 },
        effect: { kind: 'interval', match: 'mine', pct: 0.05 },
        requires: { skillId: 'athletics', level: 30 },
      },
    ],
  },
  soon('athletics', 'bellows', 'Bellows', 'Smithing yield. Coming soon.'),
  {
    id: 'hatchet',
    section: 'survival',
    name: 'Hatchet',
    description: 'Woodcutting interval −5% per tier.',
    tiers: toolTiers(
      [50, 200, 800],
      [
        { itemId: 'logs', quantity: 1 },
        { itemId: 'logs', quantity: 5 },
        { itemId: 'hardwood', quantity: 5 },
      ],
      'survival',
      'chop',
    ),
  },
  {
    id: 'rod',
    section: 'survival',
    name: 'Rod',
    description: 'Fishing interval −5% per tier.',
    tiers: toolTiers(
      [50, 200, 800],
      [
        { itemId: 'logs', quantity: 1 },
        { itemId: 'logs', quantity: 5 },
        { itemId: 'hardwood', quantity: 5 },
      ],
      'survival',
      'fish',
    ),
  },
  {
    id: 'extra-farm-plot',
    section: 'nature',
    name: 'Extra Farm Plot',
    description: 'Halve the herb plot interval (a second plot).',
    tiers: [
      {
        cost: { gold: 100, items: [{ itemId: 'forest-herbs', quantity: 5 }], favor: 8 },
        effect: { kind: 'interval', match: 'herb-plot', pct: 0.5 },
        requires: { skillId: 'nature', level: 1 },
      },
    ],
  },
  soon('sleightOfHand', 'lockpick-set', 'Lockpick Set', 'Lockpicking yield. Coming soon.'),
  soon('arcana', 'scribes-desk', "Scribe's Desk", 'Component crafting yield. Coming soon.'),
  soon('combat', 'auto-eat-threshold', 'Auto-eat Threshold', 'Combat food threshold. Coming soon.'),
  soon('combat', 'second-loadout', 'Second Loadout', 'A second equipment loadout. Coming soon.'),
  {
    id: 'guild-discount',
    section: 'persuasion',
    name: 'Guild Discount',
    description: 'Shop gold prices −5%. Costs Guild Favor.',
    tiers: [
      {
        cost: { gold: 200, favor: 10 },
        effect: { kind: 'shopDiscount', pct: 0.05 },
      },
    ],
  },
  ...SKILLS.filter(
    (skill) =>
      skill.id !== 'athletics' &&
      skill.id !== 'survival' &&
      skill.id !== 'nature' &&
      skill.id !== 'sleightOfHand' &&
      skill.id !== 'arcana' &&
      skill.id !== 'persuasion',
  ).map((skill) =>
    soon(skill.id, `coming-soon-${skill.id}`, 'Coming soon', `${skill.name} upgrades. Coming soon.`),
  ),
]

const UPGRADE_BY_ID = new Map(SHOP_UPGRADES.map((entry) => [entry.id, entry]))

export function getShopUpgrade(id: string): ShopUpgrade | undefined {
  return UPGRADE_BY_ID.get(id)
}

export function upgradesForSection(section: ShopSection): ShopUpgrade[] {
  return SHOP_UPGRADES.filter((entry) => entry.section === section)
}

export function goodPrice(itemId: ItemId, discount = 0): number | null {
  if (!GENERAL_GOODS.some((entry) => entry.itemId === itemId)) return null
  const def = getItem(itemId)
  if (!def) return null
  return shopGoldCost(def.sellValue * 2, discount)
}

export function buyGood(
  inventory: Inventory,
  gold: number,
  itemId: ItemId,
  discount = 0,
): { inventory: Inventory; gold: number } {
  const price = goodPrice(itemId, discount)
  if (price == null || gold < price) return { inventory, gold }
  return {
    inventory: addItems(inventory, [{ itemId, quantity: 1 }]),
    gold: gold - price,
  }
}

export type OwnedUpgrades = Record<string, number>

export function shopDiscountFromUpgrades(upgrades: OwnedUpgrades): number {
  let total = 0
  for (const upgrade of SHOP_UPGRADES) {
    const owned = upgrades[upgrade.id]
    if (owned == null) continue
    for (let i = 0; i <= owned; i++) {
      const effect = upgrade.tiers[i]?.effect
      if (effect?.kind === 'shopDiscount') total += effect.pct
    }
  }
  return total
}

export function buyUpgrade(
  state: {
    gold: number
    favor: number
    inventory: Inventory
    upgrades: OwnedUpgrades
    skills: Record<SkillId, SkillProgress>
  },
  id: string,
  discount = 0,
): { gold: number; favor: number; inventory: Inventory; upgrades: OwnedUpgrades } {
  const upgrade = getShopUpgrade(id)
  if (!upgrade) return state
  const owned = state.upgrades[id]
  const nextIndex = owned == null ? 0 : owned + 1
  const tier = upgrade.tiers[nextIndex]
  if (!tier) return state
  if (tier.effect.kind === 'soon') return state
  if (tier.requires) {
    const xp = state.skills[tier.requires.skillId]?.xp ?? 0
    if (levelForXp(xp) < tier.requires.level) return state
  }
  const goldCost = shopGoldCost(tier.cost.gold, discount)
  const favorCost = tier.cost.favor ?? 0
  if (state.gold < goldCost) return state
  if (state.favor < favorCost) return state
  const items = tier.cost.items ?? []
  if (!hasItems(state.inventory, items)) return state
  return {
    gold: state.gold - goldCost,
    favor: state.favor - favorCost,
    inventory: removeItems(state.inventory, items),
    upgrades: { ...state.upgrades, [id]: nextIndex },
  }
}

export function intervalBonus(upgrades: OwnedUpgrades, activityId: string): number {
  let total = 0
  for (const upgrade of SHOP_UPGRADES) {
    const owned = upgrades[upgrade.id]
    if (owned == null) continue
    for (let i = 0; i <= owned; i++) {
      const effect = upgrade.tiers[i]?.effect
      if (!effect || effect.kind !== 'interval') continue
      const match =
        effect.match === 'herb-plot'
          ? activityId === 'herb-plot'
          : activityId.startsWith(`${effect.match}-`)
      if (match) total += effect.pct
    }
  }
  return total
}

export function ownedTabTiers(upgrades: OwnedUpgrades): number {
  const owned = upgrades['inventory-tabs']
  if (owned == null) return 0
  return owned + 1
}
