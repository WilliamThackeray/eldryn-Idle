import type { SkillId } from '../skills'
import type { ItemId } from '../items'
import type { ActivityDef, GoldDrop, ItemStack, LootEntry } from './types'

const INTERVAL_MS = 6000

function xpFor(requiredLevel: number): number {
  if (requiredLevel >= 70) return 60
  if (requiredLevel >= 40) return 40
  if (requiredLevel >= 20) return 25
  if (requiredLevel >= 10) return 15
  return 10
}

export function stack(itemId: ItemId, quantity = 1): ItemStack {
  return { itemId, quantity }
}

export function drop(itemId: ItemId, min = 1, max = min, chance = 1): LootEntry {
  return { itemId, min, max, chance }
}

interface Spec {
  skillId: SkillId
  id: string
  name: string
  description: string
  requiredLevel: number
  kind?: ActivityDef['kind']
  inputs?: ItemStack[]
  outputs?: LootEntry[]
  rareTable?: LootEntry[]
  byproducts?: LootEntry[]
  gold?: GoldDrop
  favor?: GoldDrop
  renownRequired?: number
  requiresQuest?: string
  baseIntervalMs?: number
}

export function activity(spec: Spec): ActivityDef {
  const outputs = spec.outputs ?? []
  const kind =
    spec.kind ??
    (spec.inputs?.length ? 'craft' : outputs.length > 0 || spec.gold || spec.favor ? 'gather' : 'train')
  const base = xpFor(spec.requiredLevel)
  return {
    id: spec.id,
    skillId: spec.skillId,
    name: spec.name,
    description: spec.description,
    requiredLevel: spec.requiredLevel,
    baseIntervalMs: spec.baseIntervalMs ?? INTERVAL_MS,
    xp: kind === 'craft' ? base + 8 : base,
    inputs: spec.inputs,
    outputs,
    rareTable: spec.rareTable,
    byproducts: spec.byproducts,
    gold: spec.gold,
    favor: spec.favor,
    renownRequired: spec.renownRequired,
    requiresQuest: spec.requiresQuest,
    kind,
  }
}
