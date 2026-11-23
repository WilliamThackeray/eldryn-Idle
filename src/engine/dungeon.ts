import type { ClassId } from '../data/classes'
import type { DungeonDef, DungeonRoom } from '../data/dungeons'
import type { TradeSkillId } from '../data/skills'
import type { SkillProgress } from '../types/game'
import { checkDc } from './skillCheck'
import {
  checkModifier,
  formatCheck,
  rollCheck,
  toolCheckModifier,
  type CheckModifier,
} from './checks'
import type { RollMode } from './dice'
import { emptyEquipment, gearRollMode, type Equipment } from './equipment'
import { addItems, hasItems, removeItems, type Inventory } from './inventory'
import { rollLoot } from './loot'
import type { Rng } from './rng'
import type { CombatLootGain } from './combat'

export type DungeonNode =
  | { kind: 'monster'; monsterId: string; encounterIndex: number }
  | { kind: 'boss'; monsterId: string }
  | { kind: 'shortRest' }
  | { kind: 'trap'; room: Extract<DungeonRoom, { kind: 'trap' }> }
  | { kind: 'secret'; room: Extract<DungeonRoom, { kind: 'secret' }> }
  | { kind: 'chest' }
  | { kind: 'longRest' }

export interface DungeonCheckContext {
  skills: Record<TradeSkillId, SkillProgress>
  classId: ClassId | null
  classXp: number
  equipment?: Equipment
}

/** Build one loop: encounters with short rests and rooms, then boss, chest, long rest. */
export function buildRunOrder(dungeon: DungeonDef): DungeonNode[] {
  const nodes: DungeonNode[] = []
  const rooms = dungeon.rooms ?? []

  dungeon.encounters.forEach((monsterId, encounterIndex) => {
    nodes.push({ kind: 'monster', monsterId, encounterIndex })
    nodes.push({ kind: 'shortRest' })
    for (const room of rooms.filter((r) => r.after === encounterIndex)) {
      if (room.kind === 'trap') nodes.push({ kind: 'trap', room })
      else nodes.push({ kind: 'secret', room })
    }
  })

  nodes.push({ kind: 'boss', monsterId: dungeon.boss })
  nodes.push({ kind: 'chest' })
  nodes.push({ kind: 'longRest' })
  return nodes
}

export function consumeEntryItem(
  inventory: Inventory,
  dungeon: DungeonDef,
): { ok: true; inventory: Inventory } | { ok: false; inventory: Inventory } {
  if (!dungeon.entry) return { ok: true, inventory }
  if (!hasItems(inventory, [dungeon.entry])) {
    return { ok: false, inventory }
  }
  return {
    ok: true,
    inventory: removeItems(inventory, [dungeon.entry]),
  }
}

function withInspirationRerollCheck(
  inspiration: number,
  first: { success: boolean },
  reroll: () => { success: boolean; roll: number; total: number; dc: number; margin: number },
): {
  check: { success: boolean; roll: number; total: number; dc: number; margin: number }
  spent: number
} {
  if (first.success || inspiration < 1) {
    return { check: first as { success: boolean; roll: number; total: number; dc: number; margin: number }, spent: 0 }
  }
  return { check: reroll(), spent: 1 }
}

function thieveryMode(equipment: Equipment | undefined): RollMode {
  return gearRollMode('thievery', equipment ?? emptyEquipment())
}

export interface TrapResult {
  spotted: boolean
  disarmed: boolean
  damage: number
  line: string
  inspirationSpent: number
}

