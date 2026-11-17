import { getMonster } from '../data/monsters'
import type { ClassId } from '../data/classes'
import { SHORT_REST_HP_FRACTION } from './config'
import { emptySignatureRuntime, getSignatureHooks } from './signatures'
import { applyShortRest, refreshSlotsOnLongRest } from './spells'
import type { CombatFight } from './combat' // type-only: avoids runtime cycle with combat.ts

export interface RestContext {
  classId: ClassId
  classTier: number
  chaMod: number
}

/** Regain half max HP (floored), refresh short-rest abilities, Arcane Recovery / pact slots. */
export function shortRest(fight: CombatFight, ctx: RestContext): void {
  const heal = Math.floor(fight.playerMaxHp * SHORT_REST_HP_FRACTION)
  fight.playerHp = Math.min(fight.playerMaxHp, fight.playerHp + heal)

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

/** Full HP, all slots, rebuild once-per-long-rest signature state. */
export function longRest(fight: CombatFight, ctx: RestContext): void {
  fight.playerHp = fight.playerMaxHp
  const hooks = getSignatureHooks(fight.signature.id)
  const runtime = emptySignatureRuntime(fight.signature.id)
  fight.signature = runtime
  fight.spellSlots = refreshSlotsOnLongRest(fight.spellSlots)
  fight.rotationIndex = 0
  fight.concentration = null
  fight.shieldBonus = 0
  hooks.onFightStart?.({
    runtime,
    tier: ctx.classTier,
    abilityMod: (abbr) => (abbr === 'CHA' ? ctx.chaMod : 0),
    rng: () => 0,
    trace: false,
    log: () => undefined,
  })
  if (runtime.id === 'huntersMark') {
    const monster = getMonster(fight.monsterId)
    runtime.markedType = monster?.creatureType ?? null
  }
  if (runtime.id === 'bardicInspiration') {
    runtime.bardicUses = Math.max(1, ctx.chaMod)
  }
  if (runtime.id === 'rage') {
    runtime.rageUses = 2 + Math.floor((ctx.classTier - 1) / 4)
  }
  if (runtime.id === 'metamagicPactMagic') {
    runtime.sorceryPoints = ctx.classTier
  }
}
