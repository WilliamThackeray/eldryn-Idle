import { expect, test } from 'vitest'
import { getDungeon } from '../data/dungeons'
import { initialSkillProgress } from '../data/skills'
import { advance, type AdvanceState } from './advance'
import { beginDungeonFight, createFight } from './combat'
import {
  buildRunOrder,
  resolveSecret,
  resolveTrap,
} from './dungeon'
import { emptyEquipment } from './equipment'
import { mulberry32 } from './rng'
import { xpForLevel } from './xp'

function dungeonCtx(
  skills: ReturnType<typeof initialSkillProgress>,
  classId: 'fighter' | 'rogue' | 'wizard' = 'fighter',
  classXp = xpForLevel(99),
) {
  return { skills, classId, classXp }
}

test('buildRunOrder for shifting-thicket matches fight → short → rooms → boss → chest → long', () => {
  const dungeon = getDungeon('shifting-thicket')!
  const order = buildRunOrder(dungeon)
  expect(order.map((n) => n.kind)).toEqual([
    'monster',
    'shortRest',
    'trap',
    'monster',
    'shortRest',
    'secret',
    'boss',
    'chest',
    'longRest',
  ])
  expect(order[0]).toMatchObject({ kind: 'monster', monsterId: 'wolf' })
  expect(order[3]).toMatchObject({ kind: 'monster', monsterId: 'dire-wolf' })
  expect(order[6]).toMatchObject({ kind: 'boss', monsterId: 'owlbear' })
})

test('trap: passive under DC deals damage; spotted+fail damages; spotted+success deals 0', () => {
  const room = { kind: 'trap' as const, after: 0, requiredLevel: 10, damage: 6 }
  const lowSkills = initialSkillProgress()
  // Passive 10 + 0 + 2 = 12; DC for level 10 = 11. Raise DC by using requiredLevel 99.
  const hard = { ...room, requiredLevel: 99 }
  const miss = resolveTrap(hard, dungeonCtx(lowSkills, 'fighter', 0), mulberry32(1))
  expect(miss.spotted).toBe(false)
  expect(miss.damage).toBe(6)

  // Fighter Perception + high WIS (foraging); low thievery fails disarm on nat 1.
  const spotSkills = initialSkillProgress()
  spotSkills.foraging = { xp: xpForLevel(99) }
  let trapRolls = 0
  const failDisarm = resolveTrap(room, dungeonCtx(spotSkills, 'fighter'), () => {
    trapRolls += 1
    return trapRolls === 1 ? 0.99 : 0
  })
  expect(failDisarm.spotted).toBe(true)
  expect(failDisarm.disarmed).toBe(false)
  expect(failDisarm.damage).toBe(6)

  spotSkills.thievery = { xp: xpForLevel(99) }
  const ok = resolveTrap(room, dungeonCtx(spotSkills, 'fighter'), () => 0.99) // nat 20
  expect(ok.spotted).toBe(true)
  expect(ok.disarmed).toBe(true)
  expect(ok.damage).toBe(0)
})

test('secret door: success adds loot, fail adds none', () => {
  const room = {
    kind: 'secret' as const,
    after: 1,
    requiredLevel: 1,
    lootTable: [{ itemId: 'valuables' as const, chance: 1, min: 1, max: 1 }],
  }
  const skills = initialSkillProgress()
  for (const id of ['alchemy', 'scribing', 'enchanting'] as const) {
    skills[id] = { xp: xpForLevel(99) }
  }
  const found = resolveSecret(room, dungeonCtx(skills, 'wizard'), () => 0.99)
  expect(found.found).toBe(true)
  expect(found.loot).toEqual([{ itemId: 'valuables', quantity: 1 }])

  const miss = resolveSecret(room, dungeonCtx(initialSkillProgress(), 'fighter', 0), () => 0)
  expect(miss.found).toBe(false)
  expect(miss.loot).toEqual([])
})

test('dungeon defeat keeps loot and clears the run', () => {
  const skills = initialSkillProgress()
  // High combat power vs wolf
  const fight = beginDungeonFight({
    dungeonId: 'shifting-thicket',
    skills,
    equipment: { ...emptyEquipment(), mainHand: 'greatsword', food: 'cooked-forest-fish' },
    activeClassId: 'barbarian',
    classXp: xpForLevel(50),
    rng: mulberry32(2),
    trace: false,
  })!
  expect(fight.dungeonId).toBe('shifting-thicket')

  let state: AdvanceState = {
    skills,
    inventory: { 'cooked-forest-fish': 20 } as Record<string, number>,
    gold: 0,
    activeAction: {
      kind: 'combat' as const,
      label: 'Dungeon',
      monsterId: fight.monsterId,
      biome: fight.biome,
      baseIntervalMs: 6000,
      progressMs: 0,
      mode: 'dungeon' as const,
      dungeonId: 'shifting-thicket',
    },
    equipment: { ...emptyEquipment(), mainHand: 'greatsword', food: 'cooked-forest-fish' },
    classId: 'barbarian' as const,
    classXp: xpForLevel(50),
    combat: fight,
    isInDungeonOrQuest: true,
  }

  // Kill the wolf with a long advance, then force defeat via no food.
  let guard = 0
  while (state.combat && state.combat.kills < 1 && guard < 200) {
    const result = advance(state, 60_000, mulberry32(guard + 3), {}, { trace: false })
    state = { ...state, ...result.state, combat: result.state.combat ?? null, activeAction: result.state.activeAction }
    guard += 1
  }
  expect(state.combat?.kills ?? 0).toBeGreaterThanOrEqual(1)
  const lootAfterKill = { ...state.inventory }

  // Empty food and drop HP so auto-eat fails.
  if (state.combat) {
    state.combat = {
      ...state.combat,
      playerHp: 1,
      phase: 'fight',
    }
    const nextInventory = { ...state.inventory }
    delete nextInventory['cooked-forest-fish']
    state.inventory = nextInventory
    if (state.equipment) state.equipment = { ...state.equipment, food: null }
  }

  const defeated = advance(state, 120_000, mulberry32(99), {}, { trace: false })
  expect(defeated.state.lastDefeat || defeated.state.combat == null).toBe(true)
  expect(defeated.state.combat).toBeNull()
  expect(defeated.state.isInDungeonOrQuest).toBe(false)
  // Loot from the kill remains.
  for (const [id, qty] of Object.entries(lootAfterKill)) {
    if (id === 'cooked-forest-fish') continue
    expect(defeated.state.inventory[id] ?? 0).toBeGreaterThanOrEqual(qty as number)
  }
})

test('createFight defaults dungeon fields for hunts', () => {
  const fight = createFight({
    monsterId: 'deer',
    biome: 'forest',
    skills: initialSkillProgress(),
    equipment: emptyEquipment(),
    activeClassId: 'fighter',
    classXp: 0,
    rng: () => 0.5,
  })!
  expect(fight.dungeonId).toBeNull()
  expect(fight.questId).toBeNull()
  expect(fight.runsCompleted).toBe(0)
})
