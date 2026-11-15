import { ABILITIES, type AbilityId } from '../data/abilities'
import { SKILLS, type SkillId } from '../data/skills'
import type { AbilityAbbr, SkillProgress } from '../types/game'
import {
  ABILITY_AGGREGATION,
  ABILITY_LEVEL_DIVISOR,
  ABILITY_LEVEL_OFFSET,
  ABILITY_SCORE_BASE,
  MODIFIER_DIVISOR,
  type AbilityAggregation,
} from './config'
import { levelForXp } from './xp'

export interface DerivedAbility {
  id: AbilityId
  name: string
  abbr: AbilityAbbr
  description: string
  score: number
  modifier: number
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
): DerivedAbility[] {
  return ABILITIES.map((ability) => {
    const levels = SKILLS.filter((skill) => skill.ability === ability.abbr).map((skill) =>
      levelForXp(skills[skill.id]?.xp ?? 0),
    )
    const score = abilityScoreFromLevels(levels) + (itemBonuses[ability.abbr] ?? 0)
    return {
      id: ability.id,
      name: ability.name,
      abbr: ability.abbr,
      description: ability.description,
      score,
      modifier: abilityModifier(score),
    }
  })
}
