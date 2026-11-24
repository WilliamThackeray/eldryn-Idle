import { getActivity } from '../data/activities'
import { getItem } from '../data/items'
import { getMonster } from '../data/monsters'
import {
  getQuest,
  type CheckApproach,
  type Objective,
  type Outcome,
  type QuestDef,
  type QuestStage,
} from '../data/quests'
import type { ClassId } from '../data/classes'
import { SKILLS, type TradeSkillId } from '../data/skills'
import type { SkillProgress } from '../types/game'
import { activePerks, hasPerkEffect } from './abilities'
import type { GameEvent } from './advance'
import { checkModifier, formatCheck } from './checks'
import { rollD20, type RollMode } from './dice'
import { hasItems, removeItems, addItems, type Inventory } from './inventory'
import type { Rng } from './rng'
import { levelForXp } from './xp'

export interface QuestRun {
  stage: number
  counts: number[]
  inserts: { at: number; stages: QuestStage[] }[]
  history: { text: string; success?: boolean }[]
  rewardMod: number
  done: boolean
  /** True after a check stage has been resolved (no second roll). */
  resolvedStages?: number[]
  /** Pending failed check awaiting inspiration reroll choice; outcome not yet applied. */
  pendingCheck?: {
    approachId: string
    prepItemId?: string
    roll: number
    total: number
    dc: number
    usedPrep: boolean
  }
}

export type QuestProgress = Record<string, QuestRun>

export function emptyQuestProgress(): QuestProgress {
  return {}
}

export function emptyQuestRun(): QuestRun {
  return {
    stage: 0,
    counts: [],
    inserts: [],
    history: [],
    rewardMod: 1,
    done: false,
    resolvedStages: [],
  }
}

export function getRun(progress: QuestProgress, questId: string): QuestRun | undefined {
  return progress[questId]
}

/** Def stages with failure inserts spliced from the end so earlier indexes stay put. */
export function stagesFor(def: QuestDef, run: QuestRun): QuestStage[] {
  const stages = [...def.stages]
  const inserts = [...run.inserts].sort((a, b) => b.at - a.at)
  for (const insert of inserts) {
    stages.splice(insert.at, 0, ...insert.stages)
  }
  return stages
}

export function currentStage(def: QuestDef, run: QuestRun): QuestStage | null {
  if (run.done) return null
  return stagesFor(def, run)[run.stage] ?? null
}

export function isQuestComplete(progress: QuestProgress, questId: string): boolean {
  return progress[questId]?.done === true
}

export function isQuestActive(progress: QuestProgress, questId: string): boolean {
  const run = progress[questId]
  return Boolean(run && !run.done)
}

export function prerequisitesMet(
  quest: QuestDef,
  input: {
    questProgress: QuestProgress
    skills: Record<TradeSkillId, SkillProgress>
    classXp: number
    inventory: Inventory
  },
): boolean {
  const prereq = quest.prerequisites
  for (const id of prereq.quests ?? []) {
    if (!isQuestComplete(input.questProgress, id)) return false
  }
  if (prereq.level) {
    const level =
      prereq.level.skillId === 'class'
        ? levelForXp(input.classXp)
        : levelForXp(input.skills[prereq.level.skillId]?.xp ?? 0)
    if (level < prereq.level.level) return false
  }
  if (prereq.items && !hasItems(input.inventory, prereq.items)) return false
  return true
}

export function acceptQuest(
  progress: QuestProgress,
  questId: string,
  input: {
    skills: Record<TradeSkillId, SkillProgress>
    classXp: number
    inventory: Inventory
  },
): { progress: QuestProgress; ok: boolean; line: string } {
  const quest = getQuest(questId)
  if (!quest) return { progress, ok: false, line: 'Unknown quest.' }
  if (progress[questId]) return { progress, ok: false, line: 'Already accepted.' }
  if (!prerequisitesMet(quest, { questProgress: progress, ...input })) {
    return { progress, ok: false, line: 'Prerequisites not met.' }
  }
  const run = emptyQuestRun()
  const next = { ...progress, [questId]: run }
  return {
    progress: syncLevels(next, input.skills, input.classXp),
    ok: true,
    line: `Accepted: ${quest.title}`,
  }
}

