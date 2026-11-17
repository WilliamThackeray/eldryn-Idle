import type { AbilityAbbr } from '../../types/game'
import type { Rng } from '../rng'

export interface SignatureRuntime {
  /** Ability id from ClassDefinition.signatureAbility.id */
  id: string
  rageUses: number
  rageIntervalsLeft: number
  raging: boolean
  secondWindUsed: boolean
  actionSurgeAvailable: boolean
  channelDivinityUsed: boolean
  bardicUses: number
  wildShapeUsed: boolean
  flurryInterval: number
  markedType: string | null
}

export interface SignatureHooks {
  onFightStart?: (ctx: SignatureContext) => void
  onBeforeAttack?: (ctx: AttackHookContext) => void
  onHit?: (ctx: HitHookContext) => void
  onDamaged?: (ctx: DamagedHookContext) => void
  onLowHp?: (ctx: LowHpHookContext) => void
}

export interface SignatureContext {
  runtime: SignatureRuntime
  tier: number
  abilityMod: (abbr: AbilityAbbr) => number
  rng: Rng
  trace: boolean
  log: (line: string) => void
}

export interface AttackHookContext extends SignatureContext {
  hasAdvantage: boolean
  intervalIndex: number
}

export interface HitHookContext extends SignatureContext {
  hasAdvantage: boolean
  crit: boolean
  /** Extra dice damage to add (before resistance). */
  bonusDice: number
  /** Flat bonus damage. */
  bonusFlat: number
  creatureType: string
}

export interface DamagedHookContext extends SignatureContext {
  damage: number
  damageType: string
  /** Mutate to change incoming damage after hooks. */
  setDamage: (amount: number) => void
}

export interface LowHpHookContext extends SignatureContext {
  hp: number
  maxHp: number
  /** Heal amount applied immediately. */
  heal: (amount: number) => void
}

export function emptySignatureRuntime(id: string): SignatureRuntime {
  return {
    id,
    rageUses: 0,
    rageIntervalsLeft: 0,
    raging: false,
    secondWindUsed: false,
    actionSurgeAvailable: false,
    channelDivinityUsed: false,
    bardicUses: 0,
    wildShapeUsed: false,
    flurryInterval: 0,
    markedType: null,
  }
}
