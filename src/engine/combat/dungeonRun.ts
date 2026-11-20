import { type ClassId } from '../../data/classes'
import { getDungeon } from '../../data/dungeons'
import { getMonster, type MonsterDef } from '../../data/monsters'
import type { AbilityAbbr, SkillProgress } from '../../types/game'
import type { SkillId } from '../../data/skills'
import { COMBAT_LOG_LIMIT } from '../config'
import {
  applyLootToInventory,
  buildRunOrder,
  consumeEntryItem,
  resolveSecret,
  resolveTrap,
  type DungeonNode,
} from '../dungeon'
import type { Equipment } from '../equipment'
import { addItems, type Inventory } from '../inventory'
import { rollGold, rollLoot } from '../loot'
import type { Rng } from '../rng'
import { longRest, shortRest } from '../rest'
import { addXp } from '../xp'
import { mergeLoot, recoverAmmo } from './attack'
import {
  type CombatFight,
  computeMonsterIntervalMs,
  computePlayerIntervalMs,
  tryRelentless,
  pushLog,
} from './state'

export function pushRoomLog(fight: CombatFight, line: string) {
  fight.roomLog = [...fight.roomLog, line].slice(-COMBAT_LOG_LIMIT)
}

export function spawnDungeonMonster(
  fight: CombatFight,
  monster: MonsterDef,
  skills: Record<SkillId, SkillProgress>,
  equipment: Equipment,
  casting: boolean,
  trace: boolean,
): { killedByCleave: boolean } {
  fight.monsterId = monster.id
  fight.phase = 'fight'
  fight.restProgressMs = 0
  fight.restKind = null
  fight.monsterHp = monster.hp
  fight.monsterMaxHp = monster.hp
  fight.openingDone = false
  fight.playerIntervalMs = computePlayerIntervalMs(skills, equipment, casting)
  fight.monsterIntervalMs = computeMonsterIntervalMs(monster, false)
  fight.playerProgressMs = 0
  fight.monsterProgressMs = 0
  fight.slowActive = false
  fight.pushDelayMs = 0
  fight.nextAttackAdvantage = false
  fight.monsterNextDisadvantage = false
  if (fight.signature.id === 'huntersMark') {
    fight.signature.markedType = monster.creatureType
  }

  const overflow = fight.pendingCleave + fight.cleaveOverflow
  fight.pendingCleave = 0
  fight.cleaveOverflow = 0
  if (overflow > 0) {
    const before = fight.monsterHp
    fight.monsterHp = Math.max(0, fight.monsterHp - overflow)
    const leftover = overflow - before
    pushLog(fight, `Cleave overflow ${overflow} → ${monster.name}.`, trace)
    if (fight.monsterHp === 0) {
      if (leftover > 0) fight.cleaveOverflow = leftover
      return { killedByCleave: true }
    }
  }
  pushLog(fight, `${monster.name} appears.`, trace)
  return { killedByCleave: false }
}

/**
 * After a dungeon kill or rest finishes: walk nodes until the next fight or timed rest.
 * Returns stop when the run ends (quest one-shot, missing entry item).
 */
