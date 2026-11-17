import { expect, test } from 'vitest'
import { initialClassProgress } from '../data/classes'
import { initialSkillProgress } from '../data/skills'
import { advance, summarizeGains, type AdvanceState } from './advance'
import {
  advanceCombat,
  createFight,
  maxHp,
  nickProc,
  type CombatFight,
} from './combat'
import type { Inventory } from './inventory'
import { applyDamageModifiers } from './damage'
import { rollDamageParts } from './dice'
import { emptyEquipment, type Equipment } from './equipment'
import { mulberry32 } from './rng'
import { xpForLevel } from './xp'

function gear(mainHand: string | null, food: string | null = null, offHand: string | null = null): Equipment {
  return { ...emptyEquipment(), mainHand, food, offHand, ammo: null }
}

function baseState(overrides: Partial<AdvanceState> = {}): AdvanceState {
  return {
    skills: initialSkillProgress(),
    inventory: { 'cooked-forest-fish': 20, shortsword: 1 },
    gold: 0,
    activeAction: null,
    equipment: gear('shortsword', 'cooked-forest-fish'),
    classes: { ...initialClassProgress(), fighter: { xp: 0 } },
    activeClassId: 'fighter',
    combat: null,
    ...overrides,
  }
}

test('maxHp matches the Barbarian tier-20 example', () => {
  expect(maxHp(12, 20, 5)).toBe(240)
})

test('crit doubles dice and adds the modifier once', () => {
  const rng = mulberry32(42)
  const normal = rollDamageParts('1d6+2', rng, false)
  // Force known dice by using flat-only for modifier check via two rolls of 1d6
  const a = rollDamageParts('1d6', mulberry32(7), false)
  const b = rollDamageParts('1d6', mulberry32(7), true)
  expect(b.dice).toBeGreaterThanOrEqual(a.dice)
  expect(b.flat).toBe(0)
  const withMod = rollDamageParts('1d6+2', mulberry32(7), true)
  expect(withMod.flat).toBe(2)
  expect(withMod.total).toBe(withMod.dice + 2)
  expect(normal.flat).toBe(2)
})

test('resistance halves and floors, vulnerability doubles, immunity zeroes', () => {
  expect(applyDamageModifiers(5, 'slashing', ['slashing'], [], [])).toBe(2)
  expect(applyDamageModifiers(5, 'slashing', [], ['slashing'], [])).toBe(10)
  expect(applyDamageModifiers(5, 'poison', [], [], ['poison'])).toBe(0)
  expect(applyDamageModifiers(5, 'slashing', ['slashing'], ['slashing'], [])).toBe(5)
})

test('Nick proc rate is 20% for seed 1 and deterministic', () => {
  const run = (seed: number) => {
    const rng = mulberry32(seed)
    let hits = 0
    const trials = 10_000
    for (let i = 0; i < trials; i++) if (nickProc(rng)) hits += 1
    return hits / trials
  }
  const rate = run(1)
  expect(rate).toBeGreaterThan(0.18)
  expect(rate).toBeLessThan(0.22)
  expect(run(1)).toBe(rate)
})

test('auto-eat triggers below 50% HP and spends the player interval', () => {
  const fight = createFight({
    monsterId: 'deer',
    biome: 'forest',
    skills: initialSkillProgress(),
    equipment: gear('shortsword', 'cooked-forest-fish'),
    activeClassId: 'fighter',
    classXp: 0,
    rng: mulberry32(1),
    trace: true,
  })
  expect(fight).toBeTruthy()
  if (!fight) return
  fight.openingDone = true
  fight.playerHp = Math.floor(fight.playerMaxHp * 0.4)
  fight.playerProgressMs = fight.playerIntervalMs
  fight.monsterProgressMs = 0

  const result = advanceCombat({
    fight,
    skills: initialSkillProgress(),
    inventory: { 'cooked-forest-fish': 3 },
    gold: 0,
    equipment: gear('shortsword', 'cooked-forest-fish'),
    activeClassId: 'fighter',
    classXp: 0,
    elapsedMs: 1,
    rng: mulberry32(2),
    trace: true,
  })
  expect(result.inventory['cooked-forest-fish']).toBe(2)
  expect(result.fight?.playerHp).toBeGreaterThan(fight.playerHp)
  expect(result.lastLog.some((line) => line.startsWith('Eat'))).toBe(true)
})

test('defeat on HP 0 clears the hunt and keeps inventory loot', () => {
  const fight = createFight({
    monsterId: 'owlbear',
    biome: 'forest',
    skills: initialSkillProgress(),
    equipment: gear('shortsword', null),
    activeClassId: 'fighter',
    classXp: 0,
    rng: mulberry32(3),
    trace: true,
  })
  expect(fight).toBeTruthy()
  if (!fight) return
  fight.openingDone = true
  fight.playerHp = 1
  fight.playerProgressMs = 0
  fight.monsterProgressMs = fight.monsterIntervalMs
  fight.lootGained = [{ id: 'raw-meat', name: 'Raw Meat', quantity: 2 }]

  const result = advanceCombat({
    fight,
    skills: initialSkillProgress(),
    inventory: { 'raw-meat': 2, shortsword: 1 },
    gold: 0,
    equipment: gear('shortsword', null),
    activeClassId: 'fighter',
    classXp: 0,
    elapsedMs: 1,
    rng: mulberry32(99),
    trace: true,
    // Force monster hit: scripted via high to-hit and low AC — use many elapsed retries
  })

  // Drive until defeat or give up
  let state = result
  let guard = 0
  while (state.fight && !state.defeated && guard < 50) {
    state = advanceCombat({
      fight: state.fight,
      skills: state.skills,
      inventory: state.inventory,
      gold: state.gold,
      equipment: gear('shortsword', null),
      activeClassId: 'fighter',
      classXp: state.classXp,
      elapsedMs: state.fight.monsterIntervalMs,
      rng: mulberry32(100 + guard),
      trace: true,
    })
    guard += 1
  }
  expect(state.stop).toBe(true)
  expect(state.fight).toBeNull()
  expect(state.inventory['raw-meat']).toBe(2)
})

