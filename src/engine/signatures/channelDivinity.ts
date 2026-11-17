import { roll } from '../dice'
import type { SignatureHooks } from './types'

export const channelDivinity: SignatureHooks = {
  onFightStart(ctx) {
    ctx.runtime.channelDivinityUsed = false
  },
  onLowHp(ctx) {
    if (ctx.runtime.channelDivinityUsed) return
    if (ctx.hp >= ctx.maxHp * 0.5) return
    ctx.runtime.channelDivinityUsed = true
    const heal = roll('2d8', ctx.rng) + ctx.abilityMod('WIS')
    ctx.heal(Math.max(0, heal))
    if (ctx.trace) ctx.log(`Channel Divinity: heal ${heal}.`)
  },
}
