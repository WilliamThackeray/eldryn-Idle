import { ABILITIES, type AbilityId } from '../data/abilities'
import { ABILITY_PERKS, type AbilityPerk, type PerkEffect } from '../data/abilityPerks'
import { SKILLS, type SkillId } from '../data/skills'
import type { AbilityAbbr, SkillProgress } from '../types/game'
import {
  ABILITY_AGGREGATION,
  ABILITY_LEVEL_DIVISOR,
  ABILITY_LEVEL_OFFSET,
  ABILITY_SCORE_BASE,
  ABILITY_SCORE_SOURCE,
  MODIFIER_DIVISOR,
  TIER_DIVISOR,
  type AbilityAggregation,
  type AbilityScoreSource,
} from './config'
import { levelForXp, tier, xpForLevel } from './xp'

export interface DerivedAbility {
  id: AbilityId
  name: string
  abbr: AbilityAbbr
  description: string
  score: number
  modifier: number
  rank: number
  /** 0–100 progress toward the next Rank. 100 at Rank 20. */
  rankProgress: number
}

export function abilityTotalXp(skills: Record<SkillId, SkillProgress>, abbr: AbilityAbbr): number {
  return SKILLS.filter((skill) => skill.ability === abbr).reduce(
    (sum, skill) => sum + (skills[skill.id]?.xp ?? 0),
    0,
  )
}

export function abilityRank(totalXp: number): number {
  return tier(levelForXp(totalXp))
}

export function abilityScoreFromRank(rank: number): number {
  return ABILITY_SCORE_BASE + Math.floor(rank / MODIFIER_DIVISOR)
}

/** Progress toward the next Rank. Next Rank starts at level `rank * TIER_DIVISOR + 1`. */
export function abilityRankProgress(totalXp: number, rank: number): number {
  if (rank >= 20) return 100
  const floorLevel = (rank - 1) * TIER_DIVISOR + 1
  const nextLevel = rank * TIER_DIVISOR + 1
  const floorXp = xpForLevel(floorLevel)
  const nextXp = xpForLevel(nextLevel)
  const span = nextXp - floorXp
  if (span <= 0) return 100
  return Math.min(100, Math.max(0, ((totalXp - floorXp) / span) * 100))
}

export function abilityScoreFromLevels(
  levels: readonly number[],
  aggregation: AbilityAggregation = ABILITY_AGGREGATION,
): number {
  if (levels.length === 0) return ABILITY_SCORE_BASE
  const aggregate =
    aggregation === 'highest' ? Math.max(...levels) : levels.reduce((sum, level) => sum + level, 0) / levels.length
  return ABILITY_SCORE_BASE + Math.floor((aggregate + ABILITY_LEVEL_OFFSET) / ABILITY_LEVEL_DIVISOR)
}

export function abilityModifier(score: number): number {
  return Math.floor((score - ABILITY_SCORE_BASE) / MODIFIER_DIVISOR)
}

/** `itemBonuses` are flat score bonuses, such as a Belt of Giant Strength, and can exceed 20. */
export function deriveAbilities(
  skills: Record<SkillId, SkillProgress>,
  itemBonuses: Partial<Record<AbilityAbbr, number>> = {},
  source: AbilityScoreSource = ABILITY_SCORE_SOURCE,
): DerivedAbility[] {
  return ABILITIES.map((ability) => {
    const totalXp = abilityTotalXp(skills, ability.abbr)
    const rank = abilityRank(totalXp)
    const levels = SKILLS.filter((skill) => skill.ability === ability.abbr).map((skill) =>
      levelForXp(skills[skill.id]?.xp ?? 0),
    )
    const baseScore =
      source === 'average' ? abilityScoreFromLevels(levels) : abilityScoreFromRank(rank)
    const score = baseScore + (itemBonuses[ability.abbr] ?? 0)
    return {
      id: ability.id,
      name: ability.name,
      abbr: ability.abbr,
      description: ability.description,
      score,
      modifier: abilityModifier(score),
      rank,
      rankProgress: abilityRankProgress(totalXp, rank),
    }
  })
}

export interface ActivePerk extends AbilityPerk {
  /** Effective amount: value, or value × current Rank when perRank. */
  amount: number
}

export function activePerks(state: { skills: Record<SkillId, SkillProgress> }): ActivePerk[] {
  const ranks = Object.fromEntries(
    deriveAbilities(state.skills).map((ability) => [ability.abbr, ability.rank]),
  ) as Record<AbilityAbbr, number>
  return ABILITY_PERKS.flatMap((perk) => {
    const currentRank = ranks[perk.ability] ?? 1
    if (currentRank < perk.rank) return []
    const value = 'value' in perk.effect ? perk.effect.value : 1
    const perRank = 'perRank' in perk.effect && perk.effect.perRank === true
    return [{ ...perk, amount: perRank ? value * currentRank : value }]
  })
}

export function effectTotal(
  perks: readonly ActivePerk[],
  type: PerkEffect['type'],
  ability?: AbilityAbbr,
): number {
  return perks.reduce((sum, perk) => {
    if (perk.effect.type !== type) return sum
    if (
      ability != null &&
      (perk.effect.type === 'skillYieldPct' || perk.effect.type === 'skillGoldPct') &&
      perk.effect.ability !== ability
    ) {
      return sum
    }
    return sum + perk.amount
  }, 0)
}

/** Nick ceiling from perks; default 2 (procs on 1–2). */
export function nickCeiling(perks: readonly ActivePerk[]): number {
  const fromPerk = perks
    .filter((perk) => perk.effect.type === 'nickRange')
    .reduce((max, perk) => Math.max(max, perk.amount), 0)
  return fromPerk > 0 ? fromPerk : 2
}

export function hasPerkEffect(perks: readonly ActivePerk[], type: PerkEffect['type']): boolean {
  return perks.some((perk) => perk.effect.type === type)
}