export function advanceDungeonNodes(input: {
  fight: CombatFight
  inventory: Inventory
  skills: Record<SkillId, SkillProgress>
  equipment: Equipment
  activeClassId: ClassId
  classXp: number
  classTier: number
  chaMod: number
  rng: Rng
  trace: boolean
  casting: boolean
  modifiers?: Partial<Record<AbilityAbbr, number>>
  stopWhenOutOfFood?: boolean
}): {
  inventory: Inventory
  classXp: number
  skills: Record<SkillId, SkillProgress>
  stop: boolean
  questStepComplete: string | null
  monster: MonsterDef | null
} {
  const { fight, equipment, rng, trace, casting } = input
  let inventory = input.inventory
  let classXp = input.classXp
  let skills = input.skills
  const dungeon = getDungeon(fight.dungeonId ?? '')
  if (!dungeon) {
    return { inventory, classXp, skills, stop: true, questStepComplete: null, monster: null }
  }
  const order = buildRunOrder(dungeon)
  const restCtx = {
    classId: input.activeClassId,
    classTier: input.classTier,
    chaMod: input.chaMod,
    inventory,
    equipment,
    skills,
    modifiers: input.modifiers ?? {},
    rng,
    trace,
    stopWhenOutOfFood: input.stopWhenOutOfFood,
  }

  const applyKillRewards = (monster: MonsterDef) => {
    const loot = rollLoot(monster.lootTable, rng, 1)
    inventory = addItems(inventory, loot)
    fight.lootGained = mergeLoot(fight.lootGained, loot)
    const gold = rollGold(monster.gold, rng, 1)
    fight.goldGained += gold
    fight.classXpGained += monster.xp
    classXp = addXp(classXp, monster.xp)
    fight.kills += 1
    pushLog(fight, `${monster.name} defeated. +${monster.xp} class XP.`, trace)
  }

  // Guard against infinite cleave chains.
  for (let guard = 0; guard < 64; guard++) {
    if (fight.nodeIndex >= order.length) {
      fight.nodeIndex = 0
    }
    const node: DungeonNode = order[fight.nodeIndex]

    if (node.kind === 'shortRest') {
      const rested = shortRest(fight, { ...restCtx, inventory, skills })
      inventory = rested.inventory
      skills = rested.skills
      fight.phase = 'rest'
      fight.restKind = 'short'
      fight.restProgressMs = 0
      fight.playerProgressMs = 0
      fight.monsterProgressMs = 0
      pushLog(fight, 'Short rest.', trace)
      return {
        inventory,
        classXp,
        skills,
        stop: rested.stopped,
        questStepComplete: null,
        monster: getMonster(fight.monsterId) ?? null,
      }
    }

    if (node.kind === 'longRest') {
      fight.runsCompleted += 1
      if (fight.questId) {
        pushLog(fight, 'Quest dungeon complete. Returning to town.', trace)
        return {
          inventory,
          classXp,
          skills,
          stop: true,
          questStepComplete: fight.questId,
          monster: null,
        }
      }
      const entry = consumeEntryItem(inventory, dungeon)
      inventory = entry.inventory
      if (!entry.ok) {
        pushLog(fight, 'No entry item for another loop. Returning to town.', trace)
        return { inventory, classXp, skills, stop: true, questStepComplete: null, monster: null }
      }
      const rested = longRest(fight, { ...restCtx, inventory, skills })
      inventory = rested.inventory
      skills = rested.skills
      fight.phase = 'rest'
      fight.restKind = 'long'
      fight.restProgressMs = 0
      fight.playerProgressMs = 0
      fight.monsterProgressMs = 0
      fight.cleaveOverflow = 0
      fight.pendingCleave = 0
      pushLog(fight, 'Long rest between loops.', trace)
      return {
        inventory,
        classXp,
        skills,
        stop: rested.stopped,
        questStepComplete: null,
        monster: getMonster(fight.monsterId) ?? null,
      }
    }

    if (node.kind === 'trap') {
      const result = resolveTrap(node.room, skills, rng)
      pushRoomLog(fight, result.line)
      pushLog(fight, result.line, trace)
      if (result.damage > 0) {
        fight.playerHp = Math.max(0, fight.playerHp - result.damage)
        if (fight.playerHp <= 0 && tryRelentless(fight, skills)) {
          pushLog(fight, 'Relentless: you hang on at 1 HP.', trace)
        }
        if (fight.playerHp <= 0) {
          fight.defeated = true
          pushLog(fight, 'You fall. Returning to town.', trace)
          return { inventory, classXp, skills, stop: true, questStepComplete: null, monster: null }
        }
      }
      fight.nodeIndex += 1
      continue
    }

    if (node.kind === 'secret') {
      const result = resolveSecret(node.room, skills, rng)
      pushRoomLog(fight, result.line)
      pushLog(fight, result.line, trace)
      if (result.found && result.loot.length) {
        inventory = applyLootToInventory(inventory, result.loot)
        fight.lootGained = mergeLoot(fight.lootGained, result.loot)
      }
      fight.nodeIndex += 1
      continue
    }

    if (node.kind === 'chest') {
      const loot = rollLoot(dungeon.chest, rng, 1)
      inventory = applyLootToInventory(inventory, loot)
      fight.lootGained = mergeLoot(fight.lootGained, loot)
      const line = loot.length
        ? `Chest: ${loot.map((s) => `${s.itemId}×${s.quantity}`).join(', ')}.`
        : 'Chest: empty.'
      pushRoomLog(fight, line)
      pushLog(fight, line, trace)
      fight.nodeIndex += 1
      continue
    }

    if (node.kind === 'monster' || node.kind === 'boss') {
      const nextMonster = getMonster(node.monsterId)
      if (!nextMonster) {
        return { inventory, classXp, skills, stop: true, questStepComplete: null, monster: null }
      }
      const spawned = spawnDungeonMonster(fight, nextMonster, skills, equipment, casting, trace)
      if (spawned.killedByCleave) {
        applyKillRewards(nextMonster)
        fight.pendingCleave = fight.cleaveOverflow
        fight.nodeIndex += 1
        continue
      }
      return { inventory, classXp, skills, stop: false, questStepComplete: null, monster: nextMonster }
    }
  }

  return { inventory, classXp, skills, stop: true, questStepComplete: null, monster: null }
}

