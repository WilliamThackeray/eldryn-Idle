import { expect, test } from 'vitest'
import { createFight } from './combat'
import { emptyEquipment } from './equipment'
import { initialSkillProgress } from '../data/skills'
import { xpForLevel } from './xp'
import { foodOutlook } from './combat/food'
import { longRest, shortRest, type RestContext } from './rest'

function baseCtx(
  overrides: Partial<RestContext> & Pick<RestContext, 'classId' | 'classTier' | 'chaMod'>,
): RestContext {
  return {
    inventory: {},
    equipment: emptyEquipment(),
    skills: initialSkillProgress(),
    modifiers: {},
    rng: () => 0.99,
    trace: false,
    stopWhenOutOfFood: true,
    ...overrides,
  }
}

test('no food: short and long rest leave HP unchanged but still recharge', () => {
  const fight = createFight({
    monsterId: 'deer',
    biome: 'forest',
    skills: initialSkillProgress(),
    equipment: emptyEquipment(),
    activeClassId: 'fighter',
    classXp: 0,
    rng: () => 0.5,
  })!
  fight.playerMaxHp = 20
  fight.playerHp = 5
  fight.signature.secondWindUsed = true
  fight.signature.actionSurgeAvailable = false

  const short = shortRest(fight, baseCtx({ classId: 'fighter', classTier: 1, chaMod: 0 }))
  expect(fight.playerHp).toBe(5)
  expect(fight.signature.secondWindUsed).toBe(false)
  expect(fight.signature.actionSurgeAvailable).toBe(true)
  expect(short.stopped).toBe(true)

  fight.playerHp = 5
  fight.signature.rageUses = 0
  const barb = createFight({
    monsterId: 'deer',
    biome: 'forest',
    skills: initialSkillProgress(),
    equipment: emptyEquipment(),
    activeClassId: 'barbarian',
    classXp: xpForLevel(5),
    rng: () => 0.5,
  })!
  barb.playerHp = 1
  barb.signature.rageUses = 0
  barb.spellSlots = [
    { level: 1, spellId: null, spent: true },
    { level: 0, spellId: null, spent: false },
  ]
  const long = longRest(barb, baseCtx({ classId: 'barbarian', classTier: 1, chaMod: 0 }))
  expect(barb.playerHp).toBe(1)
  expect(barb.signature.rageUses).toBe(2)
  expect(barb.spellSlots.every((s) => !s.spent)).toBe(true)
  expect(long.stopped).toBe(true)
})

test('shortRest eats at most 2 and skips hit die without food', () => {
  const equipment = { ...emptyEquipment(), food: 'cooked-forest-fish' as const }
  const fight = createFight({
    monsterId: 'deer',
    biome: 'forest',
    skills: initialSkillProgress(),
    equipment,
    activeClassId: 'fighter',
    classXp: 0,
    rng: () => 0.5,
  })!
  fight.playerMaxHp = 100
  fight.playerHp = 1
  // hit die: rng 0 → 1 on 1d10; CON 0 → +1 HP, then eat food (heal 5 each)
  const result = shortRest(
    fight,
    baseCtx({
      classId: 'fighter',
      classTier: 1,
      chaMod: 0,
      equipment,
      inventory: { 'cooked-forest-fish': 10 },
      rng: () => 0,
    }),
  )
  expect(result.inventory['cooked-forest-fish']).toBe(8)
  expect(fight.playerHp).toBe(1 + 1 + 5 + 5)
})

test('shortRest stops eating once full', () => {
  const equipment = { ...emptyEquipment(), food: 'cooked-meat' as const }
  const fight = createFight({
    monsterId: 'deer',
    biome: 'forest',
    skills: initialSkillProgress(),
    equipment,
    activeClassId: 'fighter',
    classXp: 0,
    rng: () => 0.5,
  })!
  fight.playerMaxHp = 20
  fight.playerHp = 18
  // hit die max (0.99 → 10) + 0 CON → +10 → full before food
  const result = shortRest(
    fight,
    baseCtx({
      classId: 'fighter',
      classTier: 1,
      chaMod: 0,
      equipment,
      inventory: { 'cooked-meat': 5 },
      rng: () => 0.99,
    }),
  )
  expect(fight.playerHp).toBe(20)
  expect(result.inventory['cooked-meat']).toBe(5)
})

