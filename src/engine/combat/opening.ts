import type { ClassId } from '../../data/classes'
import type { MonsterDef } from '../../data/monsters'
import type { AbilityAbbr, SkillProgress } from '../../types/game'
import type { TradeSkillId } from '../../data/skills'
import type { Equipment } from '../equipment'
import type { ActiveBuff } from '../history'
import type { Inventory } from '../inventory'
import type { Rng } from '../rng'
import type { Bounty } from '../social'
import { doOpeningAttacks, resolvePlayerAttack } from './attack'
import { onKill } from './dungeonRun'
import type { CombatFight } from './state'

export function runOpening(input: {
  fight: CombatFight
  monster: MonsterDef
  skills: Record<TradeSkillId, SkillProgress>
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
  stopWhenOutOfFood?: boolean
  bestiaryBonus?: number
  intelDamagePct?: number
  bounty?: Bounty | null
  favor?: number
  activeBuffs?: ActiveBuff[]
}): {
  inventory: Inventory
  classXp: number
  skills: Record<TradeSkillId, SkillProgress>
  monster: MonsterDef
  action: 'proceed' | 'ammo' | 'quest' | 'defeat' | 'loop'
  questStepComplete: string | null
  bounty: Bounty | null
  favor: number
} {
  const { fight, trace } = input
  let { inventory, classXp, skills, monster } = input
  let bounty = input.bounty ?? null
  let favor = input.favor ?? 0
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
    bestiaryBonus: input.bestiaryBonus,
  })
  inventory = opened.inventory
  classXp = opened.classXp
  skills = opened.skills
  if (opened.stopped) {
    return { inventory, classXp, skills, monster, action: 'ammo', questStepComplete: null, bounty, favor }
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
      stopWhenOutOfFood: input.stopWhenOutOfFood,
      bounty,
      favor,
      activeBuffs: input.activeBuffs,
    })
    inventory = killed.inventory
    classXp = killed.classXp
    skills = killed.skills
    bounty = killed.bounty
    favor = killed.favor
    if (killed.monster) monster = killed.monster
    if (killed.stop) {
      return {
        inventory,
        classXp,
        skills,
        monster,
        action: 'quest',
        questStepComplete: killed.questStepComplete,
        bounty,
        favor,
      }
    }
    if (fight.defeated) {
      return { inventory, classXp, skills, monster, action: 'defeat', questStepComplete: null, bounty, favor }
    }
    return { inventory, classXp, skills, monster, action: 'loop', questStepComplete: null, bounty, favor }
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
      bestiaryBonus: input.bestiaryBonus,
      intelDamagePct: input.intelDamagePct,
    })
    inventory = surged.inventory
    classXp = surged.classXp
    skills = surged.skills
    if (surged.stopped) {
      return { inventory, classXp, skills, monster, action: 'ammo', questStepComplete: null, bounty, favor }
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
        stopWhenOutOfFood: input.stopWhenOutOfFood,
        bounty,
        favor,
        activeBuffs: input.activeBuffs,
      })
      inventory = killed.inventory
      classXp = killed.classXp
      skills = killed.skills
      bounty = killed.bounty
      favor = killed.favor
      if (killed.monster) monster = killed.monster
      if (killed.stop) {
        return {
          inventory,
          classXp,
          skills,
          monster,
          action: 'quest',
          questStepComplete: killed.questStepComplete,
          bounty,
          favor,
        }
      }
      if (fight.defeated) {
        return { inventory, classXp, skills, monster, action: 'defeat', questStepComplete: null, bounty, favor }
      }
      return { inventory, classXp, skills, monster, action: 'loop', questStepComplete: null, bounty, favor }
    }
  }
  return { inventory, classXp, skills, monster, action: 'proceed', questStepComplete: null, bounty, favor }
}
