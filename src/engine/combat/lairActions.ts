import { getClass, type ClassId } from '../../data/classes'
import { getLair, type LairAction } from '../../data/lairs'
import type { MonsterDef } from '../../data/monsters'
import type { TradeSkillId } from '../../data/skills'
import type { SkillProgress } from '../../types/game'
import { roll } from '../dice'
import { levelForXp, proficiency, tier } from '../xp'
import { isMonsterModId, monsterProfile } from './monsterMods'
import { applyPlayerDamage } from './monsterTurn'
import { abilityModMap, type CombatFight, pushLog, savingThrow } from './state'

export function dueLairActions(actions: readonly LairAction[], intervalCount: number): LairAction[] {
  if (intervalCount <= 0) return []
  return actions.filter((action) => intervalCount % action.everyNIntervals === 0)
}

export function resolveLairActions(input: {
  fight: CombatFight
  monster: MonsterDef
  skills: Record<TradeSkillId, SkillProgress>
  activeClassId: ClassId
  classXp: number
  rng: import('../rng').Rng
  trace: boolean
  modifiers: Partial<Record<import('../../types/game').AbilityAbbr, number>>
  equipment?: import('../equipment').Equipment
  xpExtra?: number
}): { skills: Record<TradeSkillId, SkillProgress>; defeated: boolean } {
  const lair = input.fight.lairId ? getLair(input.fight.lairId) : undefined
  if (!lair) return { skills: input.skills, defeated: false }
  let skills = input.skills
  for (const action of dueLairActions(lair.lairActions, input.fight.playerIntervalCount)) {
    const result = resolveOne(action, input, skills)
    skills = result.skills
    if (result.defeated) return { skills, defeated: true }
  }
  return { skills, defeated: false }
}

function resolveOne(
  action: LairAction,
  input: {
    fight: CombatFight
    monster: MonsterDef
    skills: Record<TradeSkillId, SkillProgress>
    activeClassId: ClassId
    classXp: number
    rng: import('../rng').Rng
    trace: boolean
    modifiers: Partial<Record<import('../../types/game').AbilityAbbr, number>>
    equipment?: import('../equipment').Equipment
    xpExtra?: number
  },
  skills: Record<TradeSkillId, SkillProgress>,
): { skills: Record<TradeSkillId, SkillProgress>; defeated: boolean } {
  const { fight, trace } = input
  const effect = action.effect
  if (effect.type === 'slow') {
    fight.playerIntervalMs = Math.floor(fight.playerIntervalMs * (1 + effect.intervalPct))
    fight.undoIntervalBonus = effect.intervalPct
    pushLog(
      fight,
      `Lair action: ${action.name}: your next interval +${Math.round(effect.intervalPct * 100)}%.`,
      trace,
    )
    return { skills, defeated: false }
  }
  if (effect.type === 'monsterBuff') {
    if (isMonsterModId(effect.mod) && !fight.monsterMods.includes(effect.mod)) {
      fight.monsterMods = [...fight.monsterMods, effect.mod]
      const profile = monsterProfile(input.monster, fight.monsterMods)
      const gained = profile.hp - fight.monsterMaxHp
      fight.monsterMaxHp = profile.hp
      if (gained > 0) fight.monsterHp += gained
      fight.monsterIntervalMs = profile.intervalMs
    }
    pushLog(fight, `Lair action: ${action.name}: the monster gains ${effect.mod}.`, trace)
    return { skills, defeated: false }
  }
  const cls = getClass(input.activeClassId)
  const mods = abilityModMap(skills)
  const classTier = tier(levelForXp(input.classXp))
  const save = savingThrow({
    rng: input.rng,
    ability: effect.save,
    dc: effect.dc,
    abilityMod: mods[effect.save],
    proficient: cls.saveProficiencies.some((id) => id === effect.save),
    proficiencyBonus: proficiency(classTier),
  })
  if (effect.type === 'debuff') {
    if (save.success) {
      pushLog(fight, `Lair action: ${action.name}: ${effect.save} save ${save.total} vs ${effect.dc}, saved.`, trace)
      return { skills, defeated: false }
    }
    fight.toHitPenalty = effect.toHit
    fight.toHitPenaltyLeft = effect.intervals
    pushLog(
      fight,
      `Lair action: ${action.name}: ${effect.save} save ${save.total} vs ${effect.dc}, failed: -${effect.toHit} to hit for ${effect.intervals} intervals.`,
      trace,
    )
    return { skills, defeated: false }
  }
  if (save.success) {
    pushLog(fight, `Lair action: ${action.name}: ${effect.save} save ${save.total} vs ${effect.dc}, saved.`, trace)
    return { skills, defeated: false }
  }
  const damage = Math.max(0, roll(effect.dice, input.rng))
  pushLog(
    fight,
    `Lair action: ${action.name}: ${effect.save} save ${save.total} vs ${effect.dc}, failed: ${damage} ${effect.damageType}.`,
    trace,
  )
  const applied = applyPlayerDamage({
    fight,
    amount: damage,
    damageType: effect.damageType,
    skills,
    activeClassId: input.activeClassId,
    classXp: input.classXp,
    rng: input.rng,
    trace,
    modifiers: input.modifiers,
    equipment: input.equipment,
    xpExtra: input.xpExtra,
  })
  return applied
}
