import { expect, test } from 'vitest'
import { initialSkillProgress } from '../data/skills'
import { getMonster } from '../data/monsters'
import { hitChance, playerToHitBonus } from './combat/attack'
import { createFight, playerArmorClass } from './combat/state'
import { emptyEquipment, type Equipment } from './equipment'
import { computeCombatStats } from './combatStats'
import { xpForLevel } from './xp'
import { abilityModMap } from './combat/state'

function withPieces(pieces: Partial<Equipment>): Equipment {
  return { ...emptyEquipment(), ...pieces }
}

test('hitChance includes nat 1 miss and nat 20 hit', () => {
  expect(hitChance(10, 20)).toBe(0.55) // need 10
  expect(hitChance(0, 20)).toBe(0.05) // need 20
  expect(hitChance(0, 21)).toBe(0.05) // need 21 → only nat 20
  expect(hitChance(20, 21)).toBe(0.95) // need 1 → everything but nat 1
})

test('computeCombatStats to-hit and AC match combat helpers', () => {
  const skills = initialSkillProgress()
  const equipment = withPieces({ mainHand: 'steel-longsword' })
  const classXp = xpForLevel(15)
  const stats = computeCombatStats({
    skills,
    equipment,
    classId: 'fighter',
    classXp,
    inventory: {},
  })
  expect(stats.toHit.value).toBe(playerToHitBonus(skills, equipment, classXp, 'fighter'))

  const fight = createFight({
    monsterId: 'goat',
    biome: 'hills',
    skills,
    equipment,
    activeClassId: 'fighter',
    classXp,
    rng: () => 0.5,
  })
  expect(fight).not.toBeNull()
  const dex = abilityModMap(skills).DEX
  expect(stats.ac.value).toBe(playerArmorClass(fight!, equipment, dex))
})

test('steel longsword raises to-hit by 1 over iron', () => {
  const skills = initialSkillProgress()
  const classXp = xpForLevel(15)
  const iron = computeCombatStats({
    skills,
    equipment: withPieces({ mainHand: 'longsword' }),
    classId: 'fighter',
    classXp,
    inventory: {},
  })
  const steel = computeCombatStats({
    skills,
    equipment: withPieces({ mainHand: 'steel-longsword' }),
    classId: 'fighter',
    classXp,
    inventory: {},
  })
  expect(steel.toHit.value - iron.toHit.value).toBe(1)
  expect(steel.damageFlat.value - iron.damageFlat.value).toBe(1)
  expect(steel.toHit.parts.some((part) => part.label === 'Steel' && part.value === 1)).toBe(true)
})

test('nick expected damage includes off-hand dice at proc rate', () => {
  const skills = initialSkillProgress()
  const equipment = withPieces({ mainHand: 'dagger', offHand: 'dagger' })
  const monster = getMonster('goat')!
  const stats = computeCombatStats(
    {
      skills,
      equipment,
      classId: 'rogue',
      classXp: 0,
      inventory: {},
    },
    monster,
  )
  // Hit chance vs goat, 1d4 avg 2.5, nick 0.2 * 2.5 on hit.
  const toHit = stats.toHit.value
  const pHit = hitChance(toHit, monster.ac)
  const pCrit = 0.05
  const pHitNonCrit = Math.max(0, pHit - pCrit)
  const avg = 2.5
  const flat = stats.damageFlat.value
  const perSwing =
    pHitNonCrit * (avg + flat) + pCrit * (2 * avg + flat) + pHit * 0.2 * avg
  const interval = stats.intervalSec.value
  expect(stats.matchup!.yourDps.value).toBeCloseTo(perSwing / interval, 5)
})

test('fire bolt cantrip expected damage uses attack roll math', () => {
  const skills = initialSkillProgress()
  // High HP so overkill on the last cast barely moves the average.
  const monster = getMonster('ogre')!
  const stats = computeCombatStats(
    {
      skills,
      equipment: emptyEquipment(),
      classId: 'wizard',
      classXp: 0,
      inventory: { 'arcane-dust': 999 },
      spellLoadout: { slots: ['fire-bolt'] },
    },
    monster,
  )
  const mods = abilityModMap(skills)
  const bonus = mods.INT + 2 // prof at tier 1
  const pHit = hitChance(bonus, monster.ac)
  const pCrit = 0.05
  const pHitNonCrit = Math.max(0, pHit - pCrit)
  const avg = 5.5
  const perCast = pHitNonCrit * avg + pCrit * (2 * avg)
  const casts = Math.ceil(monster.hp / perCast - 1e-12)
  const ttk = casts * stats.intervalSec.value
  expect(stats.matchup!.timeToKillSec.value).toBeCloseTo(ttk, 5)
  expect(stats.matchup!.yourDps.value).toBeCloseTo(monster.hp / ttk, 5)
})
