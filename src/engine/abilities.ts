import { ABILITIES, type AbilityId } from '../data/abilities'
import { SKILLS, type SkillId } from '../data/skills'
import type { AbilityAbbr, SkillProgress } from '../types/game'
import { levelFromXp } from './experience'

export interface DerivedAbility {
  id: AbilityId
  name: string
  abbr: AbilityAbbr
  description: string
  score: number
  modifier: number
}

/** Score = 10 + floor((average skill level + 1) / 10). Empty (CON) stays 10. */
export function abilityScoreFromLevels(levels: readonly number[]): number {
  if (levels.length === 0) return 10
  const average = levels.reduce((sum, level) => sum + level, 0) / levels.length
  const score = 10 + Math.floor((average + 1) / 10)
  return Math.min(20, Math.max(10, score))
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function deriveAbilities(skills: Record<SkillId, SkillProgress>): DerivedAbility[] {
  return ABILITIES.map((ability) => {
    const levels = SKILLS.filter((skill) => skill.ability === ability.abbr).map((skill) =>
      levelFromXp(skills[skill.id]?.xp ?? 0),
    )
    const score = abilityScoreFromLevels(levels)
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
