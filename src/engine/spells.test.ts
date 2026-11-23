import { expect, test } from 'vitest'
import { applyStartingKit } from './equipment'
import { getClass } from '../data/classes'
import { getSpell } from '../data/spells'
import { initialSkillProgress } from '../data/skills'
import { getMonster } from '../data/monsters'
import { createFight } from './combat'
import { resolvePlayerAttack } from './combat/attack'
import { resolveSpellCast } from './combat/spellcasting'
import { emptyEquipment } from './equipment'
import { mulberry32, type Rng } from './rng'
import { xpForLevel } from './xp'
import {
  applyShortRest,
  buildFightSlots,
  cantripDiceCount,
  componentCostForCast,
  concentrationDc,
  hasComponents,
  pickSlotForCast,
  refreshSlotsOnLongRest,
  slotsFor,
  unlockSkillLevel,
} from './spells'

function scripted(...values: number[]): Rng {
  let index = 0
  return () => values[index++] ?? 0.99
}

test('full / half / pact slot counts include a cantrip slot', () => {
  expect(slotsFor('full', 1).map((s) => s.level)).toEqual([0, 1, 1])
  expect(slotsFor('full', 5).filter((s) => s.level === 3)).toHaveLength(2)
  expect(slotsFor('full', 5).filter((s) => s.level === 0)).toHaveLength(1)

  expect(slotsFor('half', 1).map((s) => s.level)).toEqual([0])
  expect(slotsFor('half', 5).filter((s) => s.level === 2)).toHaveLength(2)

  const pact3 = slotsFor('pact', 3)
  expect(pact3.filter((s) => s.level === 0)).toHaveLength(1)
  expect(pact3.filter((s) => s.level === 2)).toHaveLength(2)

  const pact11 = slotsFor('pact', 11)
  expect(pact11.filter((s) => s.level === 5)).toHaveLength(3)
})

test('spell unlock levels and cantrip dice scaling', () => {
  expect(unlockSkillLevel(0)).toBe(1)
  expect(unlockSkillLevel(1)).toBe(1)
  expect(unlockSkillLevel(2)).toBe(11)
  expect(unlockSkillLevel(3)).toBe(21)
  expect(unlockSkillLevel(9)).toBe(81)

  expect(cantripDiceCount(1)).toBe(1)
  expect(cantripDiceCount(20)).toBe(1)
  expect(cantripDiceCount(21)).toBe(2)
  expect(cantripDiceCount(51)).toBe(3)
  expect(cantripDiceCount(81)).toBe(4)
})

test('expended model spends a slot then falls back; long rest restores', () => {
  const slots = buildFightSlots({
    classId: 'wizard',
    classTier: 3,
    skillLevel: 21,
    loadout: {
      slots: [
        'fire-bolt',
        'magic-missile',
        'magic-missile',
        'magic-missile',
        'magic-missile',
        'scorching-ray',
        'scorching-ray',
      ],
    },
  })

  const first = pickSlotForCast({ slots, rotationIndex: 0, model: 'expended' })
  expect(slots[first.slotIndex]?.spellId).toBe('magic-missile')
  for (const slot of slots) {
    if (slot.level > 0) slot.spent = true
  }

  const after = pickSlotForCast({ slots, rotationIndex: 0, model: 'expended' })
  expect(slots[after.slotIndex]?.level).toBe(0)
  expect(slots[after.slotIndex]?.spellId).toBe('fire-bolt')

  const rested = refreshSlotsOnLongRest(slots)
  const again = pickSlotForCast({ slots: rested, rotationIndex: 0, model: 'expended' })
  expect(rested[again.slotIndex]?.level).toBeGreaterThan(0)
})

test('rotation model cycles cantrip then leveled slots without spending', () => {
  const slots = buildFightSlots({
    classId: 'wizard',
    classTier: 1,
    skillLevel: 1,
    loadout: {
      slots: ['fire-bolt', 'magic-missile', 'magic-missile'],
    },
  })
  const order: (string | null)[] = []
  let index = 0
  for (let i = 0; i < 4; i++) {
    const pick = pickSlotForCast({ slots, rotationIndex: index, model: 'rotation' })
    order.push(slots[pick.slotIndex]?.spellId ?? null)
    index = pick.nextRotationIndex
  }
  expect(order).toEqual(['fire-bolt', 'magic-missile', 'magic-missile', 'fire-bolt'])
  expect(slots.every((slot) => !slot.spent)).toBe(true)
})

test('Scorching Ray needs coal and desert spices', () => {
  const spell = getSpell('scorching-ray')!
  const cost = componentCostForCast({ spell, classId: 'wizard' })
  expect(cost).toEqual([
    { itemId: 'coal', quantity: 1 },
    { itemId: 'desert-spices', quantity: 1 },
  ])
  expect(hasComponents({}, cost)).toBe(false)
  expect(hasComponents({ coal: 1, 'desert-spices': 1 }, cost)).toBe(true)
})

