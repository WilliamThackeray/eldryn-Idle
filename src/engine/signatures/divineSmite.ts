import { roll } from '../dice'
import type { SignatureHooks } from './types'

export const divineSmite: SignatureHooks = {
  onHit(ctx) {
    if (!ctx.spendLowestSlot) return
    const spent = ctx.spendLowestSlot()
    if (spent == null) return
    let bonus = roll('2d8', ctx.rng)
    if (ctx.crit) bonus += roll('2d8', ctx.rng)
    const undeadOrFiend = ctx.creatureType === 'undead' || ctx.creatureType === 'fiend'
    if (undeadOrFiend) {
      bonus += roll('1d8', ctx.rng)
      if (ctx.crit) bonus += roll('1d8', ctx.rng)
    }
    ctx.bonusDice += bonus
    if (ctx.trace) {
      ctx.log(
        `Divine Smite (slot ${spent}): +${bonus} radiant${undeadOrFiend ? ' (undead/fiend)' : ''}.`,
      )
    }
  },
}
