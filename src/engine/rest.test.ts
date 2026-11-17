import { expect, test } from 'vitest'
import { createFight } from './combat'
import { emptyEquipment } from './equipment'
import { initialSkillProgress } from '../data/skills'
import { xpForLevel } from './xp'
import { longRest, shortRest } from './rest'

test('shortRest heals floor(max * 0.5) and caps at max', () => {
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
  shortRest(fight, { classId: 'fighter', classTier: 1, chaMod: 0 })
  expect(fight.playerHp).toBe(15)

  shortRest(fight, { classId: 'fighter', classTier: 1, chaMod: 0 })
  expect(fight.playerHp).toBe(20)
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

  shortRest(fight, { classId: 'barbarian', classTier: 1, chaMod: 2 })
  expect(fight.signature.rageUses).toBe(1)
  expect(fight.signature.secondWindUsed).toBe(false)
  expect(fight.signature.actionSurgeAvailable).toBe(true)
  expect(fight.signature.channelDivinityUsed).toBe(false)
  expect(fight.signature.wildShapeUsed).toBe(false)
  expect(fight.signature.bardicUses).toBe(2)
})

test('shortRest refills pact slots; Arcane Recovery once per long rest', () => {
  const skills = initialSkillProgress()
  skills.arcana = { xp: xpForLevel(21) }
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
  shortRest(wizardFight, { classId: 'wizard', classTier: 3, chaMod: 0 })
  expect(wizardFight.signature.arcaneRecoveryUsed).toBe(true)
  const recovered = wizardFight.spellSlots.filter((s) => s.level > 0 && !s.spent).length
  expect(recovered).toBeGreaterThan(0)

  for (const slot of wizardFight.spellSlots) {
    if (slot.level > 0) slot.spent = true
  }
  shortRest(wizardFight, { classId: 'wizard', classTier: 3, chaMod: 0 })
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
  shortRest(pactFight, { classId: 'sorcererWarlock', classTier: 3, chaMod: 2 })
  expect(pactFight.spellSlots.every((s) => !s.spent)).toBe(true)
  expect(pactFight.signature.sorceryPoints).toBe(pactFight.signature.sorceryPoints)
})

test('longRest fills HP, clears spent slots, restores rage uses', () => {
  const fight = createFight({
    monsterId: 'deer',
    biome: 'forest',
    skills: initialSkillProgress(),
    equipment: emptyEquipment(),
    activeClassId: 'barbarian',
    classXp: xpForLevel(5),
    rng: () => 0.5,
  })!
  fight.playerHp = 1
  fight.signature.rageUses = 0
  fight.spellSlots = [
    { level: 1, spellId: null, spent: true },
    { level: 0, spellId: null, spent: false },
  ]

  longRest(fight, { classId: 'barbarian', classTier: 1, chaMod: 0 })
  expect(fight.playerHp).toBe(fight.playerMaxHp)
  expect(fight.signature.rageUses).toBe(2)
  expect(fight.spellSlots.every((s) => !s.spent)).toBe(true)
})