test('longRest stops at full HP and stops when out of food', () => {
  const equipment = { ...emptyEquipment(), food: 'cooked-meat' as const }
  const fight = createFight({
    monsterId: 'deer',
    biome: 'forest',
    skills: initialSkillProgress(),
    equipment,
    activeClassId: 'barbarian',
    classXp: xpForLevel(5),
    rng: () => 0.5,
  })!
  fight.playerMaxHp = 30
  fight.playerHp = 20
  const full = longRest(
    fight,
    baseCtx({
      classId: 'barbarian',
      classTier: 1,
      chaMod: 0,
      equipment,
      inventory: { 'cooked-meat': 5 },
    }),
  )
  expect(fight.playerHp).toBe(30)
  // 12 heal each → one bite fills 10 deficit
  expect(full.inventory['cooked-meat']).toBe(4)
  expect(full.stopped).toBe(false)

  fight.playerHp = 1
  const empty = longRest(
    fight,
    baseCtx({
      classId: 'barbarian',
      classTier: 1,
      chaMod: 0,
      equipment,
      inventory: { 'cooked-meat': 1 },
    }),
  )
  expect(empty.inventory['cooked-meat'] ?? 0).toBe(0)
  expect(fight.playerHp).toBe(13)
  expect(empty.stopped).toBe(true)
})

test('CON rank 10 short-rest hit die keeps the higher roll', () => {
  const skills = initialSkillProgress()
  // Rank 10 needs total XP for level 46 (tier = floor((level-1)/5)+1 → level 46 = tier 10)
  const rankXp = xpForLevel(46)
  skills.vitality = { xp: rankXp }
  // Only vitality contributes; need enough for CON rank 10. abilityTotalXp sums all CON skills.
  // Rank = tier(levelForXp(totalXp)). Level 46 → tier 10.
  skills.vitality = { xp: rankXp }

  const equipment = { ...emptyEquipment(), food: 'cooked-forest-fish' as const }
  const fight = createFight({
    monsterId: 'deer',
    biome: 'forest',
    skills,
    equipment,
    activeClassId: 'fighter',
    classXp: 0,
    rng: () => 0.5,
  })!
  fight.playerMaxHp = 100
  fight.playerHp = 50

  let calls = 0
  const rng = () => {
    // First die low (0 → 1), second high (0.99 → 10) for 1d10
    const values = [0, 0.99]
    return values[calls++] ?? 0
  }
  shortRest(
    fight,
    baseCtx({
      classId: 'fighter',
      classTier: 1,
      chaMod: 0,
      equipment,
      inventory: { 'cooked-forest-fish': 0 },
      skills,
      rng,
      stopWhenOutOfFood: false,
    }),
  )
  // Need food for hit die — re-run with food but max already set; use fresh fight
  const fight2 = createFight({
    monsterId: 'deer',
    biome: 'forest',
    skills,
    equipment,
    activeClassId: 'fighter',
    classXp: 0,
    rng: () => 0.5,
  })!
  fight2.playerMaxHp = 100
  fight2.playerHp = 50
  calls = 0
  shortRest(
    fight2,
    baseCtx({
      classId: 'fighter',
      classTier: 1,
      chaMod: 0,
      equipment,
      inventory: { 'cooked-forest-fish': 1 },
      skills,
      rng,
      stopWhenOutOfFood: false,
    }),
  )
  // Higher die 10 + CON mod (rank 10 → score 15 → mod +2) = 12, then one food +5 (no perk at rank 5? rank 10 includes foodHealPct from rank 5)
  // foodHealPct 0.1 → heal 6 for forest fish 5
  const conMod = 2
  expect(fight2.playerHp).toBe(50 + 10 + conMod + Math.round(5 * 1.1))
})

