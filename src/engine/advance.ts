import { SKILLS, type SkillId } from '../data/skills'
import type { AbilityAbbr, InventoryItem, SkillProgress } from '../types/game'
import { deriveAbilities } from './abilities'
import { OFFLINE_CAP_MS } from './config'
import { intervalMs } from './interval'
import type { Rng } from './rng'
import { skillCheck, type SkillCheckOutcome, type SkillCheckResult } from './skillCheck'
import { addXp, applyXpModifiers, levelForXp } from './xp'

export interface SkillAction {
  kind: 'skill'
  skillId: SkillId
  activityId: string
  label: string
  baseIntervalMs: number
  requiredLevel: number
  baseXp: number
  progressMs: number
}

export interface CombatAction {
  kind: 'combat'
  label: string
  baseIntervalMs: number
  progressMs: number
}

/** TODO(design): one activity at a time vs skilling + combat together. One slot until that's decided. */
export type ActiveAction = SkillAction | CombatAction

export interface AdvanceState {
  skills: Record<SkillId, SkillProgress>
  inventory: InventoryItem[]
  activeAction: ActiveAction | null
}

export interface SkillEvent {
  kind: 'skill'
  skillId: SkillId
  activityId: string
  label: string
  roll: number
  total: number
  dc: number
  outcome: SkillCheckOutcome
  xp: number
}

export type GameEvent = SkillEvent

export interface SkillGain {
  skillId: SkillId
  xp: number
  levels: number
}

export interface ItemGain {
  id: string
  name: string
  quantity: number
}

export interface OfflineReport {
  awayMs: number
  cappedMs: number
  skills: SkillGain[]
  items: ItemGain[]
}

export function cappedAway(awayMs: number): { elapsedMs: number; cappedMs: number } {
  const away = Number.isFinite(awayMs) && awayMs > 0 ? awayMs : 0
  const elapsedMs = Math.min(away, OFFLINE_CAP_MS)
  return { elapsedMs, cappedMs: away - elapsedMs }
}

export function summarizeGains(
  beforeSkills: Record<SkillId, SkillProgress>,
  afterSkills: Record<SkillId, SkillProgress>,
  beforeItems: InventoryItem[],
  afterItems: InventoryItem[],
): { skills: SkillGain[]; items: ItemGain[] } {
  const skills = SKILLS.flatMap((skill) => {
    const beforeXp = beforeSkills[skill.id]?.xp ?? 0
    const afterXp = afterSkills[skill.id]?.xp ?? 0
    const xp = afterXp - beforeXp
    if (xp <= 0) return []
    return [{ skillId: skill.id, xp, levels: levelForXp(afterXp) - levelForXp(beforeXp) }]
  })

  const previous = new Map(beforeItems.map((item) => [item.id, item.quantity]))
  const items = afterItems.flatMap((item) => {
    const quantity = item.quantity - (previous.get(item.id) ?? 0)
    if (quantity <= 0) return []
    return [{ id: item.id, name: item.name, quantity }]
  })

  return { skills, items }
}

/** Prompt 3 grants items here. */
export function onActivityComplete(state: AdvanceState, action: SkillAction, check: SkillCheckResult): AdvanceState {
  void action.activityId
  void check.itemMultiplier
  return state
}

// shortcut: other speed bonuses stay 0 until gear, potions, and buffs exist.
export function activityIntervalMs(
  skillId: SkillId,
  baseIntervalMs: number,
  skills: Record<SkillId, SkillProgress>,
): number {
  const dex = deriveAbilities(skills).find((ability) => ability.abbr === 'DEX')?.modifier ?? 0
  const ability = SKILLS.find((skill) => skill.id === skillId)?.ability
  return intervalMs(baseIntervalMs, dex, 0, ability === 'STR' || ability === 'DEX')
}

export function actionIntervalMs(action: ActiveAction, skills: Record<SkillId, SkillProgress>): number {
  if (action.kind === 'combat') {
    const dex = deriveAbilities(skills).find((ability) => ability.abbr === 'DEX')?.modifier ?? 0
    return intervalMs(action.baseIntervalMs, dex, 0, true)
  }
  return activityIntervalMs(action.skillId, action.baseIntervalMs, skills)
}

export function advance(
  state: AdvanceState,
  elapsedMs: number,
  rng: Rng,
  modifiers: Partial<Record<AbilityAbbr, number>> = {},
): { state: AdvanceState; log: GameEvent[] } {
  const current = state.activeAction
  if (!(elapsedMs > 0) || !current || current.kind === 'combat') return { state, log: [] }

  let skills = state.skills
  let inventory = state.inventory
  let action: ActiveAction | null = current
  let progress = current.progressMs
  let remaining = elapsedMs
  const log: GameEvent[] = []

  while (action?.kind === 'skill' && remaining > 0) {
    const acting = action
    const skill = SKILLS.find((entry) => entry.id === acting.skillId)
    if (!skill) {
      action = null
      break
    }

    const interval = activityIntervalMs(acting.skillId, acting.baseIntervalMs, skills)
    if (!Number.isFinite(interval) || interval <= 0) break

    const need = Math.max(0, interval - progress)
    if (remaining < need) {
      progress += remaining
      break
    }

    remaining -= need
    progress = 0
    const check = skillCheck({
      rng,
      abilityModifier: deriveAbilities(skills).find((ability) => ability.abbr === skill.ability)?.modifier ?? 0,
      skillLevel: levelForXp(skills[skill.id].xp),
      requiredLevel: acting.requiredLevel,
    })
    const xp = applyXpModifiers(acting.baseXp * check.xpMultiplier, skill.ability, modifiers)
    skills = { ...skills, [skill.id]: { xp: addXp(skills[skill.id].xp, xp) } }
    log.push({
      kind: 'skill',
      skillId: skill.id,
      activityId: acting.activityId,
      label: acting.label,
      roll: check.roll,
      total: check.total,
      dc: check.dc,
      outcome: check.outcome,
      xp,
    })

    const next = onActivityComplete({ skills, inventory, activeAction: { ...acting, progressMs: 0 } }, acting, check)
    skills = next.skills
    inventory = next.inventory
    action = next.activeAction
  }

  return {
    state: {
      skills,
      inventory,
      activeAction: action?.kind === 'skill' ? { ...action, progressMs: progress } : action,
    },
    log,
  }
}
