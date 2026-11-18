import { getActivity } from '../data/activities'
import type { ClassId } from '../data/classes'
import { getItem } from '../data/items'
import { getMonster } from '../data/monsters'
import { SKILLS, type SkillId } from '../data/skills'
import type { AbilityAbbr, SkillProgress } from '../types/game'
import { deriveAbilities } from './abilities'
import {
  advanceCombat,
  type CombatAction,
  type CombatFight,
} from './combat'
import { OFFLINE_CAP_MS, RESPAWN_MS } from './config'
import { emptyEquipment, gearRollMode, heavyArmorIntervalMultiplier, type Equipment } from './equipment'
import { intervalMs } from './interval'
import { hasItems, removeItems, addItems, type Inventory } from './inventory'
import { rollGold, rollLoot } from './loot'
import type { Rng } from './rng'
import {
  completeQuestActionStep,
  type QuestProgress,
} from './quest'
import { skillCheck, type SkillCheckOutcome, type SkillCheckResult } from './skillCheck'
import { addXp, applyXpModifiers, levelForXp } from './xp'

export type { CombatAction, CombatFight } from './combat'

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

/** TODO(design): one activity at a time vs skilling + combat together. One slot until that's decided. */
export type ActiveAction = SkillAction | CombatAction

export interface AdvanceState {
  skills: Record<SkillId, SkillProgress>
  inventory: Inventory
  gold: number
  activeAction: ActiveAction | null
  /** Missing means empty; keeps older advance tests valid. */
  equipment?: Equipment
  classId?: ClassId | null
  classXp?: number
  combat?: CombatFight | null
  /** Set when a hunt ends in defeat during this advance call. */
  lastDefeat?: boolean
  /** Kills credited when a hunt ends during this advance call. */
  endedHuntKills?: number
  questProgress?: QuestProgress
  /** Cleared when leaving a dungeon/quest run. */
  isInDungeonOrQuest?: boolean
  /** Quest id completed this tick (combat or dungeon step). */
  questStepComplete?: string | null
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

export interface CombatLogEvent {
  kind: 'combat'
  lines: string[]
}

export type GameEvent = SkillEvent | MaterialsEvent | CombatLogEvent

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
  kills: number
  classXp: number
  defeated: boolean
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
  beforeClassXp = 0,
  afterClassXp = 0,
  kills = 0,
  defeated = false,
): { skills: SkillGain[]; items: ItemGain[]; gold: number; classXp: number; kills: number; defeated: boolean } {
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
    classXp: Math.max(0, afterClassXp - beforeClassXp),
    kills,
    defeated,
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

// shortcut: other speed bonuses stay 0 until potions and buffs exist.
export function activityIntervalMs(
  skillId: SkillId,
  baseIntervalMs: number,
  skills: Record<SkillId, SkillProgress>,
  equipment: Equipment = emptyEquipment(),
): number {
  const abilities = deriveAbilities(skills)
  const dex = abilities.find((ability) => ability.abbr === 'DEX')?.modifier ?? 0
  const str = abilities.find((ability) => ability.abbr === 'STR')?.score ?? 10
  const ability = SKILLS.find((skill) => skill.id === skillId)?.ability
  const base = intervalMs(baseIntervalMs, dex, 0, ability === 'STR' || ability === 'DEX')
  return base * heavyArmorIntervalMultiplier(equipment, str)
}

export function actionIntervalMs(
  action: ActiveAction,
  skills: Record<SkillId, SkillProgress>,
  equipment: Equipment = emptyEquipment(),
  combat?: CombatFight | null,
): number {
  if (action.kind === 'combat') {
    if (combat?.phase === 'rest') return RESPAWN_MS
    if (combat && combat.playerIntervalMs > 0) return combat.playerIntervalMs
    const abilities = deriveAbilities(skills)
    const dex = abilities.find((ability) => ability.abbr === 'DEX')?.modifier ?? 0
    const str = abilities.find((ability) => ability.abbr === 'STR')?.score ?? 10
    return intervalMs(action.baseIntervalMs, dex, 0, true) * heavyArmorIntervalMultiplier(equipment, str)
  }
  return activityIntervalMs(action.skillId, action.baseIntervalMs, skills, equipment)
}

export function advance(
  state: AdvanceState,
  elapsedMs: number,
  rng: Rng,
  modifiers: Partial<Record<AbilityAbbr, number>> = {},
  options: { trace?: boolean } = {},
): { state: AdvanceState; log: GameEvent[] } {
  const current = state.activeAction
  if (!(elapsedMs > 0) || !current) return { state, log: [] }

  if (current.kind === 'combat') {
    return advanceCombatAction(state, current, elapsedMs, rng, modifiers, options.trace ?? false)
  }

  let skills = state.skills
  let inventory = state.inventory
  let gold = state.gold
  const equipment = state.equipment ?? emptyEquipment()
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

    const interval = activityIntervalMs(acting.skillId, acting.baseIntervalMs, skills, equipment)
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
      mode: gearRollMode(skill.id, equipment),
      abilityModifier: deriveAbilities(skills).find((ability) => ability.abbr === skill.ability)?.modifier ?? 0,
      skillLevel: levelForXp(skills[skill.id].xp),
      requiredLevel: acting.requiredLevel,
    })
    const xp = applyXpModifiers(acting.baseXp * check.xpMultiplier, skill.ability, modifiers)
    skills = { ...skills, [skill.id]: { xp: addXp(skills[skill.id].xp, xp) } }
    const beforeItems = inventory
    const beforeGold = gold
    const next = onActivityComplete(
      { skills, inventory, gold, activeAction: { ...acting, progressMs: 0 }, equipment },
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
      ...state,
      skills,
      inventory,
      gold,
      activeAction: action?.kind === 'skill' ? { ...action, progressMs: progress } : action,
    },
    log,
  }
}

