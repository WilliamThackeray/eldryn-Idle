import type { ClassId } from '../../data/classes'
import type { MonsterDef } from '../../data/monsters'
import type { AbilityAbbr, SkillProgress } from '../../types/game'
import type { SkillId } from '../../data/skills'
import { RESPAWN_MS } from '../config'
import type { Equipment } from '../equipment'
import type { Inventory } from '../inventory'
import type { Rng } from '../rng'
import { advanceDungeonNodes, respawnMonster } from './dungeonRun'
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
}): {
  remaining: number
  monster: MonsterDef | undefined
  inventory: Inventory
  classXp: number
  skills: Record<SkillId, SkillProgress>
  action: 'break' | 'stop' | 'defeat' | 'loop'
  questStepComplete: string | null
  flush: boolean
} {
  const { fight, equipment, trace, casting } = input
  let { remaining, monster, inventory, classXp } = input
  const skills = input.skills
  fight.playerProgressMs = 0
  fight.monsterProgressMs = 0
  fight.pushDelayMs = 0
  const need = Math.max(0, RESPAWN_MS - fight.restProgressMs)
  if (remaining < need) {
    fight.restProgressMs += remaining
    fight.sessionMs += remaining
    remaining = 0
    return { remaining, monster, inventory, classXp, skills, action: 'break', questStepComplete: null, flush: false }
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
    })
    inventory = next.inventory
    classXp = next.classXp
    const nextSkills = next.skills
    monster = next.monster ?? undefined
    const action = next.stop ? 'stop' : fight.defeated ? 'defeat' : 'loop'
    return {
      remaining,
      monster,
      inventory,
      classXp,
      skills: nextSkills,
      action,
      questStepComplete: next.questStepComplete,
      flush: true,
    }
  }

  if (!monster) {
    return { remaining, monster, inventory, classXp, skills, action: 'stop', questStepComplete: null, flush: false }
  }
  respawnMonster(fight, monster, skills, equipment, casting)
  fight.restKind = null
  pushLog(fight, `${monster.name} appears.`, trace)
  return { remaining, monster, inventory, classXp, skills, action: 'loop', questStepComplete: null, flush: false }
}
