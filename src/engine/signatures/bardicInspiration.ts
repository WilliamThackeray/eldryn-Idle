import { roll } from '../dice'
import type { SignatureHooks } from './types'

function inspirationDie(tier: number): number {
  if (tier >= 15) return 12
  if (tier >= 10) return 10
  if (tier >= 5) return 8
  return 6
}

export const bardicInspiration: SignatureHooks = {
  onFightStart(ctx) {
    ctx.runtime.bardicUses = Math.max(1, ctx.abilityMod('CHA'))
  },
}

/** Try to turn a failed (non-nat-1) attack into a hit. Returns the die result or 0. */
export function tryBardicInspiration(
  uses: number,
  natural: number,
  total: number,
  ac: number,
  tier: number,
  rng: { (): number },
): { uses: number; bonus: number; total: number } {
  if (uses <= 0 || natural === 1 || total >= ac) return { uses, bonus: 0, total }
  const sides = inspirationDie(tier)
  const bonus = roll(`1d${sides}`, rng)
  return { uses: uses - 1, bonus, total: total + bonus }
}