function objectiveNeed(obj: Objective): number {
  if (obj.type === 'reachLevel') return obj.level
  if (obj.type === 'clearDungeon') return 1
  return obj.qty
}

export function objectiveProgress(
  obj: Objective,
  count: number,
  inventory: Inventory,
  skills: Record<TradeSkillId, SkillProgress>,
  classXp: number,
): { have: number; need: number; met: boolean } {
  const need = objectiveNeed(obj)
  if (obj.type === 'have' || obj.type === 'deliver') {
    const have = inventory[obj.itemId] ?? 0
    return { have, need, met: have >= need }
  }
  if (obj.type === 'reachLevel') {
    const have =
      obj.skillId === 'class' ? levelForXp(classXp) : levelForXp(skills[obj.skillId]?.xp ?? 0)
    return { have, need, met: have >= need }
  }
  return { have: count, need, met: count >= need }
}

export function stageObjectivesMet(
  stage: QuestStage,
  counts: number[],
  inventory: Inventory,
  skills: Record<TradeSkillId, SkillProgress>,
  classXp: number,
): boolean {
  if (!('objectives' in stage)) return false
  return stage.objectives.every((obj, i) =>
    objectiveProgress(obj, counts[i] ?? 0, inventory, skills, classXp).met,
  )
}

export function canTurnIn(
  questId: string,
  progress: QuestProgress,
  inventory: Inventory,
  skills: Record<TradeSkillId, SkillProgress>,
  classXp: number,
): boolean {
  const quest = getQuest(questId)
  const run = progress[questId]
  if (!quest || !run || run.done) return false
  const stage = currentStage(quest, run)
  if (!stage || !('objectives' in stage)) return false
  return stageObjectivesMet(stage, run.counts, inventory, skills, classXp)
}

function grantRewards(
  quest: QuestDef,
  run: QuestRun,
  inventory: Inventory,
  gold: number,
  favor: number,
): { inventory: Inventory; gold: number; favor: number } {
  const mod = run.rewardMod
  let nextGold = gold
  let nextFavor = favor
  let nextInv = inventory
  if (quest.rewards.gold) nextGold += Math.floor(quest.rewards.gold * mod)
  if (quest.rewards.favor) nextFavor += quest.rewards.favor
  if (quest.rewards.items) nextInv = addItems(nextInv, quest.rewards.items)
  return { inventory: nextInv, gold: nextGold, favor: nextFavor }
}

export function turnInQuest(
  questId: string,
  progress: QuestProgress,
  inventory: Inventory,
  skills: Record<TradeSkillId, SkillProgress>,
  classXp: number,
  gold: number,
  favor: number,
): {
  progress: QuestProgress
  inventory: Inventory
  gold: number
  favor: number
  ok: boolean
  line: string
  completed: boolean
} {
  const quest = getQuest(questId)
  const run = progress[questId]
  if (!quest || !run || run.done) {
    return { progress, inventory, gold, favor, ok: false, line: 'Nothing to turn in.', completed: false }
  }
  const stage = currentStage(quest, run)
  if (!stage || !('objectives' in stage)) {
    return { progress, inventory, gold, favor, ok: false, line: 'Not ready to turn in.', completed: false }
  }
  if (!stageObjectivesMet(stage, run.counts, inventory, skills, classXp)) {
    return { progress, inventory, gold, favor, ok: false, line: 'Objectives incomplete.', completed: false }
  }

  let nextInv = inventory
  for (const obj of stage.objectives) {
    if (obj.type === 'deliver') {
      nextInv = removeItems(nextInv, [{ itemId: obj.itemId, quantity: obj.qty }])
    }
  }

  const stages = stagesFor(quest, run)
  const nextStage = run.stage + 1
  const history = [...run.history, { text: `Turned in stage ${run.stage + 1}.` }]

  if (nextStage >= stages.length) {
    const granted = grantRewards(quest, run, nextInv, gold, favor)
    return {
      progress: {
        ...progress,
        [questId]: { ...run, stage: nextStage, done: true, counts: [], history, pendingCheck: undefined },
      },
      inventory: granted.inventory,
      gold: granted.gold,
      favor: granted.favor,
      ok: true,
      line: `Completed: ${quest.title}`,
      completed: true,
    }
  }

  return {
    progress: {
      ...progress,
      [questId]: { ...run, stage: nextStage, counts: [], history, pendingCheck: undefined },
    },
    inventory: nextInv,
    gold,
    favor,
    ok: true,
    line: `Advanced: ${quest.title}`,
    completed: false,
  }
}

