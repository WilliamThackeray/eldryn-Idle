import { getClass, type ClassId, type ClericFocus } from '../data/classes'
import type { ItemStack } from '../data/activities/types'
import type { AbilityAbbr, SkillProgress } from '../types/game'
import type { SkillId } from '../data/skills'
import {
  ECHO_XP_PCT,
  MAX_SECONDARY_CLASSES,
  MULTICLASS_GOLD,
  MULTICLASS_ITEMS,
  MULTICLASS_RANK_REQ,
  MULTICLASS_XP_MOD_MIN,
  MULTICLASS_XP_SHARE,
  REBIRTH_COST_MULT,
  REBIRTH_GOLD,
  REBIRTH_ITEMS,
  SECONDARY_SIGNATURE_LEVEL,
} from './config'
import { deriveAbilities } from './abilities'
import { hasItems, removeItems, type Inventory } from './inventory'
import { shopGoldCost } from './social'
import { addXp, levelForXp } from './xp'

/** Abilities the target class boosts by ≥ MULTICLASS_XP_MOD_MIN (from xpModifiers only). */
export function multiclassRequirements(classId: ClassId): AbilityAbbr[] {
  const mods = getClass(classId).xpModifiers
  return (Object.keys(mods) as AbilityAbbr[]).filter(
    (abbr) => (mods[abbr] ?? 0) >= MULTICLASS_XP_MOD_MIN,
  )
}

export interface MulticlassGap {
  ability: AbilityAbbr
  need: number
  have: number
}

export function multiclassGaps(
  classId: ClassId,
  skills: Record<SkillId, SkillProgress>,
): MulticlassGap[] {
  const ranks = Object.fromEntries(
    deriveAbilities(skills).map((ability) => [ability.abbr, ability.rank]),
  ) as Record<AbilityAbbr, number>
  return multiclassRequirements(classId)
    .map((ability) => ({
      ability,
      need: MULTICLASS_RANK_REQ,
      have: ranks[ability] ?? 1,
    }))
    .filter((gap) => gap.have < gap.need)
}

export function formatMulticlassGaps(gaps: readonly MulticlassGap[]): string {
  return gaps.map((gap) => `Needs ${gap.ability} Rank ${gap.need}, you have ${gap.have}`).join('; ')
}

export function canMulticlass(input: {
  primaryClassId: ClassId | null
  secondaryClassId: ClassId | null
  targetClassId: ClassId
  skills: Record<SkillId, SkillProgress>
  isInDungeonOrQuest: boolean
}): boolean {
  if (input.isInDungeonOrQuest) return false
  if (!input.primaryClassId) return false
  if (input.targetClassId === input.primaryClassId) return false
  if (input.secondaryClassId != null && MAX_SECONDARY_CLASSES <= 1) return false
  return multiclassGaps(input.targetClassId, input.skills).length === 0
}

export function multiclassCost(discount = 0): { gold: number; items: ItemStack[] } {
  // TODO(design): tune
  return {
    gold: shopGoldCost(MULTICLASS_GOLD, discount),
    items: MULTICLASS_ITEMS.map((stack) => ({ ...stack })),
  }
}

export function rebirthCost(echoes: number, discount = 0): { gold: number; items: ItemStack[] } {
  // TODO(design): tune
  const mult = REBIRTH_COST_MULT ** Math.max(0, Math.floor(echoes))
  return {
    gold: shopGoldCost(Math.floor(REBIRTH_GOLD * mult), discount),
    items: REBIRTH_ITEMS.map((stack) => ({
      itemId: stack.itemId,
      quantity: Math.max(1, Math.floor(stack.quantity * mult)),
    })),
  }
}

export function echoXpFraction(echoes: number): number {
  return Math.max(0, Math.floor(echoes)) * (ECHO_XP_PCT / 100)
}

export function splitCombatXp(
  base: number,
  echoes: number,
  hasSecondary: boolean,
): { primary: number; secondary: number } {
  const echoed = base * (1 + echoXpFraction(echoes))
  return {
    primary: echoed,
    secondary: hasSecondary ? echoed * MULTICLASS_XP_SHARE : 0,
  }
}

export function secondarySignatureUnlocked(secondaryClassXp: number): boolean {
  return levelForXp(secondaryClassXp) >= SECONDARY_SIGNATURE_LEVEL
}

export type MulticlassState = {
  gold: number
  inventory: Inventory
  skills: Record<SkillId, SkillProgress>
  classId: ClassId | null
  classXp: number
  secondaryClassId: ClassId | null
  secondaryClassXp: number
  echoes: number
  clericFocus: ClericFocus
  isInDungeonOrQuest: boolean
}

export function buyMulticlass(
  state: MulticlassState,
  targetClassId: ClassId,
  discount = 0,
): MulticlassState {
  if (
    !canMulticlass({
      primaryClassId: state.classId,
      secondaryClassId: state.secondaryClassId,
      targetClassId,
      skills: state.skills,
      isInDungeonOrQuest: state.isInDungeonOrQuest,
    })
  ) {
    return state
  }
  const cost = multiclassCost(discount)
  if (state.gold < cost.gold || !hasItems(state.inventory, cost.items)) return state
  return {
    ...state,
    gold: state.gold - cost.gold,
    inventory: removeItems(state.inventory, cost.items),
    secondaryClassId: targetClassId,
    secondaryClassXp: 0,
  }
}

export function rebirth(
  state: MulticlassState,
  newClassId: ClassId,
  clericFocus: ClericFocus = 'INT',
  discount = 0,
): MulticlassState {
  if (state.isInDungeonOrQuest || !state.classId) return state
  const cost = rebirthCost(state.echoes, discount)
  if (state.gold < cost.gold || !hasItems(state.inventory, cost.items)) return state
  return {
    ...state,
    gold: state.gold - cost.gold,
    inventory: removeItems(state.inventory, cost.items),
    classId: newClassId,
    classXp: 0,
    secondaryClassId: null,
    secondaryClassXp: 0,
    echoes: state.echoes + 1,
    clericFocus: newClassId === 'cleric' ? clericFocus : state.clericFocus,
  }
}

/** Apply combat kill XP to primary and optional secondary. */
export function applyCombatXp(
  classXp: number,
  secondaryClassXp: number,
  base: number,
  echoes: number,
  hasSecondary: boolean,
): { classXp: number; secondaryClassXp: number } {
  const split = splitCombatXp(base, echoes, hasSecondary)
  return {
    classXp: addXp(classXp, split.primary),
    secondaryClassXp: hasSecondary ? addXp(secondaryClassXp, split.secondary) : secondaryClassXp,
  }
}
