/** Leveling: skills and class levels go 1–99. */
export const MAX_LEVEL = 99

/** Leveling: RuneScape curve for now. XP to reach level L = floor(1/4 * Σ floor(l + 300 * 2^(l/7))). */
export const XP_SUM_DIVISOR = 4
export const XP_LEVEL_COEFFICIENT = 300
export const XP_EXPONENT_BASE = 2
export const XP_EXPONENT_DIVISOR = 7

/** Leveling: Tier = ceil(level / 5), range 1–20. */
export const TIER_DIVISOR = 5

/** Proficiency Bonus: Proficiency = 2 + floor((tier - 1) / 4). */
export const PROFICIENCY_BASE = 2
export const PROFICIENCY_TIER_SPAN = 4

/**
 * Ability Scores: use the average of that ability's skill levels.
 * Score = 10 + floor((average skill level + 1) / 10).
 * Modifier = floor((score - 10) / 2), using the same base of 10.
 */
export const ABILITY_SCORE_BASE = 10
export const ABILITY_LEVEL_OFFSET = 1
export const ABILITY_LEVEL_DIVISOR = 10
export const MODIFIER_DIVISOR = 2

export type AbilityAggregation = 'average' | 'highest'

/** Ability Scores: average of the ability's skills. 'highest' remains available if this changes. */
export const ABILITY_AGGREGATION: AbilityAggregation = 'average'

/** Skill Checks: accepted starting point. DC = 10 + floor(required level / 10). */
export const DC_BASE = 10
export const DC_LEVEL_DIVISOR = 10

/** Skill Checks: a natural 20 doubles items, rolls the rare table, and grants +50% XP. */
export const CRITICAL_XP_MULTIPLIER = 1.5
export const CRITICAL_ITEM_MULTIPLIER = 2

/** Skill Checks: a success grants the activity's normal items and XP. */
export const SUCCESS_XP_MULTIPLIER = 1
export const SUCCESS_ITEM_MULTIPLIER = 1

/** Skill Checks: a miss grants 50% XP and no items. */
export const FAIL_XP_MULTIPLIER = 0.5
export const FAIL_ITEM_MULTIPLIER = 0

/** Skill Checks: a natural 1 grants 25% XP, no items, and a small byproduct chance. */
export const FUMBLE_XP_MULTIPLIER = 0.25
export const FUMBLE_ITEM_MULTIPLIER = 0
export const FUMBLE_BYPRODUCT_CHANCE = 0.25

/**
 * Interval formula: Interval = Base × (1 − DEX_SPEED_PER_MOD × DEX mod) × (1 − other speed bonuses),
 * floored at MIN_INTERVAL_FRACTION × Base. DEX applies to combat and STR / DEX skills only.
 * TODO(design): mental skill speed stat — flat, or the skill's own ability modifier?
 */
export const DEX_SPEED_PER_MOD = 0.03
export const MIN_INTERVAL_FRACTION = 0.5

/** Offline: cap away-time progress at 24 hours. */
export const OFFLINE_CAP_MS = 24 * 60 * 60 * 1000