export function approachBonus(
  approach: CheckApproach,
  skills: Record<TradeSkillId, SkillProgress>,
  classId: ClassId | null,
  classXp: number,
  prepOn: boolean,
): { bonus: number; mode: RollMode; autoPass: boolean; label: string } {
  const mod = checkModifier({ skills, classId, classXp }, approach.checkSkillId)
  let bonus = mod.total
  let mode: RollMode = 'normal'
  let autoPass = false
  if (prepOn && approach.prep) {
    if (approach.prep.effect === 'autoPass') autoPass = true
    if (approach.prep.effect === 'advantage') mode = 'advantage'
    if (approach.prep.effect === 'plus') bonus += approach.prep.value ?? 1
  }
  return { bonus, mode, autoPass, label: formatCheck(mod) }
}

/** Share of d20 faces that beat a fixed DC (nat 1 never, nat 20 always). */
export function fixedDcSuccessChance(bonus: number, dc: number, mode: RollMode = 'normal'): number {
  let hits = 0
  for (let roll = 1; roll <= 20; roll++) {
    if (roll === 20 || (roll !== 1 && roll + bonus >= dc)) hits += 1
  }
  const p = hits / 20
  if (mode === 'advantage') return 1 - (1 - p) * (1 - p)
  if (mode === 'disadvantage') return p * p
  return p
}

export function visibleApproaches(
  stage: Extract<QuestStage, { check: unknown }>,
  skills: Record<TradeSkillId, SkillProgress>,
): CheckApproach[] {
  const extra = hasPerkEffect(activePerks({ skills }), 'extraQuestApproach')
  return stage.check.approaches.filter((a) => !a.extra || extra)
}

function applyOutcome(
  quest: QuestDef,
  run: QuestRun,
  outcome: Outcome,
  success: boolean,
  inventory: Inventory,
  gold: number,
  favor: number,
): {
  progress: QuestRun
  inventory: Inventory
  gold: number
  favor: number
  completed: boolean
} {
  let next: QuestRun = {
    ...run,
    history: [...run.history, { text: outcome.text, success }],
    pendingCheck: undefined,
    resolvedStages: [...(run.resolvedStages ?? []), run.stage],
  }
  if (outcome.rewardMod != null) next = { ...next, rewardMod: outcome.rewardMod }

  if (outcome.addStages?.length) {
    const at = run.stage + 1
    next = {
      ...next,
      inserts: [...next.inserts, { at, stages: outcome.addStages }],
      stage: at,
      counts: [],
    }
    return { progress: next, inventory, gold, favor, completed: false }
  }

  if (outcome.nextStage != null) {
    next = { ...next, stage: outcome.nextStage, counts: [] }
    return { progress: next, inventory, gold, favor, completed: false }
  }

  // Success (or failure with no insert) completes when this was the last stage.
  const stages = stagesFor(quest, next)
  if (success || !outcome.addStages) {
    const granted = grantRewards(quest, next, inventory, gold, favor)
    return {
      progress: { ...next, done: true, stage: stages.length },
      inventory: granted.inventory,
      gold: granted.gold,
      favor: granted.favor,
      completed: true,
    }
  }

  return { progress: next, inventory, gold, favor, completed: false }
}

