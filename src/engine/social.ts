import { getMonster, MONSTERS, type BiomeId, type CreatureType } from '../data/monsters'
import type { TradeSkillId } from '../data/skills'
import type { ActivePerk } from './abilities'
import {
  BOUNTY_FAVOR,
  BOUNTY_GOLD,
  BOUNTY_KILLS,
  DISGUISE_DURATION_MS,
  FRIGHTEN_CHANCE,
  INTEL_DAMAGE_PCT,
  INTEL_DURATION_MS,
  MENACE_DURATION_MS,
  RUMOR_DURATION_MS,
  RUMOR_RARE_CHANCE,
  TRADE_CONTRACT_DURATION_MS,
  TRADE_CONTRACT_SELL_PCT,
} from './config'
import type { ActiveBuff } from './history'
import { addItems, hasItems, removeItems, type Inventory } from './inventory'
import { rollLoot } from './loot'
import type { Rng } from './rng'
import type { SkillCheckResult } from './skillCheck'

export interface Bounty {
  monsterId: string
  need: number
  have: number
}

export function grantFavor(current: number, gain: number, favorPct: number): number {
  if (!(gain > 0)) return current
  const scaled = favorPct > 0 ? Math.floor(gain * (1 + favorPct)) : gain
  return current + Math.max(0, scaled)
}

export function renownGain(current: number, amount = 1): number {
  return Math.max(0, current + Math.max(0, Math.floor(amount)))
}

export function sellPriceMultiplier(perks: readonly ActivePerk[], buffs: ActiveBuff[] | undefined): number {
  let pct = 0
  for (const perk of perks) {
    if (perk.effect.type === 'sellPricePct') pct += perk.amount
  }
  for (const buff of buffs ?? []) {
    if (buff.effect.type === 'sellPricePct' && buff.remainingMs > 0) pct += buff.effect.value
  }
  return 1 + pct
}

export function shopDiscountTotal(
  perks: readonly ActivePerk[],
  upgrades: Record<string, number>,
  shopDiscountTiers: (upgrades: Record<string, number>) => number,
): number {
  let pct = 0
  for (const perk of perks) {
    if (perk.effect.type === 'shopDiscountPct') pct += perk.amount
  }
  pct += shopDiscountTiers(upgrades)
  return Math.min(1, Math.max(0, pct))
}

export function shopGoldCost(gold: number, discount: number): number {
  const clamped = Math.min(1, Math.max(0, discount))
  return Math.floor(gold * (1 - clamped))
}

function upsertBuff(buffs: ActiveBuff[], next: ActiveBuff): ActiveBuff[] {
  return [...buffs.filter((buff) => buff.id !== next.id), next]
}

export function applyTradeContract(
  inventory: Inventory,
  buffs: ActiveBuff[],
): { inventory: Inventory; activeBuffs: ActiveBuff[] } | null {
  if (!hasItems(inventory, [{ itemId: 'trade-contract', quantity: 1 }])) return null
  return {
    inventory: removeItems(inventory, [{ itemId: 'trade-contract', quantity: 1 }]),
    activeBuffs: upsertBuff(buffs, {
      id: 'trade-contract',
      effect: { type: 'sellPricePct', value: TRADE_CONTRACT_SELL_PCT },
      remainingMs: TRADE_CONTRACT_DURATION_MS,
    }),
  }
}

export function applyDisguiseKit(
  inventory: Inventory,
  buffs: ActiveBuff[],
): { inventory: Inventory; activeBuffs: ActiveBuff[] } | null {
  if (!hasItems(inventory, [{ itemId: 'disguise-kit', quantity: 1 }])) return null
  return {
    inventory: removeItems(inventory, [{ itemId: 'disguise-kit', quantity: 1 }]),
    activeBuffs: upsertBuff(buffs, {
      id: 'disguise-kit',
      effect: { type: 'activityAdvantage', skills: ['thievery'] },
      remainingMs: DISGUISE_DURATION_MS,
    }),
  }
}

export function applyMenaceTrophy(
  inventory: Inventory,
  buffs: ActiveBuff[],
): { inventory: Inventory; activeBuffs: ActiveBuff[] } | null {
  if (!hasItems(inventory, [{ itemId: 'menace-trophy', quantity: 1 }])) return null
  return {
    inventory: removeItems(inventory, [{ itemId: 'menace-trophy', quantity: 1 }]),
    activeBuffs: upsertBuff(buffs, {
      id: 'menace-trophy',
      effect: { type: 'frighten', chance: FRIGHTEN_CHANCE },
      remainingMs: MENACE_DURATION_MS,
    }),
  }
}