test('shortRest refreshes short-rest flags and leaves rage uses alone', () => {
  const fight = createFight({
    monsterId: 'deer',
    biome: 'forest',
    skills: initialSkillProgress(),
    equipment: emptyEquipment(),
    activeClassId: 'barbarian',
    classXp: xpForLevel(5),
    rng: () => 0.5,
  })!
  fight.signature.rageUses = 1
  fight.signature.secondWindUsed = true
  fight.signature.actionSurgeAvailable = false
  fight.signature.channelDivinityUsed = true
  fight.signature.wildShapeUsed = true
  fight.signature.bardicUses = 0

  shortRest(fight, baseCtx({ classId: 'barbarian', classTier: 1, chaMod: 2, stopWhenOutOfFood: false }))
  expect(fight.signature.rageUses).toBe(1)
  expect(fight.signature.secondWindUsed).toBe(false)
  expect(fight.signature.actionSurgeAvailable).toBe(true)
  expect(fight.signature.channelDivinityUsed).toBe(false)
  expect(fight.signature.wildShapeUsed).toBe(false)
  expect(fight.signature.bardicUses).toBe(2)
})

test('shortRest refills pact slots; Arcane Recovery once per long rest', () => {
  const skills = initialSkillProgress()
  skills.enchanting = { xp: xpForLevel(21) }
  const classXp = xpForLevel(15)
  const wizardFight = createFight({
    monsterId: 'wolf',
    biome: 'forest',
    skills,
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp,
    rng: () => 0.5,
    spellLoadout: {
      slots: [
        'fire-bolt',
        'magic-missile',
        'magic-missile',
        'magic-missile',
        'magic-missile',
        'scorching-ray',
        'scorching-ray',
        null,
      ],
    },
  })!
  for (const slot of wizardFight.spellSlots) {
    if (slot.level > 0) slot.spent = true
  }
  shortRest(wizardFight, baseCtx({ classId: 'wizard', classTier: 3, chaMod: 0, skills, stopWhenOutOfFood: false }))
  expect(wizardFight.signature.arcaneRecoveryUsed).toBe(true)
  const recovered = wizardFight.spellSlots.filter((s) => s.level > 0 && !s.spent).length
  expect(recovered).toBeGreaterThan(0)

  for (const slot of wizardFight.spellSlots) {
    if (slot.level > 0) slot.spent = true
  }
  shortRest(wizardFight, baseCtx({ classId: 'wizard', classTier: 3, chaMod: 0, skills, stopWhenOutOfFood: false }))
  expect(wizardFight.spellSlots.every((s) => s.level === 0 || s.spent)).toBe(true)

  const pactFight = createFight({
    monsterId: 'wolf',
    biome: 'forest',
    skills,
    equipment: emptyEquipment(),
    activeClassId: 'sorcererWarlock',
    classXp,
    rng: () => 0.5,
  })!
  for (const slot of pactFight.spellSlots) {
    if (slot.level > 0) slot.spent = true
  }
  shortRest(pactFight, baseCtx({ classId: 'sorcererWarlock', classTier: 3, chaMod: 2, skills, stopWhenOutOfFood: false }))
  expect(pactFight.spellSlots.every((s) => !s.spent)).toBe(true)
})

test('foodOutlook: 10 food, 10 HP/bite, 20 HP lost, 10s cycle → 720/h', () => {
  const outlook = foodOutlook({
    foodCount: 10,
    healPerBite: 10,
    hpLostPerKill: 20,
    cycleSec: 10,
  })
  expect(outlook).toEqual({ foodPerHour: 720, hoursUntilEmpty: 10 / 720 })
})