export function rollCheck(
  questId: string,
  approachId: string,
  progress: QuestProgress,
  skills: Record<TradeSkillId, SkillProgress>,
  inventory: Inventory,
  gold: number,
  favor: number,
  rng: Rng,
  classId: ClassId | null,
  classXp: number,
  prepOn = true,
): {
  progress: QuestProgress
  inventory: Inventory
  gold: number
  favor: number
  ok: boolean
  line: string
  passed: boolean | null
  awaitInspiration: boolean
  roll?: number
  total?: number
  dc?: number
} {
  const quest = getQuest(questId)
  const run = progress[questId]
  if (!quest || !run || run.done) {
    return {
      progress,
      inventory,
      gold,
      favor,
      ok: false,
      line: 'No check.',
      passed: null,
      awaitInspiration: false,
    }
  }
  const stage = currentStage(quest, run)
  if (!stage || !('check' in stage)) {
    return {
      progress,
      inventory,
      gold,
      favor,
      ok: false,
      line: 'Not a check stage.',
      passed: null,
      awaitInspiration: false,
    }
  }
  if (run.resolvedStages?.includes(run.stage) || run.pendingCheck) {
    return {
      progress,
      inventory,
      gold,
      favor,
      ok: false,
      line: 'Check already resolved.',
      passed: null,
      awaitInspiration: false,
    }
  }

  const approach = stage.check.approaches.find((a) => a.id === approachId)
  if (!approach) {
    return {
      progress,
      inventory,
      gold,
      favor,
      ok: false,
      line: 'Unknown approach.',
      passed: null,
      awaitInspiration: false,
    }
  }
  const visible = visibleApproaches(stage, skills)
  if (!visible.some((a) => a.id === approachId)) {
    return {
      progress,
      inventory,
      gold,
      favor,
      ok: false,
      line: 'Approach locked.',
      passed: null,
      awaitInspiration: false,
    }
  }

  // Bribe: spend gold, auto-succeed.
  if (approach.goldCost != null && approach.goldCost > 0) {
    if (gold < approach.goldCost) {
      return {
        progress,
        inventory,
        gold,
        favor,
        ok: false,
        line: `Need ${approach.goldCost} gp.`,
        passed: null,
        awaitInspiration: false,
      }
    }
    const applied = applyOutcome(quest, run, stage.check.success, true, inventory, gold - approach.goldCost, favor)
    return {
      progress: { ...progress, [questId]: applied.progress },
      inventory: applied.inventory,
      gold: applied.gold,
      favor: applied.favor,
      ok: true,
      line: stage.check.success.text,
      passed: true,
      awaitInspiration: false,
    }
  }

  const usePrep =
    prepOn &&
    Boolean(approach.prep) &&
    hasItems(inventory, [{ itemId: approach.prep!.itemId, quantity: 1 }])
  const { bonus, mode, autoPass } = approachBonus(approach, skills, classId, classXp, usePrep)

  if (autoPass) {
    const applied = applyOutcome(quest, run, stage.check.success, true, inventory, gold, favor)
    return {
      progress: { ...progress, [questId]: applied.progress },
      inventory: applied.inventory,
      gold: applied.gold,
      favor: applied.favor,
      ok: true,
      line: stage.check.success.text,
      passed: true,
      awaitInspiration: false,
    }
  }

  const natural = rollD20(rng, mode)
  const total = natural + bonus
  const dc = approach.dc
  const passed = natural === 20 || (natural !== 1 && total >= dc)

  if (passed) {
    const applied = applyOutcome(quest, run, stage.check.success, true, inventory, gold, favor)
    return {
      progress: { ...progress, [questId]: applied.progress },
      inventory: applied.inventory,
      gold: applied.gold,
      favor: applied.favor,
      ok: true,
      line: `${approach.label}: ${total} vs DC ${dc} — success. ${stage.check.success.text}`,
      passed: true,
      awaitInspiration: false,
      roll: natural,
      total,
      dc,
    }
  }

  // Fail: hold for optional Inspiration reroll before applying failure.
  const pending: QuestRun = {
    ...run,
    pendingCheck: {
      approachId,
      prepItemId: usePrep ? approach.prep?.itemId : undefined,
      roll: natural,
      total,
      dc,
      usedPrep: usePrep,
    },
  }
  return {
    progress: { ...progress, [questId]: pending },
    inventory,
    gold,
    favor,
    ok: true,
    line: `${approach.label}: ${total} vs DC ${dc} — failed.`,
    passed: false,
    awaitInspiration: true,
    roll: natural,
    total,
    dc,
  }
}

