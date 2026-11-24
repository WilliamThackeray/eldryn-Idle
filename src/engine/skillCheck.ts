import type { TradeSkillId } from '../data/skills'
import { getSkill } from '../data/skills'
import {
  DC_BASE,
  DC_LEVEL_DIVISOR,
  FUMBLE_BYPRODUCT_CHANCE,
  QUALITY_MARGIN_FINE,
  QUALITY_MARGIN_STANDARD,
  QUALITY_XP_MULTIPLIER,
} from './config'
import { resolveRollMode, rollD20, type RollMode } from './dice'
import { deriveAbilities } from './abilities'
import { emptyEquipment, gearRollMode, type Equipment, type EquipmentSlot } from './equipment'
import { tomeCheckBonus, type ActiveBuff, type Tomes } from './history'
import type { Rng } from './rng'
import { activityHasAdvantage } from './social'
import { getItem } from '../data/items'
import { levelForXp, proficiency, tier } from './xp'

export const QUALITY_TIERS = ['fail', 'fumble', 'standard', 'fine', 'masterwork', 'exceptional'] as const
export type QualityTier = (typeof QUALITY_TIERS)[number]

export interface BonusPart {
  label: string
  value: number
}

export interface SkillCheckInput {
  rng: Rng
  mode?: RollMode
  dc: number
  parts: BonusPart[]
}

export interface SkillCheckResult {
  roll: number
  bonusParts: BonusPart[]
  total: number
  dc: number
  tier: QualityTier
  xpMultiplier: number
  rareRoll: boolean
  byproduct: boolean
}

export interface ActivityCheckState {
  skills: Record<TradeSkillId, { xp: number }>
  equipment?: Equipment
  tomes?: Tomes
  activeBuffs?: ActiveBuff[]
}

export function checkDc(requiredLevel: number): number {
  return DC_BASE + Math.floor(requiredLevel / DC_LEVEL_DIVISOR)
}

export function checkPassed(tier: QualityTier): boolean {
  return tier !== 'fail' && tier !== 'fumble'
}

export function tierForRoll(roll: number, bonus: number, dc: number): QualityTier {
  if (roll === 1) return 'fumble'
  const total = roll + bonus
  if (roll === 20 && total >= dc) return 'exceptional'
  const margin = total - dc
  if (margin < 0) return 'fail'
  if (margin <= QUALITY_MARGIN_STANDARD) return 'standard'
  if (margin <= QUALITY_MARGIN_FINE) return 'fine'
  return 'masterwork'
}

export function activityBonusParts(state: ActivityCheckState, skillId: TradeSkillId): BonusPart[] {
  const skill = getSkill(skillId)
  const abilities = deriveAbilities(state.skills)
  const mod = abilities.find((ability) => ability.abbr === skill.ability)?.modifier ?? 0
  const level = levelForXp(state.skills[skillId]?.xp ?? 0)
  const parts: BonusPart[] = [
    { label: skill.ability, value: mod },
    { label: skill.name, value: proficiency(tier(level)) },
  ]
  const equipment = state.equipment ?? emptyEquipment()
  for (const slot of Object.keys(equipment) as EquipmentSlot[]) {
    const item = getItem(equipment[slot] ?? '')
    const bonus = item?.gear?.stats?.skillCheck?.[skillId] ?? 0
    if (bonus) parts.push({ label: item?.name ?? slot, value: bonus })
  }
  const history = tomeCheckBonus(state.tomes, skillId)
  if (history) parts.push({ label: 'History', value: history })
  return parts
}

export function activityRollMode(state: ActivityCheckState, skillId: TradeSkillId): RollMode {
  const equipment = state.equipment ?? emptyEquipment()
  const sources: Array<'advantage' | 'disadvantage'> = []
  const gearMode = gearRollMode(skillId, equipment)
  if (gearMode === 'advantage') sources.push('advantage')
  if (gearMode === 'disadvantage') sources.push('disadvantage')
  if (activityHasAdvantage(state.activeBuffs, skillId)) sources.push('advantage')
  return resolveRollMode(sources)
}

export function formatCheckLine(parts: BonusPart[], dc: number, mode: RollMode = 'normal'): string {
  const bits = parts
    .filter((part) => part.value !== 0)
    .map((part) => `${part.value < 0 ? '−' : '+'} ${Math.abs(part.value)} ${part.label}`)
  const die = mode === 'advantage' ? 'd20 adv' : mode === 'disadvantage' ? 'd20 dis' : 'd20'
  return [`${die} ${bits.join(' ')}`.trim(), `vs DC ${dc}`].join(' ')
}

function bonusOf(parts: BonusPart[]): number {
  return parts.reduce((sum, part) => sum + part.value, 0)
}

/** Exact percent of each tier over the d20, or both dice when advantage or disadvantage applies. */
export function tierChances(bonus: number, dc: number, mode: RollMode = 'normal'): Record<QualityTier, number> {
  const counts: Record<QualityTier, number> = {
    fail: 0,
    fumble: 0,
    standard: 0,
    fine: 0,
    masterwork: 0,
    exceptional: 0,
  }
  const faces: number[] = []
  if (mode === 'normal') {
    for (let roll = 1; roll <= 20; roll++) faces.push(roll)
  } else {
    for (let a = 1; a <= 20; a++) {
      for (let b = 1; b <= 20; b++) faces.push(mode === 'advantage' ? Math.max(a, b) : Math.min(a, b))
    }
  }
  for (const roll of faces) counts[tierForRoll(roll, bonus, dc)] += 1
  const total = faces.length
  return {
    fail: (counts.fail * 100) / total,
    fumble: (counts.fumble * 100) / total,
    standard: (counts.standard * 100) / total,
    fine: (counts.fine * 100) / total,
    masterwork: (counts.masterwork * 100) / total,
    exceptional: (counts.exceptional * 100) / total,
  }
}

export function qualityOdds(
  state: ActivityCheckState,
  activity: { skillId: TradeSkillId; requiredLevel: number },
): Record<QualityTier, number> {
  const parts = activityBonusParts(state, activity.skillId)
  return tierChances(bonusOf(parts), checkDc(activity.requiredLevel), activityRollMode(state, activity.skillId))
}

export function skillCheck(input: SkillCheckInput): SkillCheckResult {
  const natural = rollD20(input.rng, input.mode ?? 'normal')
  const bonus = bonusOf(input.parts)
  const total = natural + bonus
  const tier = tierForRoll(natural, bonus, input.dc)
  return {
    roll: natural,
    bonusParts: input.parts,
    total,
    dc: input.dc,
    tier,
    xpMultiplier: QUALITY_XP_MULTIPLIER[tier],
    rareRoll: tier === 'exceptional',
    byproduct: tier === 'fumble' && input.rng() < FUMBLE_BYPRODUCT_CHANCE,
  }
}
