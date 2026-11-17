import type { ClassId } from '../../data/classes'
import type { MonsterDef } from '../../data/monsters'
import type { AbilityAbbr, SkillProgress } from '../../types/game'
import type { SkillId } from '../../data/skills'
import type { Equipment } from '../equipment'
import type { Inventory } from '../inventory'
import type { Rng } from '../rng'
import { doOpeningAttacks, resolvePlayerAttack } from './attack'
import { onKill } from './dungeonRun'
import type { CombatFight } from './state'

export function runOpening(input: {
  fight: CombatFight
  monster: MonsterDef
  skills: Record<SkillId, SkillProgress>
  equipment: Equipment
  inventory: Inventory
  activeClassId: ClassId
  classXp: number
  rng: Rng
  trace: boolean
  modifiers: Partial<Record<AbilityAbbr, number>>
  chaMod: number
  classTier: number
  casting: boolean
}): {
  inventory: Inventory
  classXp: number
  skills: Record<SkillId, SkillProgress>
  monster: MonsterDef
  action: 'proceed' | 'ammo' | 'quest' | 'defeat' | 'loop'
  questStepComplete: string | null
} {
  const { fight, trace } = input
  let { inventory, classXp, skills, monster } = input
  const opened = doOpeningAttacks({
    fight,
    monster,
    skills,
    equipment: input.equipment,
    inventory,
    activeClassId: input.activeClassId,
    classXp,
    rng: input.rng,
    trace,
  })
  inventory = opened.inventory
  classXp = opened.classXp
  skills = opened.skills
  if (opened.stopped) {
    return { inventory, classXp, skills, monster, action: 'ammo', questStepComplete: null }
  }
  if (opened.killed) {
    const killed = onKill({
      fight,
      monster,
      inventory,
      equipment: input.equipment,
      classXp,
      skills,
      rng: input.rng,
      trace,
      modifiers: input.modifiers,
      chaMod: input.chaMod,
      classTier: input.classTier,
      activeClassId: input.activeClassId,
      casting: input.casting,
    })
    inventory = killed.inventory
    classXp = killed.classXp
    skills = killed.skills
    if (killed.monster) monster = killed.monster
    if (killed.stop) {
      return { inventory, classXp, skills, monster, action: 'quest', questStepComplete: killed.questStepComplete }
    }
    if (fight.defeated) {
      return { inventory, classXp, skills, monster, action: 'defeat', questStepComplete: null }
    }
    return { inventory, classXp, skills, monster, action: 'loop', questStepComplete: null }
  }
  if (fight.signature.actionSurgeAvailable) {
    fight.signature.actionSurgeAvailable = false
    const surged = resolvePlayerAttack({
      fight,
      monster,
      skills,
      equipment: input.equipment,
      inventory,
      activeClassId: input.activeClassId,
      classXp,
      rng: input.rng,
      trace,
      labelPrefix: 'Action Surge: ',
    })
    inventory = surged.inventory
    classXp = surged.classXp
    skills = surged.skills
    if (surged.stopped) {
      return { inventory, classXp, skills, monster, action: 'ammo', questStepComplete: null }
    }
    if (surged.killed) {
      const killed = onKill({
        fight,
        monster,
        inventory,
        equipment: input.equipment,
        classXp,
        skills,
        rng: input.rng,
        trace,
        modifiers: input.modifiers,
        chaMod: input.chaMod,
        classTier: input.classTier,
        activeClassId: input.activeClassId,
        casting: input.casting,
      })
      inventory = killed.inventory
      classXp = killed.classXp
      skills = killed.skills
      if (killed.monster) monster = killed.monster
      if (killed.stop) {
        return { inventory, classXp, skills, monster, action: 'quest', questStepComplete: killed.questStepComplete }
      }
      if (fight.defeated) {
        return { inventory, classXp, skills, monster, action: 'defeat', questStepComplete: null }
      }
      return { inventory, classXp, skills, monster, action: 'loop', questStepComplete: null }
    }
  }
  return { inventory, classXp, skills, monster, action: 'proceed', questStepComplete: null }
}