test('cantrip spends Arcane Dust; out of dust falls back to a weapon attack', () => {
  const skills = initialSkillProgress()
  skills.enchanting = { xp: xpForLevel(1) }
  const classXp = xpForLevel(1)
  const equipment = { ...emptyEquipment(), mainHand: 'quarterstaff' as const }
  const fight = createFight({
    monsterId: 'wolf',
    biome: 'forest',
    skills,
    equipment,
    activeClassId: 'wizard',
    classXp,
    rng: mulberry32(9),
    trace: true,
    spellLoadout: { slots: ['fire-bolt'] },
  })
  expect(fight).not.toBeNull()
  if (!fight) return
  const monster = getMonster('wolf')!

  const withDust = resolveSpellCast({
    fight,
    monster,
    skills,
    inventory: { 'arcane-dust': 2 },
    equipment,
    activeClassId: 'wizard',
    classXp,
    rng: scripted(0.99, 0.5, 0.5, 0.5, 0.5),
    trace: true,
  })
  expect(withDust.inventory['arcane-dust']).toBe(1)
  expect(fight.log.some((line) => line.includes('Fire Bolt'))).toBe(true)
  expect(fight.log.some((line) => line.includes('Spent Arcane Dust'))).toBe(true)

  fight.log = []
  fight.rotationIndex = 0
  resolveSpellCast({
    fight,
    monster,
    skills,
    inventory: {},
    equipment,
    activeClassId: 'wizard',
    classXp,
    rng: mulberry32(11),
    trace: true,
  })
  expect(fight.log.some((line) => line.includes('Out of Arcane Dust — weapon attack'))).toBe(true)
  expect(fight.log.some((line) => line.includes('Weapon fallback'))).toBe(true)
})

test('Magic Missile spends 3 Arcane Dust', () => {
  const spell = getSpell('magic-missile')!
  expect(componentCostForCast({ spell, classId: 'wizard' })).toEqual([
    { itemId: 'arcane-dust', quantity: 3 },
  ])

  const skills = initialSkillProgress()
  skills.enchanting = { xp: xpForLevel(1) }
  const classXp = xpForLevel(1)
  const fight = createFight({
    monsterId: 'wolf',
    biome: 'forest',
    skills,
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp,
    rng: mulberry32(1),
    trace: true,
    spellLoadout: { slots: ['fire-bolt', 'magic-missile', null] },
  })
  expect(fight).not.toBeNull()
  if (!fight) return
  fight.rotationIndex = 1

  const cast = resolveSpellCast({
    fight,
    monster: getMonster('wolf')!,
    skills,
    inventory: { 'arcane-dust': 5 },
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp,
    rng: scripted(0.99, 0.5, 0.5, 0.5),
    trace: true,
  })
  expect(cast.inventory['arcane-dust']).toBe(2)
  expect(fight.log.some((line) => line.includes('Magic Missile'))).toBe(true)
  expect(fight.log.some((line) => line.includes('Spent Arcane Dust ×3'))).toBe(true)
})

test('Pact Magic halves each component stack rounded up', () => {
  const missile = getSpell('magic-missile')!
  expect(componentCostForCast({ spell: missile, classId: 'sorcererWarlock' })).toEqual([
    { itemId: 'arcane-dust', quantity: 2 },
  ])
  const shield = getSpell('shield')!
  expect(componentCostForCast({ spell: shield, classId: 'sorcererWarlock' })).toEqual([
    { itemId: 'iron-bar', quantity: 1 },
  ])
})

test('seeded Arcane Recovery can save components', () => {
  const skills = initialSkillProgress()
  skills.enchanting = { xp: xpForLevel(1) }
  const classXp = xpForLevel(1)
  const makeFight = () => {
    const fight = createFight({
      monsterId: 'wolf',
      biome: 'forest',
      skills,
      equipment: emptyEquipment(),
      activeClassId: 'wizard',
      classXp,
      rng: mulberry32(1),
      trace: true,
      spellLoadout: { slots: ['fire-bolt'] },
    })
    expect(fight).not.toBeNull()
    if (!fight) throw new Error('fight')
    return fight
  }
  const monster = getMonster('wolf')!

  const savedFight = makeFight()
  const saved = resolveSpellCast({
    fight: savedFight,
    monster,
    skills,
    inventory: { 'arcane-dust': 1 },
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp,
    rng: scripted(0.1, 0.5, 0.5, 0.5, 0.5),
    trace: true,
  })
  expect(saved.inventory['arcane-dust']).toBe(1)
  expect(savedFight.log.some((line) => line.includes('Arcane Recovery: components saved'))).toBe(
    true,
  )

  const spentFight = makeFight()
  const spent = resolveSpellCast({
    fight: spentFight,
    monster,
    skills,
    inventory: { 'arcane-dust': 1 },
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp,
    rng: scripted(0.2, 0.5, 0.5, 0.5, 0.5),
    trace: true,
  })
  expect(spent.inventory['arcane-dust'] ?? 0).toBe(0)
})

