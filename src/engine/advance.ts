import { getActivity, type ActivityDef } from '../data/activities'
import type { ItemStack } from '../data/activities/types'
import type { ClassId } from '../data/classes'
import {
  getItem,
  qualityKindOf,
  qualityOf,
  reagentSaveChance,
  stampsQualityItem,
  withQuality,
  type ItemQuality,
} from '../data/items'
import { getLair } from '../data/lairs'
import { getMonster } from '../data/monsters'
import { intervalBonus } from '../data/shop'
import { getSkill, SKILLS, type TradeSkillId } from '../data/skills'
import { isSpellId, type SpellId } from '../data/spells'
import type { AbilityAbbr, SkillProgress } from '../types/game'
import { activePerks, deriveAbilities, effectTotal } from './abilities'
import {
  advanceCombat,
  type CombatAction,
  type CombatFight,
} from './combat'
import { GATHER_YIELD_MULTIPLIER, OFFLINE_CAP_MS, RESPAWN_MS } from './config'
import {
  applySkillLoadout,
  emptyEquipment,
  heavyArmorIntervalMultiplier,
  totalItemStats,
  type Equipment,
  type EquipmentSnapshot,
} from './equipment'
import {
  discountTomeInputs,
  noteYieldPct,
  tickBuffs,
  tomeSpeedBonus,
  tomeXpPct,
  type ActiveBuff,
  type Bestiaries,
  type Tomes,
} from './history'
import { intervalMs } from './interval'
import { addItems, hasItems, removalPlan, removeItems, type Inventory } from './inventory'
import { rollGold, rollLoot, scaleQuantity } from './loot'
import { applyNoticeEvents, type NoticeBoard } from './noticeBoard'
import type { Rng } from './rng'
import { applyEvents, syncLevels, type QuestProgress } from './quest'
import {
  activityBonusParts,
  activityRollMode,
  checkDc,
  checkPassed,
  skillCheck,
  type QualityTier,
  type SkillCheckResult,
} from './skillCheck'
import type { ActiveContract, BountyBoard } from './bounties'
import {
  grantFavor,
  renownGain,
} from './social'
import { echoXpFraction } from './multiclass'
import { canInscribe } from './spells'
import { addXp, applyXpModifiers, levelForXp } from './xp'

export type { CombatAction, CombatFight } from './combat'

export interface SkillAction {
  kind: 'skill'
  skillId: TradeSkillId
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
  skills: Record<TradeSkillId, SkillProgress>
  inventory: Inventory
  gold: number
  activeAction: ActiveAction | null
  /** Missing means empty; keeps older advance tests valid. */
  equipment?: Equipment
  skillLoadouts?: Partial<Record<TradeSkillId | 'combat', EquipmentSnapshot>>
  /** Missing means none; shop interval upgrades. */
  upgrades?: Record<string, number>
  classId?: ClassId | null
  secondaryClassId?: ClassId | null
  /** Spells learned by inscribing scrolls. */
  knownSpells?: SpellId[]
  classXp?: number
  secondaryClassXp?: number
  echoes?: number
  hasSecondary?: boolean
  combat?: CombatFight | null
  /** Set when a hunt ends in defeat during this advance call. */
  lastDefeat?: boolean
  /** Kills credited when a hunt ends during this advance call. */
  endedHuntKills?: number
  questProgress?: QuestProgress
  noticeBoard?: NoticeBoard
  /** Cleared when leaving a dungeon/quest run. */
  isInDungeonOrQuest?: boolean
  /** Quest id completed this tick (combat or dungeon step). */
  questStepComplete?: string | null
  /** Missing means on. */
  stopWhenOutOfFood?: boolean
  tomes?: Tomes
  bestiaries?: Bestiaries
  activeBuffs?: ActiveBuff[]
  favor?: number
  renown?: number
  marks?: number
  marksLifetime?: number
  contracts?: ActiveContract[]
  ownedTitles?: string[]
  equippedTitleId?: string | null
  bountyBoard?: BountyBoard
}

export interface SkillEvent {
  kind: 'skill'
  skillId: TradeSkillId
  activityId: string
  label: string
  roll: number
  total: number
  dc: number
  tier: QualityTier
  xp: number
  items: ItemGain[]
  gold: number
}

export interface MaterialsEvent {
  kind: 'materials'
  skillId: TradeSkillId
  activityId: string
  label: string
}

export interface CombatLogEvent {
  kind: 'combat'
  lines: string[]
}

export interface KillEvent {
  kind: 'kill'
  monsterId: string
  creatureType: string
}

