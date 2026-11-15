import {
  CRITICAL_ITEM_MULTIPLIER,
  CRITICAL_XP_MULTIPLIER,
  DC_BASE,
  DC_LEVEL_DIVISOR,
  FAIL_ITEM_MULTIPLIER,
  FAIL_XP_MULTIPLIER,
  FUMBLE_BYPRODUCT_CHANCE,
  FUMBLE_ITEM_MULTIPLIER,
  FUMBLE_XP_MULTIPLIER,
  SUCCESS_ITEM_MULTIPLIER,
  SUCCESS_XP_MULTIPLIER,
} from './config'
import { rollD20, type RollMode } from './dice'
import type { Rng } from './rng'
import { proficiency, tier } from './xp'

export type SkillCheckOutcome = 'critical' | 'success' | 'fail' | 'fumble'

export interface SkillCheckInput {
  rng: Rng
  mode?: RollMode
  abilityModifier: number
  skillLevel: number
  requiredLevel: number
}

export interface SkillCheckResult {
  roll: number
  total: number
  dc: number
  outcome: SkillCheckOutcome
  xpMultiplier: number
  itemMultiplier: number
  rareRoll: boolean
  byproduct: boolean
}

export function skillCheck(input: SkillCheckInput): SkillCheckResult {
  const natural = rollD20(input.rng, input.mode ?? 'normal')
  const total = natural + input.abilityModifier + proficiency(tier(input.skillLevel))
  const dc = DC_BASE + Math.floor(input.requiredLevel / DC_LEVEL_DIVISOR)
  const result = (outcome: SkillCheckOutcome, xpMultiplier: number, itemMultiplier: number, rareRoll: boolean, byproduct: boolean): SkillCheckResult => ({
    roll: natural,
    total,
    dc,
    outcome,
    xpMultiplier,
    itemMultiplier,
    rareRoll,
    byproduct,
  })

  if (natural === 20) return result('critical', CRITICAL_XP_MULTIPLIER, CRITICAL_ITEM_MULTIPLIER, true, false)
  if (natural === 1) {
    return result('fumble', FUMBLE_XP_MULTIPLIER, FUMBLE_ITEM_MULTIPLIER, false, input.rng() < FUMBLE_BYPRODUCT_CHANCE)
  }
  if (total >= dc) return result('success', SUCCESS_XP_MULTIPLIER, SUCCESS_ITEM_MULTIPLIER, false, false)
  return result('fail', FAIL_XP_MULTIPLIER, FAIL_ITEM_MULTIPLIER, false, false)
}
