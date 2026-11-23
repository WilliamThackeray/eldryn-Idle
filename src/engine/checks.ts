import { getClass, type ClassId } from '../data/classes'
import { getCheckSkill, type CheckSkillId } from '../data/checkSkills'
import { getSkill, type TradeSkillId } from '../data/skills'
import type { AbilityAbbr, SkillProgress } from '../types/game'
import { deriveAbilities } from './abilities'
import { rollD20, type RollMode } from './dice'
import type { Rng } from './rng'
import { levelForXp, proficiency, tier } from './xp'

export interface CheckModifier {
  name: string
  ability: AbilityAbbr
  abilityMod: number
  proficiency: number
  total: number
  proficient: boolean
}

export interface CheckState {
  skills: Record<TradeSkillId, SkillProgress>
  classId: ClassId | null
  classXp: number
}

export function checkModifier(state: CheckState, checkSkillId: CheckSkillId): CheckModifier {
  const def = getCheckSkill(checkSkillId)
  const abilityMod = deriveAbilities(state.skills).find((a) => a.abbr === def.ability)?.modifier ?? 0
  const cls = state.classId ? getClass(state.classId) : null
  const proficient = Boolean(
    cls && (cls.checkProficiencies as readonly CheckSkillId[]).includes(checkSkillId),
  )
  const prof = proficient ? proficiency(tier(levelForXp(state.classXp))) : 0
  return {
    name: def.name,
    ability: def.ability,
    abilityMod,
    proficiency: prof,
    total: abilityMod + prof,
    proficient,
  }
}

export function toolCheckModifier(
  state: { skills: Record<TradeSkillId, SkillProgress> },
  tradeSkillId: TradeSkillId,
): CheckModifier {
  const def = getSkill(tradeSkillId)
  const abilityMod = deriveAbilities(state.skills).find((a) => a.abbr === def.ability)?.modifier ?? 0
  const level = levelForXp(state.skills[tradeSkillId]?.xp ?? 0)
  const prof = proficiency(tier(level))
  return {
    name: def.name,
    ability: def.ability,
    abilityMod,
    proficiency: prof,
    total: abilityMod + prof,
    proficient: true,
  }
}

export function formatCheck(mod: CheckModifier): string {
  const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
  const parts = [`${mod.ability} ${signed(mod.abilityMod)}`]
  if (mod.proficient) parts.push(`Proficient ${signed(mod.proficiency)}`)
  return `${mod.name} ${signed(mod.total)} (${parts.join(', ')})`
}

export function rollCheck(
  rng: Rng,
  mod: CheckModifier,
  dc: number,
  mode: RollMode = 'normal',
): { roll: number; total: number; dc: number; success: boolean; margin: number } {
  const roll = rollD20(rng, mode)
  const total = roll + mod.total
  const success = roll === 20 || (roll !== 1 && total >= dc)
  return { roll, total, dc, success, margin: total - dc }
}
