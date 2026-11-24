/** Leveling: skills and class levels go 1–99. */
export const MAX_LEVEL = 99

/** Inventory organization tabs. Extra tabs come from the shop. */
export const BASE_INVENTORY_TABS = 5
export const MAX_INVENTORY_TABS = 10

/**
 * Activity XP. xp = round(XP_BASE + XP_PER_LEVEL × requiredLevel).
 * Crafts multiply by CRAFT_XP_MULT because the inputs already took gathering time.
 */
export const XP_BASE = 8
export const XP_PER_LEVEL = 1.15
export const CRAFT_XP_MULT = 1.3

/** How many upcoming unlock levels a skill tab shows before "More unlocks". */
export const LOCKED_PREVIEW_LEVELS = 3

/** Scribing tomes: Vol. N at TOME_FIRST_LEVEL + (N−1)×TOME_LEVEL_STEP, and the target skill ≥ (N−1)×TOME_SKILL_GATE_STEP. */
export const TOME_FIRST_LEVEL = 5
export const TOME_LEVEL_STEP = 9
export const TOME_SKILL_GATE_STEP = 10

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

/**
 * Skill check tiers by margin (total − DC).
 * standard is 0 through STANDARD, fine through FINE, masterwork above that.
 * A natural 20 is exceptional only when total ≥ DC. A natural 1 is always a fumble.
 */
export const QUALITY_MARGIN_STANDARD = 4
export const QUALITY_MARGIN_FINE = 9

/** XP: standard / fine / masterwork / exceptional, then fail and fumble. */
export const QUALITY_XP_MULTIPLIER = {
  standard: 1,
  fine: 1.1,
  masterwork: 1.25,
  exceptional: 1.5,
  fail: 0.5,
  fumble: 0.25,
} as const

/** Gathering yield. Exceptional is ×2 plus the rare table. Fail and fumble grant nothing. */
export const GATHER_YIELD_MULTIPLIER = {
  standard: 1,
  fine: 1.5,
  masterwork: 2,
  exceptional: 2,
  fail: 0,
  fumble: 0,
} as const

/** Weapons: to-hit and damage. Exceptional uses the masterwork bonus plus a family property. */
export const WEAPON_QUALITY_BONUS = { standard: 0, fine: 1, masterwork: 2, exceptional: 2 } as const

/** Armor: flat AC added per worn piece before the slot-share floor. Five pieces of +0.4 = +2. */
export const ARMOR_QUALITY_AC = { standard: 0, fine: 0.2, masterwork: 0.4, exceptional: 0.4 } as const

export const JEWELRY_QUALITY_MULT = { standard: 1, fine: 1.25, masterwork: 1.5, exceptional: 1.5 } as const
export const FOOD_QUALITY_MULT = { standard: 1, fine: 1.25, masterwork: 1.5, exceptional: 1.5 } as const
export const POTION_QUALITY_MULT = { standard: 1, fine: 1.25, masterwork: 1.5, exceptional: 1.5 } as const

/** Chance a reagent is not consumed. Exceptional matches masterwork; no extra property. */
export const REAGENT_SAVE_CHANCE = { standard: 0, fine: 0.1, masterwork: 0.2, exceptional: 0.2 } as const

/** Skilling-gear skill bonuses. Fine and up floor, then bump a 0 to +1. */
export const SKILLING_QUALITY_MULT = { standard: 1, fine: 1.25, masterwork: 1.5, exceptional: 1.5 } as const

export const QUALITY_SELL_MULTIPLIER = { standard: 1, fine: 1.25, masterwork: 1.5, exceptional: 2 } as const

/** Exceptional light weapons: attackSpeedPct points (5 = 5% faster). */
export const EXCEPTIONAL_SWIFT_SPEED_PCT = 5
export const PIERCING_SHOT_AC = 2

export const EXCEPTIONAL_ARMOR_RESIST = {
  light: 'piercing',
  medium: 'slashing',
  heavy: 'bludgeoning',
} as const

/** Skill Checks: a natural 1 grants 25% XP, no items, and a small byproduct chance. */
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

/**
 * Gather/craft band start. An activity that consumes one of these cannot unlock earlier.
 * Gold is not on the metal tier row; it sits between silvered and mithral.
 */
export const MATERIAL_ITEM_BAND: Record<string, number> = {
  'iron-ore': 1,
  'iron-bar': 1,
  'steel-bar': 15,
  'silver-ore': 30,
  'silver-bar': 30,
  'gold-ore': 40,
  'gold-bar': 40,
  'mithral-ore': 60,
  'mithral-bar': 60,
  'adamantine-ore': 80,
  'adamantine-bar': 80,
  logs: 1,
  hardwood: 15,
  ironwood: 30,
  shadowtimber: 60,
  elderwood: 80,
  hide: 1,
  'thick-hide': 15,
  'croc-leather': 30,
  'rothe-hide': 60,
  dragonhide: 80,
  flax: 1,
  'linen-thread': 1,
  'linen-cloth': 1,
  wool: 15,
  'wool-yarn': 15,
  'wool-cloth': 15,
  'spider-silk': 30,
  'silk-thread': 30,
  'silk-cloth': 30,
  shadowsilk: 60,
  starweave: 80,
  'raw-quartz': 1,
  'cut-quartz': 1,
  'raw-amethyst': 15,
  'cut-amethyst': 15,
  'raw-sapphire': 30,
  'cut-sapphire': 30,
  'raw-emerald': 60,
  'cut-emerald': 60,
  'raw-diamond': 80,
  'cut-diamond': 80,
}

