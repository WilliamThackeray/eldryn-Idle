import { expect, test } from 'vitest'
import { getActivity } from '../data/activities'
import { getQuest } from '../data/quests'
import { initialSkillProgress } from '../data/skills'
import { advance } from './advance'
import {
  applyEvents,
  emptyQuestRun,
  getRun,
  resolvePendingCheck,
  rollCheck,
  stagesFor,
  turnInQuest,
  visibleApproaches,
} from './quest'
import { xpForLevel } from './xp'

function runWith(overrides: Partial<ReturnType<typeof emptyQuestRun>> = {}) {
  return { ...emptyQuestRun(), ...overrides }
}

test('applyEvents counts wolf kills and ignores other monsters', () => {
  const progress = {
    'wolves-at-the-edge': runWith({ counts: [0, 0] }),
  }
  const next = applyEvents(progress, [
    { kind: 'kill', monsterId: 'wolf', creatureType: 'beast' },
    { kind: 'kill', monsterId: 'deer', creatureType: 'beast' },
    { kind: 'kill', monsterId: 'wolf', creatureType: 'beast' },
  ]).progress
  expect(getRun(next, 'wolves-at-the-edge')!.counts[0]).toBe(2)
})

test('applyEvents counts craft successes and ignores fails', () => {
  const progress = {
    'wolves-at-the-edge': runWith({
      inserts: [{ at: 0, stages: [{ objectives: [{ type: 'craft', activityId: 'cook-meat', qty: 3 }] }] }],
      counts: [],
    }),
  }
  const next = applyEvents(progress, [
    {
      kind: 'skill',
      skillId: 'cooking',
      activityId: 'cook-meat',
      label: 'Cook Meat',
      roll: 15,
      total: 18,
      dc: 10,
      outcome: 'success',
      xp: 10,
      items: [],
      gold: 0,
    },
    {
      kind: 'skill',
      skillId: 'cooking',
      activityId: 'cook-meat',
      label: 'Cook Meat',
      roll: 1,
      total: 4,
      dc: 10,
      outcome: 'fail',
      xp: 0,
      items: [],
      gold: 0,
    },
  ]).progress
  expect(getRun(next, 'wolves-at-the-edge')!.counts[0]).toBe(1)
})

test('applyEvents records investigation level and dungeon clear', () => {
  const progress = {
    'the-marker-that-wasnt': runWith({ counts: [0, 0] }),
    'into-the-thicket': runWith({ counts: [0] }),
  }
  const next = applyEvents(progress, [
    { kind: 'levelUp', skillId: 'mining', level: 5 },
    { kind: 'dungeonClear', dungeonId: 'shifting-thicket' },
  ]).progress
  expect(getRun(next, 'the-marker-that-wasnt')!.counts[0]).toBe(5)
  expect(getRun(next, 'into-the-thicket')!.counts[0]).toBe(1)
})

test('advance offline skill actions bump craft objectives', () => {
  const activity = getActivity('cooking', 'cook-meat')!
  const result = advance(
    {
      skills: initialSkillProgress(),
      inventory: { 'raw-meat': 20 },
      gold: 0,
      activeAction: {
        kind: 'skill',
        skillId: 'cooking',
        activityId: 'cook-meat',
        label: activity.name,
        baseIntervalMs: activity.baseIntervalMs,
        requiredLevel: activity.requiredLevel,
        baseXp: activity.xp,
        progressMs: 0,
      },
      questProgress: {
        'wolves-at-the-edge': runWith({
          inserts: [
            { at: 0, stages: [{ objectives: [{ type: 'craft', activityId: 'cook-meat', qty: 5 }] }] },
          ],
        }),
      },
    },
    activity.baseIntervalMs * 3,
    () => 0.99,
  )
  expect(getRun(result.state.questProgress!, 'wolves-at-the-edge')!.counts[0]).toBeGreaterThanOrEqual(1)
})

test('turn-in consumes deliver items; short stack fails', () => {
  const skills = initialSkillProgress()
  const progress = { 'supper-at-the-mile-camp': runWith() }

  const short = turnInQuest(
    'supper-at-the-mile-camp',
    progress,
    { 'cooked-meat': 2 },
    skills,
    0,
    0,
    0,
  )
  expect(short.ok).toBe(false)
  expect(short.inventory['cooked-meat']).toBe(2)

  const ok = turnInQuest(
    'supper-at-the-mile-camp',
    progress,
    { 'cooked-meat': 5 },
    skills,
    0,
    0,
    0,
  )
  expect(ok.ok).toBe(true)
  expect(ok.inventory['cooked-meat']).toBeUndefined()
  expect(getRun(ok.progress, 'supper-at-the-mile-camp')!.done).toBe(true)
})

test('marker check failure inserts bandit fight; check cannot be rolled twice', () => {
  const skills = initialSkillProgress()
  let progress = { 'the-marker-that-wasnt': runWith({ stage: 1 }) }

  const fail = rollCheck(
    'the-marker-that-wasnt',
    'persuade',
    progress,
    skills,
    {},
    0,
    0,
    () => 0,
    'fighter',
    0,
  )
  expect(fail.awaitInspiration).toBe(true)
  progress = fail.progress as typeof progress

  const applied = resolvePendingCheck(
    'the-marker-that-wasnt',
    progress,
    skills,
    {},
    0,
    0,
    () => 0,
    false,
    'fighter',
    0,
  )
  expect(applied.passed).toBe(false)
  const run = getRun(applied.progress, 'the-marker-that-wasnt')!
  expect(run.rewardMod).toBe(0.5)
  expect(stagesFor(getQuest('the-marker-that-wasnt')!, run)[run.stage]).toEqual({
    objectives: [{ type: 'kill', monsterId: 'bandit', qty: 2 }],
  })

  const again = rollCheck(
    'the-marker-that-wasnt',
    'persuade',
    applied.progress,
    skills,
    {},
    0,
    0,
    () => 0.99,
    'fighter',
    0,
  )
  expect(again.ok).toBe(false)
})

test('false-papers autoPass succeeds and leaves the item', () => {
  const result = rollCheck(
    'the-marker-that-wasnt',
    'deceive',
    { 'the-marker-that-wasnt': runWith({ stage: 1 }) },
    initialSkillProgress(),
    { 'false-papers': 1 },
    0,
    0,
    () => 0,
    'fighter',
    0,
    true,
  )
  expect(result.passed).toBe(true)
  expect(result.inventory['false-papers']).toBe(1)
  expect(getRun(result.progress, 'the-marker-that-wasnt')!.done).toBe(true)
})

test('CHA Rank 10 reveals intimidate approach', () => {
  const stage = getQuest('the-marker-that-wasnt')!.stages[1]
  if (!stage || !('check' in stage)) throw new Error('expected check')
  expect(visibleApproaches(stage, initialSkillProgress()).some((a) => a.id === 'intimidate')).toBe(
    false,
  )
  const high = initialSkillProgress()
  high.commerce = { xp: xpForLevel(50) }
  high.performance = { xp: xpForLevel(50) }
  expect(visibleApproaches(stage, high).some((a) => a.id === 'intimidate')).toBe(true)
})
