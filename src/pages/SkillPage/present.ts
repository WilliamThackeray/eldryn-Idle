import type { ActivityDef, GoldDrop, LootEntry } from '../../data/activities'
import { parseTomeActivityId } from '../../data/historyContent'
import { getItem } from '../../data/items'
import { obtainedFrom } from '../../data/tiers'
import { discountTomeInputs } from '../../engine/history'
import type { Inventory } from '../../engine/inventory'

export function itemName(id: string): string {
  return getItem(id)?.name ?? id
}

export function craftInputs(activity: ActivityDef, pageDiscount: number) {
  if (!activity.inputs?.length) return []
  if (!parseTomeActivityId(activity.id)) return activity.inputs
  return discountTomeInputs(activity.id, activity.inputs, pageDiscount).filter((stack) => stack.quantity > 0)
}

export function isLocked(activity: ActivityDef, level: number, renown: number): boolean {
  return level < activity.requiredLevel || (activity.renownRequired != null && renown < activity.renownRequired)
}

export function lockLabel(activity: ActivityDef, level: number, renown: number): string | null {
  if (level < activity.requiredLevel) return `Lv ${activity.requiredLevel}`
  if (activity.renownRequired != null && renown < activity.renownRequired) return `Renown ${activity.renownRequired}`
  return null
}

export function formatInterval(ms: number): string {
  const seconds = ms / 1000
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`
  return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`
}

export function formatXp(xp: number): string {
  return Number.isInteger(xp) ? String(xp) : xp.toFixed(1)
}

export function lootNote(entry: LootEntry): string | undefined {
  const parts: string[] = []
  if (entry.min !== 1 || entry.max !== 1) {
    parts.push(entry.min === entry.max ? `x${entry.min}` : `x${entry.min}–${entry.max}`)
  }
  if (entry.chance < 1) parts.push(`${Math.round(entry.chance * 100)}%`)
  return parts.length > 0 ? parts.join(' ') : undefined
}

export function goldNote(gold: GoldDrop): string {
  const amount = gold.min === gold.max ? `${gold.min} gp` : `${gold.min}–${gold.max} gp`
  return gold.chance != null && gold.chance < 1 ? `${amount} (${Math.round(gold.chance * 100)}%)` : amount
}

export function inputChips(activity: ActivityDef, inventory: Inventory, pageDiscount: number) {
  return craftInputs(activity, pageDiscount).map((stack) => {
    const from = obtainedFrom(stack.itemId)
    return {
      name: itemName(stack.itemId),
      owned: inventory[stack.itemId] ?? 0,
      needed: stack.quantity,
      note: from ? `Obtained from: ${from.monster} (${from.biome})` : undefined,
    }
  })
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const

export const KIND_LABEL = { train: 'Train', gather: 'Gather', craft: 'Craft' } as const
