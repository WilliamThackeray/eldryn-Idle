import { expect, test } from 'vitest'
import { getMonster } from '../data/monsters'
import { initialSkillProgress } from '../data/skills'
import { createFight } from './combat'
import { resolvePlayerAttack } from './combat/attack'
import { resolveSpellCast } from './combat/spellcasting'
import { triangleMultiplier, type AttackStyle } from './damage'
import { emptyEquipment } from './equipment'

const styles: AttackStyle[] = ['melee', 'ranged', 'magic']
const archetypes = ['armored', 'skirmisher', 'warded'] as const

const expected: Record<(typeof styles)[number], Record<(typeof archetypes)[number], number>> = {
  melee: { armored: 1, skirmisher: 0.75, warded: 1.25 },
  ranged: { armored: 0.75, skirmisher: 1.25, warded: 1 },
  magic: { armored: 1.25, skirmisher: 1, warded: 0.75 },
}

test('triangle multipliers for all 9 style×archetype pairs', () => {
  for (const style of styles) {
    for (const archetype of archetypes) {
      expect(triangleMultiplier(style, archetype), `${style} vs ${archetype}`).toBe(
        expected[style][archetype],
      )
    }
  }
})

test('standard monsters are always ×1', () => {
  for (const style of styles) {
    expect(triangleMultiplier(style, 'standard')).toBe(1)
  }
})

test('Hobgoblin Captain: sword ×1 melee, spell ×1.25 magic in the log', () => {
  const skills = initialSkillProgress()
  const monster = getMonster('hobgoblin-captain')!
  const equipment = { ...emptyEquipment(), mainHand: 'longsword' as const }
  const fight = createFight({
    monsterId: 'hobgoblin-captain',
    biome: 'hills',
    skills,
    equipment,
    activeClassId: 'fighter',
    classXp: 0,
    rng: () => 0.99,
    trace: true,
  })!
  resolvePlayerAttack({
    fight,
    monster,
    skills,
    equipment,
    inventory: {},
    activeClassId: 'fighter',
    classXp: 0,
    rng: () => 0.99,
    trace: true,
    labelPrefix: 'Hit: ',
  })
  expect(fight.log.some((line) => line.includes('×1 (melee vs armored)'))).toBe(true)

  const wizardFight = createFight({
    monsterId: 'hobgoblin-captain',
    biome: 'hills',
    skills,
    equipment: emptyEquipment(),
    activeClassId: 'wizard',
    classXp: 0,
    rng: () => 0.99,
    trace: true,
    spellLoadout: { slots: ['fire-bolt', null, null, null, null, null, null, null] },
  })!
  resolveSpellCast({
    fight: wizardFight,
    monster,
    skills,
    equipment: emptyEquipment(),
    inventory: { 'arcane-dust': 10 },
    activeClassId: 'wizard',
    classXp: 0,
    rng: () => 0.99,
    trace: true,
  })
  expect(wizardFight.log.some((line) => line.includes('×1.25 (magic vs armored)'))).toBe(true)
})
