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

/** Short rest: auto-eat at most this many food items while below max HP. */
export const SHORT_REST_MAX_FOOD = 2

/** Flat damage bonus on a strong combat-triangle matchup. */
export const TRIANGLE_STRONG = 0.25

/** Flat damage penalty on a weak combat-triangle matchup. */
export const TRIANGLE_WEAK = 0.25

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
 * rotation: the loop cycles through all slots forever (components are the limiter).
 */
export type SpellSlotModel = 'expended' | 'rotation'
export const SPELL_SLOT_MODEL: SpellSlotModel = 'rotation'

/** Wizard: chance to cast without consuming components. */
export const ARCANE_RECOVERY_SAVE_CHANCE = 0.15

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

/** History tomes: max XP bonus percent per skill from volumes read. */
export const HISTORY_MAX_XP_PCT = 10

/** History Vol. V+: interval speed bonus (5% faster). */
export const HISTORY_TOME_SPEED_BONUS = 0.05

/** History Vol. X: flat skill-check bonus. */
export const HISTORY_TOME_CHECK_BONUS = 1

/** Study Notes: yield bonus and duration. */
export const HISTORY_NOTE_YIELD_PCT = 0.1
export const HISTORY_NOTE_DURATION_MS = 60 * 60 * 1000

/** CHA consumable buffs. */
export const TRADE_CONTRACT_SELL_PCT = 0.15
export const TRADE_CONTRACT_DURATION_MS = 30 * 60 * 1000
export const DISGUISE_DURATION_MS = 30 * 60 * 1000
export const MENACE_DURATION_MS = 30 * 60 * 1000
export const INTEL_DURATION_MS = 60 * 60 * 1000
export const RUMOR_DURATION_MS = 60 * 60 * 1000
export const INTEL_DAMAGE_PCT = 0.1
export const RUMOR_RARE_CHANCE = 0.25
export const FRIGHTEN_CHANCE = 0.5
export const FRIGHTEN_ATTACKS = 3
export const FRIGHTEN_DAMAGE_PCT = 0.75
export const BOUNTY_KILLS = 5
export const BOUNTY_GOLD = 25
export const BOUNTY_FAVOR = 5

/** Notice Board refresh interval (wall-clock, includes offline). */
export const NOTICE_BOARD_MS = 4 * 60 * 60 * 1000
export const NOTICE_BOARD_QTY = 5
export const NOTICE_BOARD_KILL_GOLD_PER = 8
export const NOTICE_BOARD_FAVOR = 2
export const NOTICE_BOARD_REROLL_FAVOR = 1
export const LEGACY_QUEST_GOLD = 50

/** Multiclass: Ability Rank required on each ability the target class boosts by ≥ MULTICLASS_XP_MOD_MIN. */
export const MULTICLASS_RANK_REQ = 10
export const MULTICLASS_XP_MOD_MIN = 0.15
export const MAX_SECONDARY_CLASSES = 1
/** Share of each combat XP gain granted to the secondary class (on top of primary's full XP). */
export const MULTICLASS_XP_SHARE = 0.25
/** Secondary signature unlocks at this secondary Class Level. */
export const SECONDARY_SIGNATURE_LEVEL = 5

/** Rebirth: permanent +ECHO_XP_PCT% all XP per Echo. Cost multiplies by REBIRTH_COST_MULT each rebirth. */
export const ECHO_XP_PCT = 2
export const REBIRTH_COST_MULT = 2

/** Placeholder Shop costs. TODO(design): tune. */
export const MULTICLASS_GOLD = 5000
export const MULTICLASS_ITEMS = [
  { itemId: 'warding-chalk' as const, quantity: 5 },
  { itemId: 'troll-blood-tonic' as const, quantity: 3 },
  { itemId: 'fireball-reagent' as const, quantity: 5 },
]
export const REBIRTH_GOLD = 10000
export const REBIRTH_ITEMS = [
  { itemId: 'warding-chalk' as const, quantity: 10 },
  { itemId: 'troll-blood-tonic' as const, quantity: 5 },
  { itemId: 'ghoul-ichor' as const, quantity: 10 },
  { itemId: 'spider-silk' as const, quantity: 10 },
]