export function applyRumor(
  inventory: Inventory,
  buffs: ActiveBuff[],
  biome: BiomeId,
): { inventory: Inventory; activeBuffs: ActiveBuff[] } | null {
  if (!hasItems(inventory, [{ itemId: 'rumor', quantity: 1 }])) return null
  return {
    inventory: removeItems(inventory, [{ itemId: 'rumor', quantity: 1 }]),
    activeBuffs: upsertBuff(buffs, {
      id: 'rumor',
      effect: { type: 'rareSpawn', biome, chance: RUMOR_RARE_CHANCE },
      remainingMs: RUMOR_DURATION_MS,
    }),
  }
}

export function applyIntel(
  inventory: Inventory,
  buffs: ActiveBuff[],
  creatureType: CreatureType,
): { inventory: Inventory; activeBuffs: ActiveBuff[] } | null {
  if (!hasItems(inventory, [{ itemId: 'intel', quantity: 1 }])) return null
  return {
    inventory: removeItems(inventory, [{ itemId: 'intel', quantity: 1 }]),
    activeBuffs: upsertBuff(buffs, {
      id: 'intel',
      effect: { type: 'damageVsType', creatureType, value: INTEL_DAMAGE_PCT },
      remainingMs: INTEL_DURATION_MS,
    }),
  }
}

export function startBounty(
  inventory: Inventory,
  bounty: Bounty | null,
  rng: Rng,
): { inventory: Inventory; bounty: Bounty } | null {
  if (bounty) return null
  if (!hasItems(inventory, [{ itemId: 'bounty-contract', quantity: 1 }])) return null
  const pick = MONSTERS[Math.floor(rng() * MONSTERS.length)]
  if (!pick) return null
  return {
    inventory: removeItems(inventory, [{ itemId: 'bounty-contract', quantity: 1 }]),
    bounty: { monsterId: pick.id, need: BOUNTY_KILLS, have: 0 },
  }
}

export function progressBounty(
  bounty: Bounty | null,
  monsterId: string,
  inventory: Inventory,
  favor: number,
  goldGained: number,
  rng: Rng,
): { bounty: Bounty | null; inventory: Inventory; favor: number; goldGained: number; completed: boolean } {
  if (!bounty || bounty.monsterId !== monsterId) {
    return { bounty, inventory, favor, goldGained, completed: false }
  }
  const have = bounty.have + 1
  if (have < bounty.need) {
    return { bounty: { ...bounty, have }, inventory, favor, goldGained, completed: false }
  }
  const monster = getMonster(bounty.monsterId)
  const loot = monster ? rollLoot(monster.lootTable, rng, 1) : []
  return {
    bounty: null,
    inventory: addItems(inventory, loot),
    favor: favor + BOUNTY_FAVOR,
    goldGained: goldGained + BOUNTY_GOLD,
    completed: true,
  }
}

export function activityHasAdvantage(buffs: ActiveBuff[] | undefined, skillId: TradeSkillId): boolean {
  for (const buff of buffs ?? []) {
    if (buff.effect.type !== 'activityAdvantage' || buff.remainingMs <= 0) continue
    if (buff.effect.skills.includes(skillId)) return true
  }
  return false
}

export function damageVsTypePct(buffs: ActiveBuff[] | undefined, creatureType: CreatureType): number {
  let total = 0
  for (const buff of buffs ?? []) {
    if (buff.effect.type !== 'damageVsType' || buff.remainingMs <= 0) continue
    if (buff.effect.creatureType === creatureType) total += buff.effect.value
  }
  return total
}

export function frightenChance(buffs: ActiveBuff[] | undefined): number {
  for (const buff of buffs ?? []) {
    if (buff.effect.type === 'frighten' && buff.remainingMs > 0) return buff.effect.chance
  }
  return 0
}

export function rareSpawnBuff(
  buffs: ActiveBuff[] | undefined,
  biome: BiomeId,
): { chance: number } | null {
  for (const buff of buffs ?? []) {
    if (buff.effect.type !== 'rareSpawn' || buff.remainingMs <= 0) continue
    if (buff.effect.biome === biome) return { chance: buff.effect.chance }
  }
  return null
}

/** Reroll a failed skill check once when Inspiration is available. */
export function withInspirationReroll(
  inspiration: number,
  first: SkillCheckResult,
  reroll: () => SkillCheckResult,
): { check: SkillCheckResult; spent: number } {
  const pass = first.tier !== 'fail' && first.tier !== 'fumble'
  if (pass || inspiration < 1) return { check: first, spent: 0 }
  return { check: reroll(), spent: 1 }
}
