import { expect, test } from 'vitest'
import { CLASSES, getClass } from '../data/classes'
import { initialSkillProgress } from '../data/skills'
import { xpForLevel } from './xp'
import {
  buyMulticlass,
  canMulticlass,
  echoXpFraction,
  multiclassGaps,
  multiclassRequirements,
  rebirth,
  rebirthCost,
  secondarySignatureUnlocked,
  splitCombatXp,
} from './multiclass'
import { createFight } from './combat'
import { emptyEquipment } from './equipment'
import {
  ECHO_XP_PCT,
  MULTICLASS_RANK_REQ,
  MULTICLASS_XP_MOD_MIN,
  MULTICLASS_XP_SHARE,
  REBIRTH_COST_MULT,
  SECONDARY_SIGNATURE_LEVEL,
} from './config'
import { applyXpModifiers } from './xp'
import { createInitialSave } from '../store/migrate'

function ranksAt(rank: number) {
  // One skill per ability carries Rank N (total XP = xp for level (N-1)*5+1).
  const skills = initialSkillProgress()
  const level = (rank - 1) * 5 + 1
  const xp = xpForLevel(level)
  skills.athletics = { xp }
  skills.acrobatics = { xp }
  skills.vitality = { xp }
  skills.arcana = { xp }
  skills.insight = { xp }
  skills.persuasion = { xp }
  return skills
}

test('multiclassRequirements derive from xpModifiers >= 0.15', () => {
  for (const entry of CLASSES) {
    const expected = (Object.keys(entry.xpModifiers) as (keyof typeof entry.xpModifiers)[]).filter(
      (abbr) => (entry.xpModifiers[abbr] ?? 0) >= MULTICLASS_XP_MOD_MIN,
    )
    expect(multiclassRequirements(entry.id).sort()).toEqual([...expected].sort())
  }
  expect(multiclassRequirements('bard').sort()).toEqual(['CHA', 'DEX'])
  expect(multiclassRequirements('fighter')).toEqual(['STR'])
  // Cleric focusBonus is not a multiclass gate
  expect(multiclassRequirements('cleric')).toEqual(['WIS'])
})

test('ineligible multiclass purchases are blocked', () => {
  const low = ranksAt(6)
  const base = {
    ...createInitialSave(),
    classId: 'barbarian' as const,
    classXp: xpForLevel(20),
    gold: 999_999,
    inventory: {
      'warding-chalk': 99,
      'troll-blood-tonic': 99,
      'fireball-reagent': 99,
    },
    skills: low,
  }
  expect(multiclassGaps('bard', low).length).toBeGreaterThan(0)
  expect(buyMulticlass(base, 'bard')).toBe(base)

  const high = ranksAt(MULTICLASS_RANK_REQ)
  const ready = { ...base, skills: high }
  expect(canMulticlass({
    primaryClassId: 'barbarian',
    secondaryClassId: null,
    targetClassId: 'bard',
    skills: high,
    isInDungeonOrQuest: false,
  })).toBe(true)

  const bought = buyMulticlass(ready, 'bard')
  expect(bought.secondaryClassId).toBe('bard')
  expect(bought.secondaryClassXp).toBe(0)
  expect(bought.gold).toBeLessThan(ready.gold)

  expect(buyMulticlass(bought, 'wizard')).toEqual(bought)
  expect(buyMulticlass(ready, 'barbarian')).toEqual(ready)

  const inDungeon = { ...ready, isInDungeonOrQuest: true }
  expect(buyMulticlass(inDungeon, 'bard')).toEqual(inDungeon)
})

test('combat XP share is 25% and Echo stacks', () => {
  const none = splitCombatXp(100, 0, true)
  expect(none.primary).toBe(100)
  expect(none.secondary).toBe(100 * MULTICLASS_XP_SHARE)

  const one = splitCombatXp(100, 1, true)
  expect(one.primary).toBe(100 * (1 + ECHO_XP_PCT / 100))
  expect(one.secondary).toBe(one.primary * MULTICLASS_XP_SHARE)

  expect(echoXpFraction(1)).toBe(ECHO_XP_PCT / 100)
  expect(applyXpModifiers(100, 'STR', {}, echoXpFraction(1))).toBeCloseTo(102)
})

test('secondary signature unlocks at level 5 and runs onFightStart', () => {
  expect(secondarySignatureUnlocked(xpForLevel(SECONDARY_SIGNATURE_LEVEL - 1))).toBe(false)
  expect(secondarySignatureUnlocked(xpForLevel(SECONDARY_SIGNATURE_LEVEL))).toBe(true)

  const skills = initialSkillProgress()
  const locked = createFight({
    monsterId: 'wolf',
    biome: 'forest',
    skills,
    equipment: emptyEquipment(),
    activeClassId: 'barbarian',
    classXp: 0,
    rng: () => 0.5,
    secondaryClassId: 'bard',
    secondaryClassXp: xpForLevel(4),
  })
  expect(locked?.secondarySignatureId).toBeNull()

  const unlocked = createFight({
    monsterId: 'wolf',
    biome: 'forest',
    skills,
    equipment: emptyEquipment(),
    activeClassId: 'barbarian',
    classXp: 0,
    rng: () => 0.5,
    secondaryClassId: 'bard',
    secondaryClassXp: xpForLevel(5),
  })
  expect(unlocked?.secondarySignatureId).toBe(getClass('bard').signatureAbility.id)
  expect(unlocked?.signature.id).toBe('rage')
  // Bardic onFightStart sets uses from CHA mod (0 at score 10) → max(1, 0) = 1
  expect(unlocked?.signature.bardicUses).toBe(1)
})

test('rebirth resets class level, clears secondary, adds Echo, and scales cost', () => {
  const skills = ranksAt(10)
  const inventory = {
    'warding-chalk': 99,
    'troll-blood-tonic': 99,
    'ghoul-ichor': 99,
    'spider-silk': 99,
  }
  const base = {
    ...createInitialSave(),
    classId: 'barbarian' as const,
    classXp: xpForLevel(42),
    secondaryClassId: 'bard' as const,
    secondaryClassXp: xpForLevel(7),
    echoes: 0,
    gold: 999_999,
    inventory,
    skills,
    upgrades: { pickaxe: 0 },
    tomes: { ...createInitialSave().tomes, athletics: 3 },
    questProgress: createInitialSave().questProgress,
  }

  const firstCost = rebirthCost(0)
  const secondCost = rebirthCost(1)
  expect(secondCost.gold).toBe(firstCost.gold * REBIRTH_COST_MULT)

  const next = rebirth(base, 'wizard') as typeof base
  expect(next.classId).toBe('wizard')
  expect(next.classXp).toBe(0)
  expect(next.secondaryClassId).toBeNull()
  expect(next.secondaryClassXp).toBe(0)
  expect(next.echoes).toBe(1)
  expect(next.skills).toEqual(skills)
  expect(next.upgrades).toEqual(base.upgrades)
  expect(next.tomes.athletics).toBe(3)
  expect(next.questProgress).toEqual(base.questProgress)
  expect(next.gold).toBeLessThan(base.gold)

  const blocked = { ...base, isInDungeonOrQuest: true }
  expect(rebirth(blocked, 'wizard')).toEqual(blocked)
})
