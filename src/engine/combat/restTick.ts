import type { ClassId } from '../../data/classes'
import { getMonster, type MonsterDef } from '../../data/monsters'
import type { AbilityAbbr, SkillProgress } from '../../types/game'
import type { SkillId } from '../../data/skills'
import { RESPAWN_MS } from '../config'
import type { Equipment } from '../equipment'
import type { ActiveBuff } from '../history'
import type { Inventory } from '../inventory'
import type { Rng } from '../rng'
import type { Bounty } from '../social'
import { advanceDungeonNodes, maybeRareSwap, respawnMonster } from './dungeonRun'
import { type CombatFight, pushLog } from './state'

export function tickRest(input: {
  fight: CombatFight
  remaining: number
  monster: MonsterDef | undefined
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
  bounty?: Bounty | null
  favor?: number
  activeBuffs?: ActiveBuff[]
}): {
  remaining: number
  monster: MonsterDef | undefined
  inventory: Inventory
  classXp: number
  skills: Record<SkillId, SkillProgress>
  action: 'break' | 'stop' | 'defeat' | 'loop'
  questStepComplete: string | null
  flush: boolean
  bounty: Bounty | null
  favor: number
} {
  const { fight, equipment, trace, casting } = input
  let { remaining, monster, inventory, classXp } = input
  let skills = input.skills
  let bounty = input.bounty ?? null
  let favor = input.favor ?? 0
  fight.playerProgressMs = 0
  fight.monsterProgressMs = 0
  fight.pushDelayMs = 0
  const need = Math.max(0, RESPAWN_MS - fight.restProgressMs)
  if (remaining < need) {
    fight.restProgressMs += remaining
    fight.sessionMs += remaining
    remaining = 0
    return {
      remaining,
      monster,
      inventory,
      classXp,
      skills,
      action: 'break',
      questStepComplete: null,
      flush: false,
      bounty,
      favor,
    }
  }
  remaining -= need
  fight.sessionMs += need
  fight.restProgressMs = 0

  if (fight.dungeonId) {
    const wasLong = fight.restKind === 'long'
    if (wasLong) fight.nodeIndex = 0
    else fight.nodeIndex += 1
    const next = advanceDungeonNodes({
      fight,
      inventory,
      skills,
      equipment,
      activeClassId: input.activeClassId,
      classXp,
      classTier: input.classTier,
      chaMod: input.chaMod,
      rng: input.rng,
      trace,
      casting,
      modifiers: input.modifiers,
      stopWhenOutOfFood: input.stopWhenOutOfFood,
      bounty,
      favor,
      activeBuffs: input.activeBuffs,
    })
    inventory = next.inventory
    classXp = next.classXp
    skills = next.skills
    bounty = next.bounty
    favor = next.favor
    monster = next.monster ?? undefined
    const action = next.stop ? 'stop' : fight.defeated ? 'defeat' : 'loop'
    return {
      remaining,
      monster,
      inventory,
      classXp,
      skills,
      action,
      questStepComplete: next.questStepComplete,
      flush: true,
      bounty,
      favor,
    }
  }

  if (!monster) {
    return {
      remaining,
      monster,
      inventory,
      classXp,
      skills,
      action: 'stop',
      questStepComplete: null,
      flush: false,
      bounty,
      favor,
    }
  }
  const swappedId = maybeRareSwap(monster.id, fight.biome, input.activeBuffs, input.rng)
  const nextMonster = getMonster(swappedId) ?? monster
  fight.monsterId = nextMonster.id
  monster = nextMonster
  respawnMonster(fight, nextMonster, skills, equipment, casting, input.rng, input.activeBuffs)
  fight.restKind = null
  pushLog(fight, `${nextMonster.name} appears.`, trace)
  return {
    remaining,
    monster,
    inventory,
    classXp,
    skills,
    action: 'loop',
    questStepComplete: null,
    flush: false,
    bounty,
    favor,
  }
}
