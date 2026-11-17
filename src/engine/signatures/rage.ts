import type { SignatureHooks } from './types'

const PHYSICAL = new Set(['bludgeoning', 'piercing', 'slashing'])

/** Uses per long rest = 2 + floor((tier − 1) / 4). Lasts 10 player attack intervals. */
export const rage: SignatureHooks = {
  onFightStart(ctx) {
    ctx.runtime.rageUses = 2 + Math.floor((ctx.tier - 1) / 4)
    ctx.runtime.raging = false
    ctx.runtime.rageIntervalsLeft = 0
  },
  onDamaged(ctx) {
    if (ctx.runtime.raging) {
      if (PHYSICAL.has(ctx.damageType)) ctx.setDamage(Math.floor(ctx.damage * 0.5))
      return
    }
    if (ctx.runtime.rageUses <= 0 || ctx.damage <= 0) return
    ctx.runtime.rageUses -= 1
    ctx.runtime.raging = true
    ctx.runtime.rageIntervalsLeft = 10
    if (PHYSICAL.has(ctx.damageType)) ctx.setDamage(Math.floor(ctx.damage * 0.5))
    if (ctx.trace) ctx.log('Rage begins.')
  },
  onHit(ctx) {
    if (!ctx.runtime.raging) return
    ctx.bonusFlat += 2
  },
  onBeforeAttack(ctx) {
    if (!ctx.runtime.raging) return
    ctx.runtime.rageIntervalsLeft -= 1
    if (ctx.runtime.rageIntervalsLeft <= 0) {
      ctx.runtime.raging = false
      if (ctx.trace) ctx.log('Rage ends.')
    }
  },
}