/** Apply failure outcome, or reroll once with Inspiration. */
export function resolvePendingCheck(
  questId: string,
  progress: QuestProgress,
  skills: Record<TradeSkillId, SkillProgress>,
  inventory: Inventory,
  gold: number,
  favor: number,
  rng: Rng,
  useInspiration: boolean,
  classId: ClassId | null,
  classXp: number,
): {
  progress: QuestProgress
  inventory: Inventory
  gold: number
  favor: number
  ok: boolean
  line: string
  passed: boolean
} {
  const quest = getQuest(questId)
  const run = progress[questId]
  if (!quest || !run?.pendingCheck) {
    return { progress, inventory, gold, favor, ok: false, line: 'No pending check.', passed: false }
  }
  const stage = currentStage(quest, run)
  if (!stage || !('check' in stage)) {
    return { progress, inventory, gold, favor, ok: false, line: 'Not a check.', passed: false }
  }
  const approach = stage.check.approaches.find((a) => a.id === run.pendingCheck!.approachId)
  if (!approach) {
    return { progress, inventory, gold, favor, ok: false, line: 'Unknown approach.', passed: false }
  }

  let nextInv = inventory
  if (useInspiration) {
    if (!hasItems(nextInv, [{ itemId: 'inspiration', quantity: 1 }])) {
      return { progress, inventory, gold, favor, ok: false, line: 'No Inspiration.', passed: false }
    }
    nextInv = removeItems(nextInv, [{ itemId: 'inspiration', quantity: 1 }])
    const usePrep = run.pendingCheck.usedPrep
    const { bonus, mode } = approachBonus(approach, skills, classId, classXp, usePrep)
    const natural = rollD20(rng, mode)
    const total = natural + bonus
    const dc = approach.dc
    const passed = natural === 20 || (natural !== 1 && total >= dc)
    if (passed) {
      const cleared = { ...run, pendingCheck: undefined }
      const applied = applyOutcome(quest, cleared, stage.check.success, true, nextInv, gold, favor)
      return {
        progress: { ...progress, [questId]: applied.progress },
        inventory: applied.inventory,
        gold: applied.gold,
        favor: applied.favor,
        ok: true,
        line: `Inspiration: ${total} vs DC ${dc} — success. ${stage.check.success.text}`,
        passed: true,
      }
    }
  }

  const cleared = { ...run, pendingCheck: undefined }
  const applied = applyOutcome(quest, cleared, stage.check.failure, false, nextInv, gold, favor)
  return {
    progress: { ...progress, [questId]: applied.progress },
    inventory: applied.inventory,
    gold: applied.gold,
    favor: applied.favor,
    ok: true,
    line: stage.check.failure.text,
    passed: false,
  }
}

function bumpCount(counts: number[], index: number, amount = 1): number[] {
  const next = [...counts]
  while (next.length <= index) next.push(0)
  next[index] = (next[index] ?? 0) + amount
  return next
}

function applyKillToObjectives(
  objectives: Objective[],
  counts: number[],
  monsterId: string,
  creatureType: string,
): number[] {
  let next = counts
  objectives.forEach((obj, i) => {
    if (obj.type !== 'kill') return
    if ('monsterId' in obj && obj.monsterId === monsterId) {
      next = bumpCount(next, i)
    } else if ('creatureType' in obj && obj.creatureType === creatureType) {
      next = bumpCount(next, i)
    }
  })
  return next
}

