import { expect, test } from 'vitest'
import { xpForLevel } from './xp'
import { createFight, advanceCombat } from './combat'
import { emptyEquipment } from './equipment'
import { mulberry32 } from './rng'
import {
  applyShortRest,
  buildFightSlots,
  cantripDiceCount,
  concentrationDc,
  hasComponentBag,
  pickSlotForCast,
  refreshSlotsOnLongRest,
  slotsFor,
  unlockSkillLevel,
} from './spells'
import { initialSkillProgress } from '../data/skills'
import { getSpell } from '../data/spells'

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
  // Tier 3 full: cantrip + 4×1st + 2×2nd
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
  const rayIndex = slots.findIndex((s) => s.spellId === 'scorching-ray')
  expect(rayIndex).toBeGreaterThan(0)

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

test('rotation model keeps cycling leveled slots', () => {
  const slots = buildFightSlots({
    classId: 'wizard',
    classTier: 3,
    skillLevel: 21,
    loadout: {
      slots: ['fire-bolt', null, null, null, null, 'scorching-ray', null],
    },
  })
  const a = pickSlotForCast({ slots, rotationIndex: 0, model: 'rotation' })
  expect(slots[a.slotIndex]?.level).toBe(0)
  // indices 1–4 empty → cantrip fallback; index 5 is Scorching Ray
  let index = a.nextRotationIndex
  let foundRay = false
  for (let i = 0; i < 6; i++) {
    const pick = pickSlotForCast({ slots, rotationIndex: index, model: 'rotation' })
    if (slots[pick.slotIndex]?.spellId === 'scorching-ray') {
      foundRay = true
      break
    }
    index = pick.nextRotationIndex
  }
  expect(foundRay).toBe(true)
})

test('out of component bags: hasComponentBag is false for Scorching Ray', () => {
  const spell = getSpell('scorching-ray')!
  expect(hasComponentBag({}, spell)).toBe(false)
  expect(hasComponentBag({ 'component-bag-basic': 1 }, spell)).toBe(true)
})

test('out of bags: interval casts cantrip and leaves the leveled slot unspent', () => {
  const skills = initialSkillProgress()
  skills.arcana = { xp: xpForLevel(21) }
  const classXp = xpForLevel(15)
  const fight = createFight({
    monsterId: 'wolf',
    biome: 'forest',
    skills,
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp,
    rng: mulberry32(9),
    trace: true,
    spellLoadout: {
      slots: ['fire-bolt', null, null, null, null, 'scorching-ray', null],
    },
  })
  expect(fight).not.toBeNull()
  if (!fight) return
  fight.monsterHp = 500
  fight.monsterMaxHp = 500

  const result = advanceCombat({
    fight,
    skills,
    inventory: {},
    gold: 0,
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp,
    elapsedMs: 8_000,
    rng: mulberry32(10),
    trace: true,
  })
  expect(result.lastLog.some((line) => line.includes('Fire Bolt') || line.includes('cantrip'))).toBe(
    true,
  )
  expect(result.fight?.spellSlots.some((s) => s.spellId === 'scorching-ray' && s.spent)).toBe(false)
})

test('concentration DC is max(10, floor(damage/2))', () => {
  expect(concentrationDc(1)).toBe(10)
  expect(concentrationDc(20)).toBe(10)
  expect(concentrationDc(21)).toBe(10)
  expect(concentrationDc(22)).toBe(11)
  expect(concentrationDc(40)).toBe(20)
})

test('Arcane Recovery restores slot levels up to ceil(tier/2)', () => {
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
  const recoveredLevels = result.slots.filter((s) => s.level > 0 && !s.spent).reduce((sum, s) => sum + s.level, 0)
  expect(recoveredLevels).toBeLessThanOrEqual(2)
  expect(recoveredLevels).toBeGreaterThan(0)
})

test('Wizard acceptance: Scorching Ray burns a Basic bag, falls back to Fire Bolt, refreshes after rest', () => {
  const skills = initialSkillProgress()
  skills.arcana = { xp: xpForLevel(21) }
  const classXp = xpForLevel(15) // Tier 3
  // Tier 3: indices 0 cantrip, 1–4 1st, 5–6 2nd
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

  // Keep the wolf alive through several spell intervals.
  fight.monsterHp = 500
  fight.monsterMaxHp = 500

  const raySlot = fight.spellSlots.find((s) => s.spellId === 'scorching-ray')
  expect(raySlot).toBeTruthy()

  const inventory = { 'component-bag-basic': 1 }
  const first = advanceCombat({
    fight,
    skills,
    inventory,
    gold: 0,
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp,
    elapsedMs: 8_000,
    rng: mulberry32(2),
    trace: true,
  })
  expect(first.inventory['component-bag-basic'] ?? 0).toBe(0)
  expect(first.lastLog.some((line) => line.includes('Scorching Ray'))).toBe(true)

  const mid = first.fight
  expect(mid).not.toBeNull()
  if (!mid) return
  expect(mid.spellSlots.some((s) => s.spellId === 'scorching-ray' && s.spent)).toBe(true)

  const second = advanceCombat({
    fight: mid,
    skills: first.skills,
    inventory: first.inventory,
    gold: first.gold,
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp: first.classXp,
    elapsedMs: 12_000,
    rng: mulberry32(3),
    trace: true,
  })
  expect(second.lastLog.some((line) => line.includes('Fire Bolt') || line.includes('cantrip'))).toBe(true)

  if (!second.fight) return
  second.fight.monsterHp = 1
  const kill = advanceCombat({
    fight: second.fight,
    skills: second.skills,
    inventory: second.inventory,
    gold: second.gold,
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp: second.classXp,
    elapsedMs: 60_000,
    rng: mulberry32(4),
    trace: true,
  })
  expect(kill.lastLog.some((line) => line.includes('defeated'))).toBe(true)
  if (kill.fight?.phase === 'rest') {
    expect(kill.fight.spellSlots.every((s) => !s.spent)).toBe(true)
  } else if (kill.fight) {
    expect(kill.fight.spellSlots.every((s) => !s.spent)).toBe(true)
  }
})
