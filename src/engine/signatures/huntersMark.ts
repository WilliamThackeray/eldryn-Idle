import { roll } from '../dice'
import type { SignatureHooks } from './types'

/** Always marks the current monster's creature type. No spell slot cost. */
export const huntersMark: SignatureHooks = {
  onFightStart(ctx) {
    // markedType set by combat when the monster is known
  },
  onHit(ctx) {
    if (!ctx.runtime.markedType || ctx.creatureType !== ctx.runtime.markedType) return
    const bonus = roll('1d6', ctx.rng)
    const critBonus = ctx.crit ? roll('1d6', ctx.rng) : 0
    ctx.bonusDice += bonus + critBonus
    if (ctx.trace) ctx.log(`Hunter's Mark: [1d6] ${bonus + critBonus}.`)
  },
}
