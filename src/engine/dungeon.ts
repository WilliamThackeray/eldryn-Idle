import type { DungeonDef, DungeonRoom } from '../data/dungeons'
import type { SkillId } from '../data/skills'
import type { SkillProgress } from '../types/game'
import { deriveAbilities } from './abilities'
import { checkDc, skillCheck } from './skillCheck'
import { addItems, hasItems, removeItems, type Inventory } from './inventory'
import { rollLoot } from './loot'
import type { Rng } from './rng'
import { levelForXp, proficiency, tier } from './xp'
import type { CombatLootGain } from './combat'

export type DungeonNode =
  | { kind: 'monster'; monsterId: string; encounterIndex: number }
  | { kind: 'boss'; monsterId: string }
  | { kind: 'shortRest' }
  | { kind: 'trap'; room: Extract<DungeonRoom, { kind: 'trap' }> }
  | { kind: 'secret'; room: Extract<DungeonRoom, { kind: 'secret' }> }
  | { kind: 'chest' }
  | { kind: 'longRest' }

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
  if (!dungeon.entryItemId) return { ok: true, inventory }
  if (!hasItems(inventory, [{ itemId: dungeon.entryItemId, quantity: 1 }])) {
    return { ok: false, inventory }
  }
  return {
    ok: true,
    inventory: removeItems(inventory, [{ itemId: dungeon.entryItemId, quantity: 1 }]),
  }
}

function skillLevel(skills: Record<SkillId, SkillProgress>, skillId: SkillId): number {
  return levelForXp(skills[skillId]?.xp ?? 0)
}

function abilityMod(skills: Record<SkillId, SkillProgress>, ability: 'WIS' | 'DEX' | 'INT'): number {
  return deriveAbilities(skills).find((a) => a.abbr === ability)?.modifier ?? 0
}

export interface TrapResult {
  spotted: boolean
  disarmed: boolean
  damage: number
  line: string
}

/** Passive Perception vs DC, then Sleight of Hand to disarm. No XP. */
export function resolveTrap(
  room: Extract<DungeonRoom, { kind: 'trap' }>,
  skills: Record<SkillId, SkillProgress>,
  rng: Rng,
): TrapResult {
  const perceptionLevel = skillLevel(skills, 'perception')
  const passive = 10 + abilityMod(skills, 'WIS') + proficiency(tier(perceptionLevel))
  const dc = checkDc(room.requiredLevel)
  if (passive < dc) {
    return {
      spotted: false,
      disarmed: false,
      damage: room.damage,
      line: `Trap: failed to spot (passive ${passive} vs DC ${dc}). Took ${room.damage} damage.`,
    }
  }

  const check = skillCheck({
    rng,
    abilityModifier: abilityMod(skills, 'DEX'),
    skillLevel: skillLevel(skills, 'sleightOfHand'),
    requiredLevel: room.requiredLevel,
  })
  const pass = check.outcome === 'success' || check.outcome === 'critical'
  if (pass) {
    return {
      spotted: true,
      disarmed: true,
      damage: 0,
      line: `Trap: spotted and disarmed (Sleight ${check.total} vs DC ${check.dc}).`,
    }
  }
  return {
    spotted: true,
    disarmed: false,
    damage: room.damage,
    line: `Trap: spotted but failed to disarm (Sleight ${check.total} vs DC ${check.dc}). Took ${room.damage} damage.`,
  }
}

export interface SecretResult {
  found: boolean
  loot: { itemId: string; quantity: number }[]
  line: string
}

/** Investigation check → bonus chest loot. No XP. */
export function resolveSecret(
  room: Extract<DungeonRoom, { kind: 'secret' }>,
  skills: Record<SkillId, SkillProgress>,
  rng: Rng,
): SecretResult {
  const check = skillCheck({
    rng,
    abilityModifier: abilityMod(skills, 'INT'),
    skillLevel: skillLevel(skills, 'investigation'),
    requiredLevel: room.requiredLevel,
  })
  const pass = check.outcome === 'success' || check.outcome === 'critical'
  if (!pass) {
    return {
      found: false,
      loot: [],
      line: `Secret door: failed Investigation (${check.total} vs DC ${check.dc}).`,
    }
  }
  const loot = rollLoot(room.lootTable, rng, 1)
  return {
    found: true,
    loot,
    line: `Secret door: found (Investigation ${check.total} vs DC ${check.dc}).`,
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