test('defeat when food is required but the slot is empty', () => {
  const fight = createFight({
    monsterId: 'deer',
    biome: 'forest',
    skills: initialSkillProgress(),
    equipment: gear('shortsword', 'cooked-forest-fish'),
    activeClassId: 'fighter',
    classXp: 0,
    rng: mulberry32(4),
    trace: true,
  })
  expect(fight).toBeTruthy()
  if (!fight) return
  fight.openingDone = true
  fight.playerHp = Math.floor(fight.playerMaxHp * 0.2)
  fight.playerProgressMs = fight.playerIntervalMs

  const result = advanceCombat({
    fight,
    skills: initialSkillProgress(),
    inventory: {},
    gold: 0,
    equipment: gear('shortsword', 'cooked-forest-fish'),
    activeClassId: 'fighter',
    classXp: 0,
    elapsedMs: 1,
    rng: mulberry32(4),
    trace: true,
  })
  expect(result.defeated).toBe(true)
  expect(result.fight).toBeNull()
  expect(result.lastLog.some((line) => line.includes('No food'))).toBe(true)
})

test('killing a Deer grants class XP, loot, and enters rest', () => {
  const classXpStart = xpForLevel(2) - 10
  const fight = createFight({
    monsterId: 'deer',
    biome: 'forest',
    skills: initialSkillProgress(),
    equipment: gear('shortsword', 'cooked-forest-fish'),
    activeClassId: 'fighter',
    classXp: classXpStart,
    rng: mulberry32(5),
    trace: true,
  })
  expect(fight).toBeTruthy()
  if (!fight) return
  fight.openingDone = true
  fight.monsterHp = 1
  fight.playerProgressMs = fight.playerIntervalMs

  // Scripted hit: use a loop until kill
  let state: {
    fight: CombatFight | null
    skills: ReturnType<typeof initialSkillProgress>
    inventory: Inventory
    gold: number
    classXp: number
  } = {
    fight,
    skills: initialSkillProgress(),
    inventory: { 'cooked-forest-fish': 5 },
    gold: 0,
    classXp: classXpStart,
  }
  for (let i = 0; i < 40 && state.fight?.phase === 'fight'; i++) {
    const next = advanceCombat({
      fight: state.fight,
      skills: state.skills,
      inventory: state.inventory,
      gold: state.gold,
      equipment: gear('shortsword', 'cooked-forest-fish'),
      activeClassId: 'fighter',
      classXp: state.classXp,
      elapsedMs: state.fight.playerIntervalMs,
      rng: mulberry32(200 + i),
      trace: false,
    })
    state = {
      fight: next.fight,
      skills: next.skills,
      inventory: next.inventory,
      gold: next.gold,
      classXp: next.classXp,
    }
    if (next.fight?.phase === 'rest') break
  }
  expect(state.classXp).toBe(classXpStart + 10)
  expect(state.fight?.phase).toBe('rest')
  expect(state.fight?.kills).toBe(1)
  expect(Object.values(state.inventory).some((qty) => (qty ?? 0) > 0)).toBe(true)
})

test('offline simulation of 1 hour finishes quickly and deterministically', () => {
  const hour = 60 * 60 * 1000
  const run = (seed: number) => {
    const equipment = gear('shortsword', 'cooked-forest-fish')
    const fight = createFight({
      monsterId: 'wolf',
      biome: 'forest',
      skills: initialSkillProgress(),
      equipment,
      activeClassId: 'fighter',
      classXp: 0,
      rng: mulberry32(seed),
      trace: false,
    })
    expect(fight).toBeTruthy()
    if (!fight) throw new Error('no fight')
    const started = Date.now()
    const before = baseState({
      combat: fight,
      activeAction: {
        kind: 'combat',
        label: 'Hunting Wolf',
        monsterId: 'wolf',
        biome: 'forest',
        baseIntervalMs: 4800,
        progressMs: 0,
      },
      inventory: { 'cooked-forest-fish': 200, shortsword: 1 },
      equipment,
    })
    const result = advance(before, hour, mulberry32(seed), {}, { trace: false })
    const elapsed = Date.now() - started
    expect(elapsed).toBeLessThan(1000)
    const classXp = result.state.classes?.fighter.xp ?? 0
    const kills = result.state.combat?.kills ?? result.state.endedHuntKills ?? 0
    return {
      kills,
      classXp,
      inventory: result.state.inventory,
      gold: result.state.gold,
    }
  }

  const a = run(11)
  const b = run(11)
  expect(a).toEqual(b)
  expect(a.kills + a.classXp).toBeGreaterThan(0)

  const summary = summarizeGains(
    initialSkillProgress(),
    initialSkillProgress(),
    { 'cooked-forest-fish': 200 },
    a.inventory,
    0,
    a.gold,
    0,
    a.classXp,
    a.kills,
    false,
  )
  expect(summary.kills).toBe(a.kills)
  expect(summary.classXp).toBe(a.classXp)
})
