/** Leveling: skills and class levels go 1–99. */
export const MAX_LEVEL = 99

/** Inventory organization tabs. Extra tabs come from the shop. */
export const BASE_INVENTORY_TABS = 5
export const MAX_INVENTORY_TABS = 10

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
 * Ability Scores: Modifier = floor((score - 10) / 2), using the same base of 10.
 * rank: Score = 10 + floor(Rank / 2), Rank = tier(levelForXp(sum XP of the ability's skills)).
 * average: Score = 10 + floor((average skill level + 1) / 10). Kept for comparison.
 */
export const ABILITY_SCORE_BASE = 10
export const ABILITY_LEVEL_OFFSET = 1
export const ABILITY_LEVEL_DIVISOR = 10
export const MODIFIER_DIVISOR = 2

export type AbilityScoreSource = 'rank' | 'average'
export const ABILITY_SCORE_SOURCE: AbilityScoreSource = 'rank'

export type AbilityAggregation = 'average' | 'highest'

/** Ability Scores (average path): average of the ability's skills. 'highest' remains available. */
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

/**
 * Armor value split across worn pieces. Floor the sum.
 * TODO(design): confirm the split.
 */
export const ARMOR_SLOT_SHARE = {
  chest: 0.4,
  chaps: 0.25,
  helmet: 0.15,
  gauntlets: 0.1,
  boots: 0.1,
} as const

/** Weapon base interval in seconds before DEX and other speed bonuses. */
export const WEAPON_INTERVAL_SEC = {
  light: 4.8,
  standard: 6,
  heavy: 7.2,
  loadingExtra: 1.2,
} as const

/** Soft STR miss on heavy armor: finished interval × this factor. */
export const HEAVY_ARMOR_INTERVAL_FACTOR = 1.1

/**
 * Attunement is three dedicated slots.
 * TODO(design): slots vs a limit of 3 attuned items across all gear.
 */
export const ATTUNEMENT_LIMIT = 3

/** Flat to-hit / damage / AC from material tiers. */
export const MATERIAL_FLAT_BONUS = {
  iron: 0,
  steel: 1,
  silvered: 1,
  mithral: 2,
  adamantine: 3,
} as const

/** Class Level required to equip gear of this material. */
export const MATERIAL_LEVEL = {
  iron: 1,
  steel: 15,
  silvered: 30,
  mithral: 60,
  adamantine: 80,
} as const

export const MATERIAL_FLAGS = {
  silvered: { bypassesResistance: true },
  mithral: { ignoresStrAndStealth: true },
  adamantine: { negatesCriticalHits: true },
} as const

/** Auto-eat when HP falls below this fraction of max. */
export const AUTO_EAT_THRESHOLD = 0.5

/** Long rest / respawn between Monster Hunting kills. Attack intervals stay frozen during this. */
export const RESPAWN_MS = 2000

/** Short rest: regain this fraction of max HP (floored), capped at max. */
export const SHORT_REST_HP_FRACTION = 0.5

/** Fraction of spent ammo returned after a fight. */
export const AMMO_RECOVERY = 0.5

/** Monster attack interval by size (seconds). */
export const MONSTER_INTERVAL_SEC = {
  tiny: 4.8,
  small: 4.8,
  medium: 6,
  large: 7.2,
  huge: 8.4,
  gargantuan: 9.6,
} as const

/** Slow mastery: enemy interval × this (non-stacking). */
export const SLOW_INTERVAL_FACTOR = 1.1

/** Push mastery: delay the next enemy attack by this fraction of its interval. */
export const PUSH_DELAY_FRACTION = 0.25

/** Combat log lines kept for the live view. */
export const COMBAT_LOG_LIMIT = 30

/**
 * Spell slots inside a fight.
 * expended: each leveled slot casts once, then cantrips until a rest.
 * rotation: the loop cycles through all slots forever (components still limit leveled casts).
 * TODO(design): pick one for shipping; both stay behind this switch.
 */
export type SpellSlotModel = 'expended' | 'rotation'
export const SPELL_SLOT_MODEL: SpellSlotModel = 'expended'

/**
 * Casting ability for spell attack / save DC.
 * class: the 5e ability on ClassDefinition.spellcasting.
 * unlockSkill: the ability of the class's unlock skill (Nature is INT → Druid/Ranger cast INT).
 * TODO(design): 5e abilities vs unlock-skill ability after the INT/CHA XP swap.
 */
export type CastingAbilitySource = 'class' | 'unlockSkill'
export const CASTING_ABILITY_SOURCE: CastingAbilitySource = 'class'

/** Base spellcasting interval in seconds before DEX speed. */
export const SPELL_INTERVAL_SEC = 6

/** Sorcery points spent for Quickened Spell (next interval × 0.5). */
export const QUICKENED_COST = 2
export const QUICKENED_INTERVAL_FACTOR = 0.5
