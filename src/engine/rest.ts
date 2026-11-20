import { getClass, type ClassId } from '../data/classes'
import { getMonster } from '../data/monsters'
import type { AbilityAbbr, SkillProgress } from '../types/game'
import type { SkillId } from '../data/skills'
import { activePerks, hasPerkEffect } from './abilities'
import { SHORT_REST_MAX_FOOD } from './config'
import { roll } from './dice'
import type { Equipment } from './equipment'
import type { Inventory } from './inventory'
import type { Rng } from './rng'
import { emptySignatureRuntime, forEachSignature, hasSignature } from './signatures'
import { applyShortRest, refreshSlotsOnLongRest } from './spells'
import { eatOneFood, equippedFoodCount } from './combat/food'
import type { CombatFight } from './combat'
import { abilityModMap, pushLog } from './combat/state'

export interface RestContext {
  classId: ClassId
  classTier: number
  chaMod: number
  inventory: Inventory
  equipment: Equipment
  skills: Record<SkillId, SkillProgress>
  modifiers: Partial<Record<AbilityAbbr, number>>
  rng: Rng
  trace: boolean
  /** Missing means on. */
  stopWhenOutOfFood?: boolean
}

export interface RestResult {
  inventory: Inventory
  skills: Record<SkillId, SkillProgress>
  /** True when the hunt/dungeon should stop (out of food and still hurt). */
  stopped: boolean
}

function shouldStop(fight: CombatFight, equipment: Equipment, inventory: Inventory, stopWhenOutOfFood: boolean): boolean {
  if (!stopWhenOutOfFood) return false
  if (fight.playerHp >= fight.playerMaxHp) return false
  return equippedFoodCount(equipment, inventory) <= 0
}

function eatWhileBelowMax(input: {
  fight: CombatFight
  inventory: Inventory
  equipment: Equipment
  skills: Record<SkillId, SkillProgress>
  modifiers: Partial<Record<AbilityAbbr, number>>
  trace: boolean
  maxBites: number
}): { inventory: Inventory; skills: Record<SkillId, SkillProgress> } {
  let inventory = input.inventory
  let skills = input.skills
  let bites = 0
  while (bites < input.maxBites && input.fight.playerHp < input.fight.playerMaxHp) {
    const bitten = eatOneFood({
      fight: input.fight,
      inventory,
      equipment: input.equipment,
      skills,
      modifiers: input.modifiers,
      trace: input.trace,
    })
    inventory = bitten.inventory
    skills = bitten.skills
    if (!bitten.ate) break
    bites += 1
  }
  return { inventory, skills }
}

function rollHitDieHeal(hitDie: number, conMod: number, advantage: boolean, rng: Rng): number {
  const first = roll(`1d${hitDie}`, rng)
  const die = advantage ? Math.max(first, roll(`1d${hitDie}`, rng)) : first
  return Math.max(0, die + conMod)
}

function rechargeShortRest(fight: CombatFight, ctx: RestContext): void {
  fight.signature.secondWindUsed = false
  fight.signature.actionSurgeAvailable = true
  fight.signature.channelDivinityUsed = false
  fight.signature.wildShapeUsed = false
  fight.signature.bardicUses = Math.max(1, ctx.chaMod)

  const recovered = applyShortRest({
    slots: fight.spellSlots,
    classId: ctx.classId,
    classTier: ctx.classTier,
    arcaneRecoveryUsed: fight.signature.arcaneRecoveryUsed,
  })
  fight.spellSlots = recovered.slots
  fight.signature.arcaneRecoveryUsed = recovered.arcaneRecoveryUsed
}

function rechargeLongRest(fight: CombatFight, ctx: RestContext): void {
  const runtime = emptySignatureRuntime(fight.signature.id)
  fight.signature = runtime
  fight.spellSlots = refreshSlotsOnLongRest(fight.spellSlots)
  fight.rotationIndex = 0
  fight.concentration = null
  fight.shieldBonus = 0
  const ctxBase = {
    runtime,
    tier: ctx.classTier,
    abilityMod: (abbr: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA') =>
      abbr === 'CHA' ? ctx.chaMod : 0,
    rng: () => 0,
    trace: false,
    log: () => undefined,
  }
  forEachSignature(runtime.id, fight.secondarySignatureId, (hooks) => {
    hooks.onFightStart?.(ctxBase)
  })
  if (hasSignature(runtime.id, fight.secondarySignatureId, 'huntersMark')) {
    const monster = getMonster(fight.monsterId)
    runtime.markedType = monster?.creatureType ?? null
  }
  if (hasSignature(runtime.id, fight.secondarySignatureId, 'bardicInspiration')) {
    runtime.bardicUses = Math.max(1, ctx.chaMod)
  }
  if (hasSignature(runtime.id, fight.secondarySignatureId, 'rage')) {
    runtime.rageUses = 2 + Math.floor((ctx.classTier - 1) / 4)
  }
  if (hasSignature(runtime.id, fight.secondarySignatureId, 'metamagicPactMagic')) {
    runtime.sorceryPoints = ctx.classTier
  }
}

/** Hit die + optional food (up to SHORT_REST_MAX_FOOD). Recharges short-rest abilities. */
export function shortRest(fight: CombatFight, ctx: RestContext): RestResult {
  const stopFlag = ctx.stopWhenOutOfFood !== false
  let inventory = ctx.inventory
  let skills = ctx.skills
  const foodAvailable = equippedFoodCount(ctx.equipment, inventory) > 0

  if (foodAvailable) {
    const cls = getClass(ctx.classId)
    const conMod = abilityModMap(skills).CON
    const advantage = hasPerkEffect(activePerks({ skills }), 'shortRestAdvantage')
    const heal = rollHitDieHeal(cls.hitDie, conMod, advantage, ctx.rng)
    const before = fight.playerHp
    fight.playerHp = Math.min(fight.playerMaxHp, fight.playerHp + heal)
    const gained = fight.playerHp - before
    if (gained > 0) {
      pushLog(fight, `Hit die: +${gained} HP.`, ctx.trace)
    }
    const eaten = eatWhileBelowMax({
      fight,
      inventory,
      equipment: ctx.equipment,
      skills,
      modifiers: ctx.modifiers,
      trace: ctx.trace,
      maxBites: SHORT_REST_MAX_FOOD,
    })
    inventory = eaten.inventory
    skills = eaten.skills
  }

  rechargeShortRest(fight, ctx)
  const stopped = shouldStop(fight, ctx.equipment, inventory, stopFlag)
  if (stopped) pushLog(fight, 'Out of food. Returning to town.', ctx.trace)
  return { inventory, skills, stopped }
}

/** Eat until full or out of food. Recharges everything. No free full heal. */
export function longRest(fight: CombatFight, ctx: RestContext): RestResult {
  const stopFlag = ctx.stopWhenOutOfFood !== false
  const eaten = eatWhileBelowMax({
    fight,
    inventory: ctx.inventory,
    equipment: ctx.equipment,
    skills: ctx.skills,
    modifiers: ctx.modifiers,
    trace: ctx.trace,
    maxBites: Number.POSITIVE_INFINITY,
  })
  rechargeLongRest(fight, ctx)
  const stopped = shouldStop(fight, ctx.equipment, eaten.inventory, stopFlag)
  if (stopped) pushLog(fight, 'Out of food. Returning to town.', ctx.trace)
  return { inventory: eaten.inventory, skills: eaten.skills, stopped }
}