/** Perception check to spot, then Thievery tool check to disarm. No XP. */
export function resolveTrap(
  room: Extract<DungeonRoom, { kind: 'trap' }>,
  ctx: DungeonCheckContext,
  rng: Rng,
  inspiration = 0,
): TrapResult {
  const dc = checkDc(room.requiredLevel)
  const perception = checkModifier(ctx, 'perception')
  const spot = rollCheck(rng, perception, dc)
  if (!spot.success) {
    return {
      spotted: false,
      disarmed: false,
      damage: room.damage,
      line: `Trap: failed to spot (${formatCheck(perception)}; rolled ${spot.total} vs DC ${dc}). Took ${room.damage} damage.`,
      inspirationSpent: 0,
    }
  }

  const tool = toolCheckModifier(ctx, 'thievery')
  const mode = thieveryMode(ctx.equipment)
  const first = rollCheck(rng, tool, dc, mode)
  const { check, spent } = withInspirationRerollCheck(inspiration, first, () =>
    rollCheck(rng, tool, dc, mode),
  )
  if (check.success) {
    return {
      spotted: true,
      disarmed: true,
      damage: 0,
      line: `Trap: spotted (${formatCheck(perception)}) and disarmed (${formatCheck(tool)}; rolled ${check.total} vs DC ${check.dc}).`,
      inspirationSpent: spent,
    }
  }
  return {
    spotted: true,
    disarmed: false,
    damage: room.damage,
    line: `Trap: spotted (${formatCheck(perception)}) but failed to disarm (${formatCheck(tool)}; rolled ${check.total} vs DC ${check.dc}). Took ${room.damage} damage.`,
    inspirationSpent: spent,
  }
}

export interface SecretResult {
  found: boolean
  loot: { itemId: string; quantity: number }[]
  line: string
  inspirationSpent: number
}

/** Investigation check → bonus chest loot. No XP. */
export function resolveSecret(
  room: Extract<DungeonRoom, { kind: 'secret' }>,
  ctx: DungeonCheckContext,
  rng: Rng,
  inspiration = 0,
): SecretResult {
  const dc = checkDc(room.requiredLevel)
  const investigation = checkModifier(ctx, 'investigation')
  const first = rollCheck(rng, investigation, dc)
  const { check, spent } = withInspirationRerollCheck(inspiration, first, () =>
    rollCheck(rng, investigation, dc),
  )
  if (!check.success) {
    return {
      found: false,
      loot: [],
      line: `Secret door: failed (${formatCheck(investigation)}; rolled ${check.total} vs DC ${check.dc}).`,
      inspirationSpent: spent,
    }
  }
  const loot = rollLoot(room.lootTable, rng, 1)
  return {
    found: true,
    loot,
    line: `Secret door: found (${formatCheck(investigation)}; rolled ${check.total} vs DC ${check.dc}).`,
    inspirationSpent: spent,
  }
}

export interface ChestResult {
  opened: boolean
  loot: { itemId: string; quantity: number }[]
  line: string
  inspirationSpent: number
}

/** Locked chest: Thievery tool check. Failure = no loot. */
export function resolveChest(
  dungeon: DungeonDef,
  ctx: DungeonCheckContext,
  rng: Rng,
  inspiration = 0,
): ChestResult {
  const requiredLevel = dungeon.recommendedTier * 5
  const dc = checkDc(requiredLevel)
  const tool = toolCheckModifier(ctx, 'thievery')
  const mode = thieveryMode(ctx.equipment)
  const first = rollCheck(rng, tool, dc, mode)
  const { check, spent } = withInspirationRerollCheck(inspiration, first, () =>
    rollCheck(rng, tool, dc, mode),
  )
  if (!check.success) {
    return {
      opened: false,
      loot: [],
      line: `Chest: locked (${formatCheck(tool)}; rolled ${check.total} vs DC ${check.dc}).`,
      inspirationSpent: spent,
    }
  }
  const loot = rollLoot(dungeon.chest, rng, 1)
  return {
    opened: true,
    loot,
    line: loot.length
      ? `Chest: opened (${formatCheck(tool)}; rolled ${check.total} vs DC ${check.dc}). ${loot.map((s) => `${s.itemId}×${s.quantity}`).join(', ')}.`
      : `Chest: opened (${formatCheck(tool)}; rolled ${check.total} vs DC ${check.dc}). Empty.`,
    inspirationSpent: spent,
  }
}

export function mergeDungeonLoot(
  existing: CombatLootGain[],
  gained: { itemId: string; quantity: number }[],
): CombatLootGain[] {
  const next = [...existing]
  for (const stack of gained) {
    const found = next.find((entry) => entry.id === stack.itemId)
    if (found) found.quantity += stack.quantity
    else next.push({ id: stack.itemId, name: stack.itemId, quantity: stack.quantity })
  }
  return next
}

export function applyLootToInventory(
  inventory: Inventory,
  loot: { itemId: string; quantity: number }[],
): Inventory {
  return addItems(inventory, loot)
}

/** @internal helper for tests that need a CheckModifier label. */
export type { CheckModifier }