export function onKill(input: {
  fight: CombatFight
  monster: MonsterDef
  inventory: Inventory
  equipment: Equipment
  classXp: number
  skills: Record<SkillId, SkillProgress>
  rng: Rng
  trace: boolean
  modifiers: Partial<Record<AbilityAbbr, number>>
  chaMod: number
  classTier: number
  activeClassId: ClassId
  casting: boolean
  stopWhenOutOfFood?: boolean
}): {
  inventory: Inventory
  classXp: number
  skills: Record<SkillId, SkillProgress>
  stop: boolean
  questStepComplete: string | null
  monster: MonsterDef | null
} {
  const { fight, monster, equipment, rng, trace } = input
  let inventory = recoverAmmo(input.inventory, equipment, fight.ammoSpent)
  fight.ammoSpent = 0
  let skills = input.skills

  const loot = rollLoot(monster.lootTable, rng, 1)
  inventory = addItems(inventory, loot)
  fight.lootGained = mergeLoot(fight.lootGained, loot)
  const gold = rollGold(monster.gold, rng, 1)
  fight.goldGained += gold
  fight.classXpGained += monster.xp
  const classXp = addXp(input.classXp, monster.xp)
  fight.kills += 1
  fight.slowActive = false
  fight.pushDelayMs = 0
  fight.nextAttackAdvantage = false
  fight.monsterNextDisadvantage = false

  pushLog(fight, `${monster.name} defeated. +${monster.xp} class XP.`, trace)

  const inDungeon = fight.dungeonId != null
  if (!inDungeon) {
    fight.cleaveOverflow = 0
    // Quest combat steps are one kill, then return to town.
    if (fight.questId) {
      return {
        inventory,
        classXp,
        skills,
        stop: true,
        questStepComplete: fight.questId,
        monster,
      }
    }
    fight.phase = 'rest'
    fight.restProgressMs = 0
    fight.playerProgressMs = 0
    fight.monsterProgressMs = 0
    fight.pushDelayMs = 0
    const rested = longRest(fight, {
      classId: input.activeClassId,
      classTier: input.classTier,
      chaMod: input.chaMod,
      inventory,
      equipment,
      skills,
      modifiers: input.modifiers,
      rng,
      trace,
      stopWhenOutOfFood: input.stopWhenOutOfFood,
    })
    inventory = rested.inventory
    skills = rested.skills
    fight.restKind = 'long'
    return {
      inventory,
      classXp,
      skills,
      stop: rested.stopped,
      questStepComplete: null,
      monster,
    }
  }

  // Carry cleave to the next dungeon monster.
  fight.pendingCleave = fight.cleaveOverflow
  fight.cleaveOverflow = 0
  fight.nodeIndex += 1
  return advanceDungeonNodes({
    fight,
    inventory,
    skills,
    equipment,
    activeClassId: input.activeClassId,
    classXp,
    classTier: input.classTier,
    chaMod: input.chaMod,
    rng,
    trace,
    casting: input.casting,
    modifiers: input.modifiers,
    stopWhenOutOfFood: input.stopWhenOutOfFood,
  })
}

export function respawnMonster(
  fight: CombatFight,
  monster: MonsterDef,
  skills: Record<SkillId, SkillProgress>,
  equipment: Equipment,
  casting: boolean,
) {
  fight.phase = 'fight'
  fight.restProgressMs = 0
  fight.monsterHp = monster.hp
  fight.monsterMaxHp = monster.hp
  fight.openingDone = false
  fight.playerIntervalMs = computePlayerIntervalMs(skills, equipment, casting)
  fight.monsterIntervalMs = computeMonsterIntervalMs(monster, false)
  fight.playerProgressMs = 0
  fight.monsterProgressMs = 0
}
