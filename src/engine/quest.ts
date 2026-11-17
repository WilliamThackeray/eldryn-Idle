import { getQuest, type DialogueSkillId, type QuestDef, type QuestStep } from '../data/quests'
import type { ClassId } from '../data/classes'
import type { SkillId } from '../data/skills'
import type { SkillProgress } from '../types/game'
import { deriveAbilities } from './abilities'
import { hasItems, removeItems, type Inventory } from './inventory'
import type { Rng } from './rng'
import { skillCheck } from './skillCheck'
import { levelForXp } from './xp'

export interface QuestProgressEntry {
  step: number
  done: boolean
}

export type QuestProgress = Record<string, QuestProgressEntry>

export function emptyQuestProgress(): QuestProgress {
  return {}
}

export function getProgress(progress: QuestProgress, questId: string): QuestProgressEntry {
  return progress[questId] ?? { step: 0, done: false }
}

export function isQuestUnlocked(
  quest: QuestDef,
  input: {
    activeClassId: ClassId | null
    classXp: Record<ClassId, { xp: number }>
    inventory: Inventory
  },
): boolean {
  const unlock = quest.unlock
  if (unlock.type === 'item') {
    return hasItems(input.inventory, [{ itemId: unlock.itemId, quantity: 1 }])
  }
  if (unlock.classId) {
    const xp = input.classXp[unlock.classId]?.xp ?? 0
    return levelForXp(xp) >= unlock.level
  }
  if (!input.activeClassId) return false
  return levelForXp(input.classXp[input.activeClassId]?.xp ?? 0) >= unlock.level
}

export function currentStep(quest: QuestDef, progress: QuestProgress): QuestStep | null {
  const entry = getProgress(progress, quest.id)
  if (entry.done) return null
  return quest.steps[entry.step] ?? null
}

function advanceStep(progress: QuestProgress, quest: QuestDef): QuestProgress {
  const entry = getProgress(progress, quest.id)
  const nextStep = entry.step + 1
  if (nextStep >= quest.steps.length) {
    return { ...progress, [quest.id]: { step: nextStep, done: true } }
  }
  return { ...progress, [quest.id]: { step: nextStep, done: false } }
}

function modFor(skills: Record<SkillId, SkillProgress>, skillId: SkillId): number {
  const map: Partial<Record<SkillId, 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'>> = {
    persuasion: 'CHA',
    intimidation: 'CHA',
    deception: 'CHA',
    insight: 'WIS',
    investigation: 'INT',
  }
  const abbr = map[skillId] ?? 'INT'
  return deriveAbilities(skills).find((a) => a.abbr === abbr)?.modifier ?? 0
}

export function chooseDialogue(
  questId: string,
  choiceId: string,
  progress: QuestProgress,
  skills: Record<SkillId, SkillProgress>,
  rng: Rng,
): { progress: QuestProgress; ok: boolean; line: string } {
  const quest = getQuest(questId)
  if (!quest) return { progress, ok: false, line: 'Unknown quest.' }
  const step = currentStep(quest, progress)
  if (!step || step.type !== 'dialogue') {
    return { progress, ok: false, line: 'Not a dialogue step.' }
  }
  const choice = step.choices.find((c) => c.id === choiceId)
  if (!choice) return { progress, ok: false, line: 'Unknown choice.' }

  if (!choice.check) {
    return { progress: advanceStep(progress, quest), ok: true, line: choice.text }
  }

  const skillId = choice.check.skillId as SkillId
  const check = skillCheck({
    rng,
    abilityModifier: modFor(skills, skillId),
    skillLevel: levelForXp(skills[skillId]?.xp ?? 0),
    requiredLevel: choice.check.requiredLevel,
  })
  const pass = check.outcome === 'success' || check.outcome === 'critical'
  if (!pass) {
    return {
      progress,
      ok: false,
      line: `${choice.check.skillId}: ${check.total} vs DC ${check.dc} — failed.`,
    }
  }
  return {
    progress: advanceStep(progress, quest),
    ok: true,
    line: `${choice.check.skillId}: ${check.total} vs DC ${check.dc} — success.`,
  }
}

export function tryQuestSkillCheck(
  questId: string,
  progress: QuestProgress,
  skills: Record<SkillId, SkillProgress>,
  rng: Rng,
): { progress: QuestProgress; ok: boolean; line: string } {
  const quest = getQuest(questId)
  if (!quest) return { progress, ok: false, line: 'Unknown quest.' }
  const step = currentStep(quest, progress)
  if (!step || step.type !== 'skillCheck') {
    return { progress, ok: false, line: 'Not a skill-check step.' }
  }
  const check = skillCheck({
    rng,
    abilityModifier: modFor(skills, step.skillId),
    skillLevel: levelForXp(skills[step.skillId]?.xp ?? 0),
    requiredLevel: step.requiredLevel,
  })
  const pass = check.outcome === 'success' || check.outcome === 'critical'
  if (!pass) {
    return {
      progress,
      ok: false,
      line: `${step.label}: ${check.total} vs DC ${check.dc} — failed. Try again.`,
    }
  }
  return {
    progress: advanceStep(progress, quest),
    ok: true,
    line: `${step.label}: ${check.total} vs DC ${check.dc} — success.`,
  }
}

export function deliverQuestStep(
  questId: string,
  progress: QuestProgress,
  inventory: Inventory,
): { progress: QuestProgress; inventory: Inventory; ok: boolean; line: string } {
  const quest = getQuest(questId)
  if (!quest) return { progress, inventory, ok: false, line: 'Unknown quest.' }
  const step = currentStep(quest, progress)
  if (!step || step.type !== 'deliver') {
    return { progress, inventory, ok: false, line: 'Not a deliver step.' }
  }
  if (!hasItems(inventory, [{ itemId: step.itemId, quantity: step.quantity }])) {
    return { progress, inventory, ok: false, line: `Need ${step.quantity}× ${step.itemId}.` }
  }
  return {
    progress: advanceStep(progress, quest),
    inventory: removeItems(inventory, [{ itemId: step.itemId, quantity: step.quantity }]),
    ok: true,
    line: step.label,
  }
}

/** Advance after a quest combat kill or quest dungeon chest. */
export function completeQuestActionStep(
  questId: string,
  progress: QuestProgress,
  expected: 'combat' | 'dungeon',
): QuestProgress {
  const quest = getQuest(questId)
  if (!quest) return progress
  const step = currentStep(quest, progress)
  if (!step || step.type !== expected) return progress
  return advanceStep(progress, quest)
}

export type { DialogueSkillId }
