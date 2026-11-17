import { roll } from '../dice'
import type { SignatureHooks } from './types'

export const sneakAttack: SignatureHooks = {
  onHit(ctx) {
    if (!ctx.hasAdvantage) return
    const dice = Math.ceil(ctx.tier / 2)
    const notation = `${dice}d6`
    const bonus = roll(notation, ctx.rng)
    // Crit doubles sneak dice: roll again.
    const critBonus = ctx.crit ? roll(notation, ctx.rng) : 0
    ctx.bonusDice += bonus + critBonus
    if (ctx.trace) ctx.log(`Sneak Attack: [${notation}] ${bonus + critBonus}.`)
  },
}
