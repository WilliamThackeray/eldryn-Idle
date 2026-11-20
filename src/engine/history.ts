import {
  BESTIARY_TYPES,
  NOTE_GROUPS,
  parseBestiaryItemId,
  parseNoteItemId,
  parseTomeActivityId,
  parseTomeItemId,
  type BestiaryType,
  type NoteGroupId,
} from '../data/historyContent'
import type { CreatureType } from '../data/monsters'
import type { SkillId } from '../data/skills'
import {
  HISTORY_MAX_XP_PCT,
  HISTORY_NOTE_DURATION_MS,
  HISTORY_NOTE_YIELD_PCT,
  HISTORY_TOME_CHECK_BONUS,
  HISTORY_TOME_SPEED_BONUS,
} from './config'
import { hasItems, removeItems, type Inventory } from './inventory'

export type { BestiaryType, NoteGroupId }

export interface ActiveBuff {
  id: string
  effect: { type: 'noteYield'; groupId: NoteGroupId; value: number }
  remainingMs: number
}

export type Tomes = Partial<Record<SkillId, number>>
export type Bestiaries = Partial<Record<CreatureType, number>>

export function tomeXpPct(tomes: Tomes | undefined, skillId: SkillId): number {
  const volumes = Math.max(0, Math.floor(tomes?.[skillId] ?? 0))
  return Math.min(volumes, HISTORY_MAX_XP_PCT) / 100
}

export function tomeSpeedBonus(tomes: Tomes | undefined, skillId: SkillId): number {
  const volumes = Math.max(0, Math.floor(tomes?.[skillId] ?? 0))
  return volumes >= 5 ? HISTORY_TOME_SPEED_BONUS : 0
}

export function tomeCheckBonus(tomes: Tomes | undefined, skillId: SkillId): number {
  const volumes = Math.max(0, Math.floor(tomes?.[skillId] ?? 0))
  return volumes >= 10 ? HISTORY_TOME_CHECK_BONUS : 0
}

export function bestiaryBonus(bestiaries: Bestiaries | undefined, creatureType: CreatureType): number {
  const volumes = Math.max(0, Math.floor(bestiaries?.[creatureType] ?? 0))
  return Math.min(volumes, 3)
}

export function tomePageCost(basePages: number, pageDiscount: number): number {
  return Math.max(0, basePages - Math.max(0, Math.floor(pageDiscount)))
}

/** Rewrite Ancient Page stacks on a tome craft using the INT R10 discount. */
export function discountTomeInputs(
  activityId: string,
  inputs: readonly { itemId: string; quantity: number }[],
  pageDiscount: number,
): { itemId: string; quantity: number }[] {
  const parsed = parseTomeActivityId(activityId)
  if (!parsed) return inputs.map((stack) => ({ ...stack }))
  return inputs.map((stack) =>
    stack.itemId === 'ancient-page'
      ? { ...stack, quantity: tomePageCost(stack.quantity, pageDiscount) }
      : { ...stack },
  )
}

export function tickBuffs(buffs: ActiveBuff[] | undefined, elapsedMs: number): ActiveBuff[] {
  if (!buffs?.length) return []
  if (!(elapsedMs > 0)) return buffs.map((buff) => ({ ...buff, effect: { ...buff.effect } }))
  return buffs
    .map((buff) => ({
      ...buff,
      effect: { ...buff.effect },
      remainingMs: buff.remainingMs - elapsedMs,
    }))
    .filter((buff) => buff.remainingMs > 0)
}

export function noteYieldPct(buffs: ActiveBuff[] | undefined, activityId: string): number {
  if (!buffs?.length) return 0
  let total = 0
  for (const buff of buffs) {
    if (buff.effect.type !== 'noteYield' || buff.remainingMs <= 0) continue
    const group = NOTE_GROUPS.find((entry) => entry.id === buff.effect.groupId)
    if (!group) continue
    if (activityId.startsWith(group.prefix)) total += buff.effect.value
  }
  return total
}

export function readTome(
  inventory: Inventory,
  tomes: Tomes,
  itemId: string,
): { inventory: Inventory; tomes: Tomes } | null {
  const parsed = parseTomeItemId(itemId)
  if (!parsed) return null
  const current = Math.max(0, Math.floor(tomes[parsed.skillId] ?? 0))
  if (parsed.volume !== current + 1) return null
  if (!hasItems(inventory, [{ itemId, quantity: 1 }])) return null
  return {
    inventory: removeItems(inventory, [{ itemId, quantity: 1 }]),
    tomes: { ...tomes, [parsed.skillId]: parsed.volume },
  }
}

export function readBestiary(
  inventory: Inventory,
  bestiaries: Bestiaries,
  itemId: string,
): { inventory: Inventory; bestiaries: Bestiaries } | null {
  const parsed = parseBestiaryItemId(itemId)
  if (!parsed) return null
  const current = Math.max(0, Math.floor(bestiaries[parsed.type] ?? 0))
  if (parsed.volume !== current + 1) return null
  if (!hasItems(inventory, [{ itemId, quantity: 1 }])) return null
  return {
    inventory: removeItems(inventory, [{ itemId, quantity: 1 }]),
    bestiaries: { ...bestiaries, [parsed.type]: parsed.volume },
  }
}

export function useNotes(
  inventory: Inventory,
  buffs: ActiveBuff[],
  itemId: string,
): { inventory: Inventory; activeBuffs: ActiveBuff[] } | null {
  const groupId = parseNoteItemId(itemId)
  if (!groupId) return null
  if (!hasItems(inventory, [{ itemId, quantity: 1 }])) return null
  const nextBuffs = buffs.filter((buff) => !(buff.effect.type === 'noteYield' && buff.effect.groupId === groupId))
  nextBuffs.push({
    id: `notes-${groupId}`,
    effect: { type: 'noteYield', groupId, value: HISTORY_NOTE_YIELD_PCT },
    remainingMs: HISTORY_NOTE_DURATION_MS,
  })
  return {
    inventory: removeItems(inventory, [{ itemId, quantity: 1 }]),
    activeBuffs: nextBuffs,
  }
}

export function isBestiaryType(value: string): value is BestiaryType {
  return (BESTIARY_TYPES as readonly string[]).includes(value)
}
