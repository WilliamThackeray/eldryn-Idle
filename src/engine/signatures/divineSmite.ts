import { roll } from '../dice'
import type { SignatureHooks } from './types'

export const divineSmite: SignatureHooks = {
  onHit(ctx) {
    if (!ctx.spendHolyWater) return
    if (!ctx.spendHolyWater()) {
      if (ctx.trace) ctx.log('Divine Smite: out of Holy Water.')
      return
    }
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
        `Divine Smite (Holy Water): +${bonus} radiant${undeadOrFiend ? ' (undead/fiend)' : ''}.`,
      )
    }
  },
}
