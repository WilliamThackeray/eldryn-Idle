import { QUICKENED_COST } from '../config'
import type { SignatureHooks } from './types'

/** Pact Magic slots + Quickened Spell. Slot table override lives in engine/spells. */
export const metamagicPactMagic: SignatureHooks = {
  onFightStart(ctx) {
    ctx.runtime.sorceryPoints = ctx.tier
    ctx.runtime.quickenedReady = false
  },
}

/** Spend sorcery points to mark the next interval as quickened. Returns true if spent. */
export function tryQuicken(runtime: { sorceryPoints: number; quickenedReady: boolean }): boolean {
  if (runtime.quickenedReady) return true
  if (runtime.sorceryPoints < QUICKENED_COST) return false
  runtime.sorceryPoints -= QUICKENED_COST
  runtime.quickenedReady = true
  return true
}