export function applyEvents(
  progress: QuestProgress,
  events: GameEvent[],
): { progress: QuestProgress } {
  let next = progress

  for (const event of events) {
    if (event.kind === 'kill') {
      for (const [questId, run] of Object.entries(next)) {
        if (run.done) continue
        const quest = getQuest(questId)
        if (!quest) continue
        const stage = currentStage(quest, run)
        if (!stage || !('objectives' in stage)) continue
        const counts = applyKillToObjectives(
          stage.objectives,
          run.counts,
          event.monsterId,
          event.creatureType,
        )
        if (counts !== run.counts) next = { ...next, [questId]: { ...run, counts } }
      }
    }

    if (event.kind === 'skill') {
      if (event.tier === 'fail' || event.tier === 'fumble') continue
      const activity = getActivity(event.skillId, event.activityId)
      for (const [questId, run] of Object.entries(next)) {
        if (run.done) continue
        const quest = getQuest(questId)
        if (!quest) continue
        const stage = currentStage(quest, run)
        if (!stage || !('objectives' in stage)) continue
        let counts = run.counts
        stage.objectives.forEach((obj, i) => {
          if (obj.type !== 'gather' && obj.type !== 'craft') return
          if (obj.activityId !== event.activityId) return
          // Prefer matching activity kind when known; still count if the activity id matches.
          if (activity && obj.type === 'craft' && activity.kind !== 'craft') return
          if (activity && obj.type === 'gather' && activity.kind !== 'gather') return
          counts = bumpCount(counts, i)
        })
        if (counts !== run.counts) next = { ...next, [questId]: { ...run, counts } }
      }
    }

    if (event.kind === 'levelUp') {
      for (const [questId, run] of Object.entries(next)) {
        if (run.done) continue
        const quest = getQuest(questId)
        if (!quest) continue
        const stage = currentStage(quest, run)
        if (!stage || !('objectives' in stage)) continue
        let counts = run.counts
        stage.objectives.forEach((obj, i) => {
          if (obj.type !== 'reachLevel') return
          if (obj.skillId !== event.skillId) return
          // Store current level as the count for tracker display.
          counts = [...counts]
          while (counts.length <= i) counts.push(0)
          counts[i] = Math.max(counts[i] ?? 0, event.level)
        })
        if (counts !== run.counts) next = { ...next, [questId]: { ...run, counts } }
      }
    }

    if (event.kind === 'dungeonClear') {
      for (const [questId, run] of Object.entries(next)) {
        if (run.done) continue
        const quest = getQuest(questId)
        if (!quest) continue
        const stage = currentStage(quest, run)
        if (!stage || !('objectives' in stage)) continue
        let counts = run.counts
        stage.objectives.forEach((obj, i) => {
          if (obj.type !== 'clearDungeon') return
          if (obj.dungeonId !== event.dungeonId) return
          counts = bumpCount(counts, i)
        })
        if (counts !== run.counts) next = { ...next, [questId]: { ...run, counts } }
      }
    }
  }

  return { progress: next }
}

export function syncLevels(
  progress: QuestProgress,
  skills: Record<TradeSkillId, SkillProgress>,
  classXp: number,
): QuestProgress {
  let next = progress
  for (const [questId, run] of Object.entries(progress)) {
    if (run.done) continue
    const quest = getQuest(questId)
    if (!quest) continue
    const stage = currentStage(quest, run)
    if (!stage || !('objectives' in stage)) continue
    let counts = run.counts
    let changed = false
    stage.objectives.forEach((obj, i) => {
      if (obj.type !== 'reachLevel') return
      const have =
        obj.skillId === 'class' ? levelForXp(classXp) : levelForXp(skills[obj.skillId]?.xp ?? 0)
      counts = [...counts]
      while (counts.length <= i) counts.push(0)
      if ((counts[i] ?? 0) !== have) {
        counts[i] = have
        changed = true
      }
    })
    if (changed) next = { ...next, [questId]: { ...run, counts } }
  }
  return next
}

export function objectiveLabel(obj: Objective): string {
  if (obj.type === 'have' || obj.type === 'deliver') {
    const name = getItem(obj.itemId)?.name ?? obj.itemId
    return `${obj.type === 'deliver' ? 'Deliver' : 'Have'} ${name}`
  }
  if (obj.type === 'kill') {
    if ('monsterId' in obj) return getMonster(obj.monsterId)?.name ?? obj.monsterId
    return obj.creatureType
  }
  if (obj.type === 'gather' || obj.type === 'craft') return obj.activityId
  if (obj.type === 'reachLevel') {
    if (obj.skillId === 'class') return 'Class level'
    return SKILLS.find((s) => s.id === obj.skillId)?.name ?? obj.skillId
  }
  if (obj.type === 'clearDungeon') return obj.dungeonId
  return 'objective'
}

export function dungeonUnlocked(
  _dungeonId: string,
  requiresQuest: string | undefined,
  progress: QuestProgress,
): boolean {
  if (!requiresQuest) return true
  const run = progress[requiresQuest]
  return Boolean(run) // accepted or complete
}

export function activityUnlocked(
  requiresQuest: string | undefined,
  progress: QuestProgress,
): boolean {
  if (!requiresQuest) return true
  return isQuestComplete(progress, requiresQuest)
}
