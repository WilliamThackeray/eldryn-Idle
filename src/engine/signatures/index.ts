import { arcaneRecovery } from './arcaneRecovery'
import { bardicInspiration } from './bardicInspiration'
import { channelDivinity } from './channelDivinity'
import { divineSmite } from './divineSmite'
import { flurryOfBlows } from './flurryOfBlows'
import { huntersMark } from './huntersMark'
import { metamagicPactMagic, tryQuicken } from './metamagicPactMagic'
import { rage } from './rage'
import { secondWind } from './secondWind'
import { sneakAttack } from './sneakAttack'
import { wildShape } from './wildShape'
import type { SignatureHooks } from './types'

export type { SignatureHooks, SignatureRuntime } from './types'
export { emptySignatureRuntime } from './types'
export { flurryDieSides, shouldFlurry } from './flurryOfBlows'
export { tryBardicInspiration } from './bardicInspiration'
export { tryWildShape } from './wildShape'
export { tryQuicken }
export { applyShortRest } from '../spells'

const REGISTRY: Record<string, SignatureHooks> = {
  rage,
  secondWind,
  sneakAttack,
  flurryOfBlows,
  channelDivinity,
  huntersMark,
  wildShape,
  bardicInspiration,
  divineSmite,
  arcaneRecovery,
  metamagicPactMagic,
}

export function getSignatureHooks(id: string): SignatureHooks {
  return REGISTRY[id] ?? {}
}
