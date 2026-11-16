import { getActivity } from '../data/activities'
import { getItem } from '../data/items'
import { SKILLS, type SkillId } from '../data/skills'
import type { AbilityAbbr, SkillProgress } from '../types/game'
import { deriveAbilities } from './abilities'
import { OFFLINE_CAP_MS } from './config'
import { intervalMs } from './interval'
import { hasItems, removeItems, addItems, type Inventory } from './inventory'
import { rollGold, rollLoot } from './loot'
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
  inventory: Inventory
  gold: number
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
  items: ItemGain[]
  gold: number
}

export interface MaterialsEvent {
  kind: 'materials'
  skillId: SkillId
  activityId: string
  label: string
}

export type GameEvent = SkillEvent | MaterialsEvent

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
  gold: number
}

export function cappedAway(awayMs: number): { elapsedMs: number; cappedMs: number } {
  const away = Number.isFinite(awayMs) && awayMs > 0 ? awayMs : 0
  const elapsedMs = Math.min(away, OFFLINE_CAP_MS)
  return { elapsedMs, cappedMs: away - elapsedMs }
}

export function summarizeGains(
  beforeSkills: Record<SkillId, SkillProgress>,
  afterSkills: Record<SkillId, SkillProgress>,
  beforeItems: Inventory,
  afterItems: Inventory,
  beforeGold = 0,
  afterGold = 0,
): { skills: SkillGain[]; items: ItemGain[]; gold: number } {
  const skills = SKILLS.flatMap((skill) => {
    const beforeXp = beforeSkills[skill.id]?.xp ?? 0
    const afterXp = afterSkills[skill.id]?.xp ?? 0
    const xp = afterXp - beforeXp
    if (xp <= 0) return []
    return [{ skillId: skill.id, xp, levels: levelForXp(afterXp) - levelForXp(beforeXp) }]
  })

  return {
    skills,
    items: gainedItems(beforeItems, afterItems),
    gold: Math.max(0, afterGold - beforeGold),
  }
}

function gainedItems(beforeItems: Inventory, afterItems: Inventory): ItemGain[] {
  const ids = [...new Set([...Object.keys(beforeItems), ...Object.keys(afterItems)])].sort()
  return ids.flatMap((id) => {
    const quantity = (afterItems[id as keyof Inventory] ?? 0) - (beforeItems[id as keyof Inventory] ?? 0)
    if (quantity <= 0) return []
    return [{ id, name: getItem(id)?.name ?? id, quantity }]
  })
}

export function onActivityComplete(
  state: AdvanceState,
  action: SkillAction,
  check: SkillCheckResult,
  rng: Rng,
): AdvanceState {
  const activity = getActivity(action.skillId, action.activityId)
  if (!activity) return state
  if (activity.inputs?.length && !hasItems(state.inventory, activity.inputs)) return state

  // TODO(design): confirm inputs are spent on failures and fumbles.
  let inventory = activity.inputs?.length ? removeItems(state.inventory, activity.inputs) : state.inventory
  const multiplier = check.itemMultiplier
  inventory = addItems(inventory, [
    ...rollLoot(activity.outputs, rng, multiplier),
    ...(check.rareRoll ? rollLoot(activity.rareTable, rng, multiplier) : []),
    ...(check.byproduct ? rollLoot(activity.byproducts, rng, 1) : []),
  ])
  return { ...state, inventory, gold: state.gold + rollGold(activity.gold, rng, multiplier) }
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
  let gold = state.gold
  let action: ActiveAction | null = current
  let progress = current.progressMs
  let remaining = elapsedMs
  const log: GameEvent[] = []

  while (action?.kind === 'skill' && remaining > 0) {
    const acting = action
    const activity = getActivity(acting.skillId, acting.activityId)
    if (activity?.inputs?.length && !hasItems(inventory, activity.inputs)) {
      log.push({
        kind: 'materials',
        skillId: acting.skillId,
        activityId: acting.activityId,
        label: acting.label,
      })
      action = null
      break
    }

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
    const beforeItems = inventory
    const beforeGold = gold
    const next = onActivityComplete(
      { skills, inventory, gold, activeAction: { ...acting, progressMs: 0 } },
      acting,
      check,
      rng,
    )
    skills = next.skills
    inventory = next.inventory
    gold = next.gold
    action = next.activeAction
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
      items: gainedItems(beforeItems, inventory),
      gold: Math.max(0, gold - beforeGold),
    })
  }

  return {
    state: {
      skills,
      inventory,
      gold,
      activeAction: action?.kind === 'skill' ? { ...action, progressMs: progress } : action,
    },
    log,
  }
}
