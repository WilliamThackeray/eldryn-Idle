import { expect, test } from 'vitest'
import { getQuest } from '../data/quests'
import { initialClassProgress } from '../data/classes'
import { initialSkillProgress } from '../data/skills'
import {
  chooseDialogue,
  completeQuestActionStep,
  currentStep,
  deliverQuestStep,
  getProgress,
  tryQuestSkillCheck,
} from './quest'
import { xpForLevel } from './xp'

const QUEST_ID = 'shattered-mile'

test('sample quest advances through dialogue, check, deliver, and action steps', () => {
  const quest = getQuest(QUEST_ID)!
  let progress = {}
  const skills = initialSkillProgress()
  skills.persuasion = { xp: xpForLevel(20) }
  skills.investigation = { xp: xpForLevel(20) }

  // Ungated choice
  let result = chooseDialogue(QUEST_ID, 'follow-anyway', progress, skills, () => 0.5)
  expect(result.ok).toBe(true)
  progress = result.progress
  expect(getProgress(progress, QUEST_ID).step).toBe(1)

  // Reset to dialogue and force Persuasion success
  progress = {}
  result = chooseDialogue(QUEST_ID, 'persuade-traveler', progress, skills, () => 0.99)
  expect(result.ok).toBe(true)
  progress = result.progress
  expect(currentStep(quest, progress)?.type).toBe('skillCheck')

  // Failed investigation retries
  const fail = tryQuestSkillCheck(QUEST_ID, progress, initialSkillProgress(), () => 0)
  expect(fail.ok).toBe(false)
  expect(getProgress(fail.progress, QUEST_ID).step).toBe(getProgress(progress, QUEST_ID).step)

  const pass = tryQuestSkillCheck(QUEST_ID, progress, skills, () => 0.99)
  expect(pass.ok).toBe(true)
  progress = pass.progress
  expect(currentStep(quest, progress)?.type).toBe('combat')

  progress = completeQuestActionStep(QUEST_ID, progress, 'combat')
  expect(currentStep(quest, progress)?.type).toBe('deliver')

  const delivered = deliverQuestStep(QUEST_ID, progress, { 'raw-meat': 1 })
  expect(delivered.ok).toBe(true)
  expect(delivered.inventory['raw-meat']).toBeUndefined()
  progress = delivered.progress
  expect(currentStep(quest, progress)?.type).toBe('dungeon')

  progress = completeQuestActionStep(QUEST_ID, progress, 'dungeon')
  expect(currentStep(quest, progress)?.type).toBe('dialogue')

  const close = chooseDialogue(QUEST_ID, 'done', progress, skills, () => 0.5)
  expect(close.ok).toBe(true)
  expect(getProgress(close.progress, QUEST_ID).done).toBe(true)
})

test('quest unlocks at class level 1', () => {
  const quest = getQuest(QUEST_ID)!
  expect(quest.unlock).toEqual({ type: 'classLevel', level: 1 })
  void initialClassProgress
})