function advanceCombatAction(
  state: AdvanceState,
  action: CombatAction,
  elapsedMs: number,
  rng: Rng,
  modifiers: Partial<Record<AbilityAbbr, number>>,
  trace: boolean,
): { state: AdvanceState; log: GameEvent[] } {
  const fight = state.combat
  const classId = state.classId
  const classXp = state.classXp
  if (!fight || !classId || classXp == null) {
    return { state: { ...state, activeAction: null, combat: null }, log: [] }
  }

  const beforeLogLen = fight.log.length
  const result = advanceCombat({
    fight,
    skills: state.skills,
    inventory: state.inventory,
    gold: state.gold,
    equipment: state.equipment ?? emptyEquipment(),
    activeClassId: classId,
    classXp,
    elapsedMs,
    rng,
    trace,
    modifiers,
  })

  const log: GameEvent[] = []
  if (trace) {
    const newLines = result.lastLog.slice(beforeLogLen)
    if (newLines.length) log.push({ kind: 'combat', lines: newLines })
  }

  let questProgress = state.questProgress
  if (result.questStepComplete && questProgress) {
    const kind = action.mode === 'dungeon' || action.dungeonId ? 'dungeon' : 'combat'
    questProgress = completeQuestActionStep(result.questStepComplete, questProgress, kind)
  }

  if (result.stop || !result.fight) {
    return {
      state: {
        ...state,
        skills: result.skills,
        inventory: result.inventory,
        gold: result.gold,
        classXp: result.classXp,
        activeAction: null,
        combat: null,
        lastDefeat: result.defeated,
        endedHuntKills: result.kills,
        questProgress,
        isInDungeonOrQuest: result.leftDungeonOrQuest ? false : state.isInDungeonOrQuest,
        questStepComplete: result.questStepComplete ?? null,
      },
      log,
    }
  }

  const monster = getMonster(result.fight.monsterId)
  const dungeonLabel =
    result.fight.dungeonId != null
      ? `Dungeon · ${monster?.name ?? '…'}`
      : monster
        ? `Hunting ${monster.name}`
        : action.label
  return {
    state: {
      ...state,
      skills: result.skills,
      inventory: result.inventory,
      gold: result.gold,
      classXp: result.classXp,
      combat: result.fight,
      questProgress,
      activeAction: {
        ...action,
        label: dungeonLabel,
        monsterId: result.fight.monsterId,
        progressMs: result.fight.phase === 'rest' ? result.fight.restProgressMs : result.fight.playerProgressMs,
        baseIntervalMs: result.fight.phase === 'rest' ? RESPAWN_MS : result.fight.playerIntervalMs,
      },
    },
    log,
  }
}
