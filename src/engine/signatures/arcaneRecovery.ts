import type { SignatureHooks } from './types'

/**
 * Arcane Recovery runs on short rest via applyShortRest in engine/spells.
 * Fight start clears the once-per-long-rest flag through emptySignatureRuntime.
 */
export const arcaneRecovery: SignatureHooks = {
  onFightStart(ctx) {
    ctx.runtime.arcaneRecoveryUsed = false
  },
}