test('Scorching Ray spends coal and spices then falls back without spending the slot', () => {
  const skills = initialSkillProgress()
  for (const id of ['alchemy', 'scribing', 'enchanting', 'weaving'] as const) {
    skills[id] = { xp: xpForLevel(50) }
  }
  const classXp = xpForLevel(15)
  const fight = createFight({
    monsterId: 'wolf',
    biome: 'forest',
    skills,
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp,
    rng: mulberry32(1),
    trace: true,
    spellLoadout: {
      slots: ['fire-bolt', null, null, null, null, 'scorching-ray', null],
    },
  })
  expect(fight).not.toBeNull()
  if (!fight) return
  fight.rotationIndex = 5
  const monster = getMonster('wolf')!

  const first = resolveSpellCast({
    fight,
    monster,
    skills,
    inventory: { coal: 1, 'desert-spices': 1, 'arcane-dust': 10 },
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp,
    rng: scripted(0.99, 0.5, 0.5, 0.5, 0.5),
    trace: true,
  })
  expect(first.inventory.coal ?? 0).toBe(0)
  expect(first.inventory['desert-spices'] ?? 0).toBe(0)
  expect(fight.log.some((line) => line.includes('Scorching Ray'))).toBe(true)
  expect(fight.spellSlots.some((s) => s.spellId === 'scorching-ray' && s.spent)).toBe(false)

  fight.rotationIndex = 5
  fight.log = []
  const second = resolveSpellCast({
    fight,
    monster,
    skills,
    inventory: first.inventory,
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp,
    rng: scripted(0.99, 0.5, 0.5, 0.5, 0.5),
    trace: true,
  })
  expect(fight.log.some((line) => line.includes('Out of') && line.includes('Fire Bolt'))).toBe(true)
  expect(second.inventory['arcane-dust']).toBe(9)
})

test('Divine Smite spends Holy Water and does not spend a slot', () => {
  const skills = initialSkillProgress()
  const classXp = xpForLevel(5)
  const equipment = { ...emptyEquipment(), mainHand: 'longsword' as const }
  const fight = createFight({
    monsterId: 'ghoul',
    biome: 'swamp',
    skills,
    equipment,
    activeClassId: 'paladin',
    classXp,
    rng: mulberry32(3),
    trace: true,
  })
  expect(fight).not.toBeNull()
  if (!fight) return
  const monster = getMonster('ghoul')!

  const hit = resolvePlayerAttack({
    fight,
    monster,
    skills,
    equipment,
    inventory: { 'holy-water': 2 },
    activeClassId: 'paladin',
    classXp,
    rng: scripted(0.95, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1),
    trace: true,
    labelPrefix: 'Attack: ',
  })
  expect(hit.inventory['holy-water']).toBe(1)
  expect(fight.log.some((line) => line.includes('Divine Smite (Holy Water)'))).toBe(true)
  expect(fight.spellSlots.every((s) => !s.spent)).toBe(true)

  fight.log = []
  resolvePlayerAttack({
    fight,
    monster,
    skills,
    equipment,
    inventory: {},
    activeClassId: 'paladin',
    classXp,
    rng: scripted(0.95, 0.1, 0.1, 0.1, 0.1),
    trace: true,
    labelPrefix: 'Attack: ',
  })
  expect(fight.log.some((line) => line.includes('Divine Smite: out of Holy Water'))).toBe(true)
})

test('concentration DC is max(10, floor(damage/2))', () => {
  expect(concentrationDc(1)).toBe(10)
  expect(concentrationDc(20)).toBe(10)
  expect(concentrationDc(21)).toBe(10)
  expect(concentrationDc(22)).toBe(11)
  expect(concentrationDc(40)).toBe(20)
})

test('Arcane Recovery short-rest slot restore still works for expended leftovers', () => {
  const slots = buildFightSlots({
    classId: 'wizard',
    classTier: 4,
    skillLevel: 21,
    loadout: {
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
  })
  for (const slot of slots) {
    if (slot.level > 0) slot.spent = true
  }
  const result = applyShortRest({
    slots,
    classId: 'wizard',
    classTier: 4,
    arcaneRecoveryUsed: false,
  })
  expect(result.arcaneRecoveryUsed).toBe(true)
  const recoveredLevels = result.slots
    .filter((s) => s.level > 0 && !s.spent)
    .reduce((sum, s) => sum + s.level, 0)
  expect(recoveredLevels).toBeLessThanOrEqual(2)
  expect(recoveredLevels).toBeGreaterThan(0)
})

test('casters start with 50 tradition reagents', () => {
  expect(applyStartingKit(getClass('wizard').startingKit).inventory['arcane-dust']).toBe(50)
  expect(applyStartingKit(getClass('paladin').startingKit).inventory['holy-water']).toBe(50)
  expect(applyStartingKit(getClass('ranger').startingKit).inventory['mistletoe-sprig']).toBe(50)
  expect(applyStartingKit(getClass('bard').startingKit).inventory.rosin).toBe(50)
})