/** Smithing weapon type levels. Variant level is max(type, material band). */
export const WEAPON_TYPE_LEVEL = {
  dagger: 1,
  dart: 3,
  handaxe: 4,
  sickle: 5,
  mace: 7,
  spear: 8,
  javelin: 9,
  shortsword: 11,
  scimitar: 13,
  morningstar: 15,
  rapier: 17,
  longsword: 19,
  battleaxe: 21,
  warhammer: 23,
  flail: 25,
  greatsword: 27,
  greataxe: 29,
  maul: 31,
  glaive: 34,
  halberd: 37,
} as const

export const ARROWHEAD_TYPE_LEVEL = 2
export const SHIELD_TYPE_LEVEL = 6

/** Armor piece levels by set, in Boots → Gauntlets → Helmet → Chaps → Chest order. */
export const ARMOR_PIECE_LEVELS: Record<string, Record<string, number>> = {
  'ring-mail': { boots: 1, gauntlets: 2, helmet: 3, chaps: 4, chest: 6 },
  'chain-shirt': { boots: 8, gauntlets: 9, helmet: 10, chaps: 12, chest: 13 },
  'scale-mail': { boots: 16, gauntlets: 18, helmet: 19, chaps: 20, chest: 21 },
  'chain-mail': { boots: 20, gauntlets: 22, helmet: 24, chaps: 26, chest: 27 },
  'breastplate': { boots: 28, gauntlets: 30, helmet: 32, chaps: 33, chest: 35 },
  'half-plate': { boots: 38, gauntlets: 40, helmet: 42, chaps: 44, chest: 46 },
  splint: { boots: 48, gauntlets: 50, helmet: 52, chaps: 54, chest: 56 },
  plate: { boots: 58, gauntlets: 60, helmet: 62, chaps: 65, chest: 68 },
}

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
/** Hunter's Lodge board. Refresh is wall-clock and includes offline time. */
export const BOUNTY_BOARD_SLOTS = 3
export const BOUNTY_REFRESH_MS = 4 * 60 * 60 * 1000
export const BOUNTY_ACTIVE_MAX = 2

/** Cull kill counts and Marks by content tier. TODO(design): tune. */
export const BOUNTY_CULL_MIN: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 8, 2: 12, 3: 16, 4: 20, 5: 24 }
export const BOUNTY_CULL_MAX: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 15, 2: 22, 3: 28, 4: 36, 5: 44 }
export const BOUNTY_CULL_MARKS: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 8, 2: 14, 3: 22, 4: 32, 5: 44 }
export const BOUNTY_HUNT_MARKS: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 20, 2: 34, 3: 52, 4: 74, 5: 100 }
export const BOUNTY_MARKS_PER_MOD = 8

/** Named-bounty modifiers. Reused later by bosses and lairs. */
export const MOD_FRENZY_SPEED = 0.25
export const MOD_ARMORED_AC = 3
export const MOD_REGEN_PCT = 0.02
export const MOD_VENOM_DICE = '1d4'
export const MOD_VENOM_INTERVALS = 3
export const MOD_ENRAGE_HP = 0.5
export const MOD_ENRAGE_DAMAGE = 0.5
export const MOD_ELUSIVE_HIT = 0.1
export const MOD_HULKING_HP = 0.5
export const MOD_HULKING_DICE = 1

/** Lair action schedule and saves. */
export const LAIR_WEB_EVERY = 3
export const LAIR_WEB_SLOW = 0.5
export const LAIR_ROCKS_EVERY = 4
export const LAIR_ROCKS_DC = 13
export const LAIR_ROCKS_DICE = '2d6'
export const LAIR_SPORES_EVERY = 3
export const LAIR_SPORES_DC = 13
export const LAIR_SPORES_HIT = 2
export const LAIR_SPORES_INTERVALS = 3

/** Marks spent at the Hunter's Lodge. TODO(design): tune. */
export const LODGE_BAIT_MARKS = 10
export const LODGE_REROLL_MARKS = 5
export const LODGE_BOARD_MARKS = 40
export const LODGE_ACTIVE_MARKS = 80
export const LODGE_GEAR_MARKS = 25
export const LODGE_SUMMON_MARKS = 30
export const LODGE_TITLE_MARKS = 15

/**
 * Lifetime Marks for Renown ranks 1–10. Roughly quadratic.
 * TODO(design): tune.
 */
// TODO(design): tune. Roughly quadratic; rank 1 is one tier-I named bounty.
export const RENOWN_MARKS = [15, 60, 135, 240, 375, 540, 735, 960, 1215, 1500] as const

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