export interface LevelUpEvent {
  kind: 'levelUp'
  skillId: TradeSkillId | 'class'
  level: number
}

export interface DungeonClearEvent {
  kind: 'dungeonClear'
  dungeonId: string
}

export type GameEvent =
  | SkillEvent
  | MaterialsEvent
  | CombatLogEvent
  | KillEvent
  | LevelUpEvent
  | DungeonClearEvent

function applyQuestSideEffects(
  state: AdvanceState,
  log: GameEvent[],
): { questProgress?: QuestProgress; noticeBoard?: NoticeBoard } {
  if (!state.questProgress && !state.noticeBoard) {
    return { questProgress: state.questProgress, noticeBoard: state.noticeBoard }
  }
  let questProgress = state.questProgress
  if (questProgress) {
    questProgress = applyEvents(questProgress, log).progress
    questProgress = syncLevels(questProgress, state.skills, state.classXp ?? 0)
  }
  let noticeBoard = state.noticeBoard
  if (noticeBoard) noticeBoard = applyNoticeEvents(noticeBoard, log)
  return { questProgress, noticeBoard }
}

export interface SkillGain {
  skillId: TradeSkillId
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
  favor: number
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
  beforeSkills: Record<TradeSkillId, SkillProgress>,
  afterSkills: Record<TradeSkillId, SkillProgress>,
  beforeItems: Inventory,
  afterItems: Inventory,
  beforeGold = 0,
  afterGold = 0,
  beforeClassXp = 0,
  afterClassXp = 0,
  kills = 0,
  defeated = false,
  beforeFavor = 0,
  afterFavor = 0,
): {
  skills: SkillGain[]
  items: ItemGain[]
  gold: number
  favor: number
  classXp: number
  kills: number
  defeated: boolean
} {
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
    favor: Math.max(0, afterFavor - beforeFavor),
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

function enchantQuality(activity: ActivityDef, taken: ItemStack[]): ItemQuality | null {
  if (activity.skillId !== 'enchanting') return null
  for (const stack of taken) {
    const kind = qualityKindOf(getItem(stack.itemId))
    if (kind === 'gear-weapon' || kind === 'gear-armor' || kind === 'jewelry' || kind === 'skilling-gear') {
      return qualityOf(stack.itemId)
    }
  }
  return null
}

function stampOutput(
  stack: ItemStack,
  activity: ActivityDef,
  tier: QualityTier,
  preserved: ItemQuality | null,
  rng: Rng,
): ItemStack {
  if (preserved) return { ...stack, itemId: withQuality(stack.itemId, preserved) }
  if (stampsQualityItem(Boolean(activity.inputs?.length), getItem(stack.itemId))) {
    const quality: ItemQuality =
      tier === 'fine' || tier === 'masterwork' || tier === 'exceptional' ? tier : 'standard'
    return { ...stack, itemId: withQuality(stack.itemId, quality) }
  }
  return { ...stack, quantity: scaleQuantity(stack.quantity, GATHER_YIELD_MULTIPLIER[tier], rng) }
}

export function onActivityComplete(
  state: AdvanceState,
  action: SkillAction,
  check: SkillCheckResult,
  rng: Rng,
  pageDiscount = 0,
): AdvanceState {
  const activity = getActivity(action.skillId, action.activityId)
  if (!activity) return state
  const inputs = activity.inputs?.length
    ? discountTomeInputs(activity.id, activity.inputs, pageDiscount).filter((stack) => stack.quantity > 0)
    : []
  if (inputs.length && !hasItems(state.inventory, inputs)) return state

  // TODO(design): confirm inputs are spent on failures and fumbles.
  const planned = inputs.length ? removalPlan(state.inventory, inputs) : []
  if (inputs.length && !planned) return state
  let inventory = planned ? removeItems(state.inventory, inputs) : state.inventory
  const preserved = enchantQuality(activity, planned ?? [])
  if (planned) {
    for (const stack of planned) {
      const save = reagentSaveChance(stack.itemId)
      if (save > 0 && rng() < save) inventory = addItems(inventory, [stack])
    }
  }
  const passed = checkPassed(check.tier)
  let stacks = passed
    ? [
        ...rollLoot(activity.outputs, rng, 1).map((stack) => stampOutput(stack, activity, check.tier, preserved, rng)),
        ...(check.rareRoll
          ? rollLoot(activity.rareTable, rng, 1).map((stack) => stampOutput(stack, activity, check.tier, preserved, rng))
          : []),
      ]
    : []
  if (check.byproduct) stacks = [...stacks, ...rollLoot(activity.byproducts, rng, 1)]
  const yieldMult = GATHER_YIELD_MULTIPLIER[check.tier]
  let goldGain = passed ? scaleQuantity(rollGold(activity.gold, rng, 1), yieldMult, rng) : 0
  const favorGain = passed ? scaleQuantity(rollGold(activity.favor, rng, 1), yieldMult, rng) : 0
  const ability = getSkill(action.skillId).ability
  const perks = activePerks(state)
  const yieldPct =
    effectTotal(perks, 'skillYieldPct', ability) + noteYieldPct(state.activeBuffs, action.activityId)
  if (yieldPct > 0) {
    // One extra draw after loot/gold so scripted skill-check RNG stays aligned.
    const roll = rng()
    stacks = stacks.map((stack) => {
      const scaled = stack.quantity * (1 + yieldPct)
      const whole = Math.floor(scaled)
      const frac = scaled - whole
      return { ...stack, quantity: whole + (roll < frac ? 1 : 0) }
    })
  }
  const goldPct = effectTotal(perks, 'skillGoldPct', ability)
  if (goldPct > 0 && goldGain > 0) {
    goldGain = Math.floor(goldGain * (1 + goldPct))
  }
  const favorPct = effectTotal(perks, 'favorPct')
  inventory = addItems(inventory, stacks)
  const favor = grantFavor(state.favor ?? 0, favorGain, favorPct)
  let knownSpells = state.knownSpells
  if (passed && activity.learnSpell && isSpellId(activity.learnSpell)) {
    const gate = canInscribe({
      spellId: activity.learnSpell,
      scribingLevel: levelForXp(state.skills.scribing?.xp ?? 0),
      classId: state.classId,
      secondaryClassId: state.secondaryClassId,
      known: knownSpells,
      mode: 'learn',
    })
    if (gate.ok) knownSpells = [...(knownSpells ?? []), activity.learnSpell]
  }
  const isVenue =
    action.skillId === 'performance' &&
    !action.activityId.startsWith('craft-') &&
    passed
  const renown = isVenue ? renownGain(state.renown ?? 0, 1) : (state.renown ?? 0)
  return { ...state, inventory, gold: state.gold + goldGain, favor, renown, knownSpells }
}

export function activityIntervalMs(
  skillId: TradeSkillId,
  baseIntervalMs: number,
  skills: Record<TradeSkillId, SkillProgress>,
  equipment: Equipment = emptyEquipment(),
  otherSpeedBonus = 0,
): number {
  const abilities = deriveAbilities(skills)
  const dex = abilities.find((ability) => ability.abbr === 'DEX')?.modifier ?? 0
  const str = abilities.find((ability) => ability.abbr === 'STR')?.score ?? 10
  const ability = SKILLS.find((skill) => skill.id === skillId)?.ability
  const base = intervalMs(baseIntervalMs, dex, otherSpeedBonus, ability === 'STR' || ability === 'DEX')
  return base * heavyArmorIntervalMultiplier(equipment, str)
}

export function actionIntervalMs(
  action: ActiveAction,
  skills: Record<TradeSkillId, SkillProgress>,
  equipment: Equipment = emptyEquipment(),
  combat?: CombatFight | null,
  otherSpeedBonus = 0,
): number {
  if (action.kind === 'combat') {
    if (combat?.phase === 'rest') return RESPAWN_MS
    if (combat && combat.playerIntervalMs > 0) return combat.playerIntervalMs
    const abilities = deriveAbilities(skills)
    const dex = abilities.find((ability) => ability.abbr === 'DEX')?.modifier ?? 0
    const str = abilities.find((ability) => ability.abbr === 'STR')?.score ?? 10
    return intervalMs(action.baseIntervalMs, dex, 0, true) * heavyArmorIntervalMultiplier(equipment, str)
  }
  return activityIntervalMs(action.skillId, action.baseIntervalMs, skills, equipment, otherSpeedBonus)
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
  let favor = state.favor ?? 0
  let renown = state.renown ?? 0
  let knownSpells = state.knownSpells
  let activeBuffs = state.activeBuffs ?? []
  let equipment = state.equipment ?? emptyEquipment()
  if (current.progressMs === 0) {
    const applied = applySkillLoadout(
      equipment,
      inventory,
      state.skillLoadouts?.[current.skillId],
    )
    equipment = applied.equipment
    inventory = applied.inventory
  }
  const tomes = state.tomes
  const pageDiscount = effectTotal(activePerks(state), 'historyTomePages')
  let action: ActiveAction | null = current
  let progress = current.progressMs
  let remaining = elapsedMs
  const log: GameEvent[] = []

  while (action?.kind === 'skill' && remaining > 0) {
    const acting = action
    const activity = getActivity(acting.skillId, acting.activityId)
    const craftInputs = activity?.inputs?.length
      ? discountTomeInputs(activity.id, activity.inputs, pageDiscount).filter((stack) => stack.quantity > 0)
      : []
    if (craftInputs.length && !hasItems(inventory, craftInputs)) {
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

    const gearStats = totalItemStats(equipment)
    const speed =
      intervalBonus(state.upgrades ?? {}, acting.activityId) +
      tomeSpeedBonus(tomes, acting.skillId) +
      (gearStats.skillSpeedPct[acting.skillId] ?? 0) / 100
    const interval = activityIntervalMs(acting.skillId, acting.baseIntervalMs, skills, equipment, speed)
    if (!Number.isFinite(interval) || interval <= 0) break

    const need = Math.max(0, interval - progress)
    if (remaining < need) {
      progress += remaining
      activeBuffs = tickBuffs(activeBuffs, remaining)
      remaining = 0
      break
    }

    remaining -= need
    progress = 0
    const checkState = { skills, equipment, tomes, activeBuffs }
    const check = skillCheck({
      rng,
      mode: activityRollMode(checkState, skill.id),
      dc: checkDc(acting.requiredLevel),
      parts: activityBonusParts(checkState, skill.id),
    })
    const xp = applyXpModifiers(
      acting.baseXp * check.xpMultiplier,
      skill.ability,
      modifiers,
      tomeXpPct(tomes, skill.id) +
        echoXpFraction(state.echoes ?? 0) +
        (gearStats.skillXpPct[acting.skillId] ?? 0) / 100,
    )
    const beforeLevel = levelForXp(skills[skill.id].xp)
    skills = { ...skills, [skill.id]: { xp: addXp(skills[skill.id].xp, xp) } }
    const afterLevel = levelForXp(skills[skill.id].xp)
    const beforeItems = inventory
    const beforeGold = gold
    const next = onActivityComplete(
      {
        skills,
        inventory,
        gold,
        favor,
        renown,
        knownSpells,
        classId: state.classId,
        secondaryClassId: state.secondaryClassId,
        activeAction: { ...acting, progressMs: 0 },
        equipment,
        activeBuffs,
      },
      acting,
      check,
      rng,
      pageDiscount,
    )
    skills = next.skills
    inventory = next.inventory
    gold = next.gold
    favor = next.favor ?? favor
    renown = next.renown ?? renown
    knownSpells = next.knownSpells
    action = next.activeAction
    activeBuffs = tickBuffs(activeBuffs, need)
    log.push({
      kind: 'skill',
      skillId: skill.id,
      activityId: acting.activityId,
      label: acting.label,
      roll: check.roll,
      total: check.total,
      dc: check.dc,
      tier: check.tier,
      xp,
      items: gainedItems(beforeItems, inventory),
      gold: Math.max(0, gold - beforeGold),
    })
    if (afterLevel > beforeLevel) {
      log.push({ kind: 'levelUp', skillId: skill.id, level: afterLevel })
    }
  }

  const nextState: AdvanceState = {
    ...state,
    skills,
    inventory,
    gold,
    favor,
    renown,
    knownSpells,
    equipment,
    activeBuffs,
    activeAction: action?.kind === 'skill' ? { ...action, progressMs: progress } : action,
  }
  const quested = applyQuestSideEffects(nextState, log)
  return {
    state: { ...nextState, ...quested },
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

  let equipment = state.equipment ?? emptyEquipment()
  let inventory = state.inventory
  if (action.progressMs === 0) {
    const applied = applySkillLoadout(equipment, inventory, state.skillLoadouts?.combat)
    equipment = applied.equipment
    inventory = applied.inventory
  }

  const beforeLogLen = fight.log.length
  const result = advanceCombat({
    fight,
    skills: state.skills,
    inventory,
    gold: state.gold,
    favor: state.favor,
    contracts: state.contracts,
    equipment,
    activeClassId: classId,
    classXp,
    secondaryClassXp: state.secondaryClassXp,
    echoes: state.echoes,
    hasSecondary: state.hasSecondary,
    elapsedMs,
    rng,
    trace,
    modifiers,
    stopWhenOutOfFood: state.stopWhenOutOfFood,
    bestiaries: state.bestiaries,
    tomes: state.tomes,
    activeBuffs: state.activeBuffs,
  })

  const log: GameEvent[] = []
  if (trace) {
    const newLines = result.lastLog.slice(beforeLogLen)
    if (newLines.length) log.push({ kind: 'combat', lines: newLines })
  }

  for (const monsterId of result.killsThisTick ?? []) {
    const killed = getMonster(monsterId)
    if (killed) {
      log.push({ kind: 'kill', monsterId, creatureType: killed.creatureType })
    }
  }
  if (result.dungeonCleared) {
    log.push({ kind: 'dungeonClear', dungeonId: result.dungeonCleared })
  }
  const beforeClassLevel = levelForXp(state.classXp ?? 0)
  const afterClassLevel = levelForXp(result.classXp)
  if (afterClassLevel > beforeClassLevel) {
    log.push({ kind: 'levelUp', skillId: 'class', level: afterClassLevel })
  }

  const activeBuffs = tickBuffs(state.activeBuffs, elapsedMs)

  if (result.stop || !result.fight) {
    const nextState: AdvanceState = {
      ...state,
      skills: result.skills,
      inventory: result.inventory,
      gold: result.gold,
      favor: result.favor ?? state.favor,
      contracts: result.contracts ?? state.contracts,
      marks: (state.marks ?? 0) + (result.marksGained ?? 0),
      marksLifetime: (state.marksLifetime ?? 0) + (result.marksGained ?? 0),
      ownedTitles: mergeTitles(state.ownedTitles, result.titlesGained),
      equippedTitleId: state.equippedTitleId ?? result.titlesGained?.[0] ?? null,
      bountyBoard: result.baitGained
        ? { ...(state.bountyBoard ?? { refreshedAt: 0, offers: [], baitBiome: null, baitCharges: 0 }), baitCharges: (state.bountyBoard?.baitCharges ?? 0) + 1 }
        : state.bountyBoard,
      classXp: result.classXp,
      secondaryClassXp: result.secondaryClassXp ?? state.secondaryClassXp,
      equipment,
      activeBuffs,
      activeAction: null,
      combat: null,
      lastDefeat: result.defeated,
      endedHuntKills: result.kills,
      isInDungeonOrQuest: result.leftDungeonOrQuest ? false : state.isInDungeonOrQuest,
      questStepComplete: result.questStepComplete ?? null,
    }
    const quested = applyQuestSideEffects(nextState, log)
    return { state: { ...nextState, ...quested }, log }
  }

  const monster = getMonster(result.fight.monsterId)
  const foe = result.fight.displayName ?? monster?.name ?? '…'
  const dungeonLabel =
    result.fight.dungeonId != null
      ? `Dungeon · ${monster?.name ?? '…'}`
      : result.fight.kind === 'lair'
        ? (result.fight.lairId ? getLair(result.fight.lairId)?.name : null) ?? foe
        : `Hunting ${foe}`
  const nextState: AdvanceState = {
    ...state,
    skills: result.skills,
    inventory: result.inventory,
    gold: result.gold,
    favor: result.favor ?? state.favor,
    contracts: result.contracts ?? state.contracts,
    marks: (state.marks ?? 0) + (result.marksGained ?? 0),
    marksLifetime: (state.marksLifetime ?? 0) + (result.marksGained ?? 0),
    ownedTitles: mergeTitles(state.ownedTitles, result.titlesGained),
    equippedTitleId: state.equippedTitleId ?? result.titlesGained?.[0] ?? null,
    bountyBoard: result.baitGained
      ? {
          ...(state.bountyBoard ?? { refreshedAt: 0, offers: [], baitBiome: null, baitCharges: 0 }),
          baitCharges: (state.bountyBoard?.baitCharges ?? 0) + 1,
        }
      : state.bountyBoard,
    classXp: result.classXp,
    secondaryClassXp: result.secondaryClassXp ?? state.secondaryClassXp,
    equipment,
    combat: result.fight,
    activeBuffs,
    activeAction: {
      ...action,
      label: dungeonLabel,
      monsterId: result.fight.monsterId,
      progressMs: result.fight.phase === 'rest' ? result.fight.restProgressMs : result.fight.playerProgressMs,
      baseIntervalMs: result.fight.phase === 'rest' ? RESPAWN_MS : result.fight.playerIntervalMs,
    },
  }
  const quested = applyQuestSideEffects(nextState, log)
  return { state: { ...nextState, ...quested }, log }
}

function mergeTitles(owned: string[] | undefined, gained: string[] | undefined): string[] {
  const next = [...(owned ?? [])]
  for (const id of gained ?? []) if (!next.includes(id)) next.push(id)
  return next
}
