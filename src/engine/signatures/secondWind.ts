import { roll } from '../dice'
import type { SignatureHooks } from './types'

/** Fighter: Second Wind + Action Surge. */
export const secondWind: SignatureHooks = {
  onFightStart(ctx) {
    ctx.runtime.secondWindUsed = false
    ctx.runtime.actionSurgeAvailable = true
  },
  onLowHp(ctx) {
    if (ctx.runtime.secondWindUsed) return
    if (ctx.hp >= ctx.maxHp * 0.5) return
    ctx.runtime.secondWindUsed = true
    const heal = roll('1d10', ctx.rng) + ctx.tier
    ctx.heal(heal)
    if (ctx.trace) ctx.log(`Second Wind: heal ${heal}.`)
  },
}
