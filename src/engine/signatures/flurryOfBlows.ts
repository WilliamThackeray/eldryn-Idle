import type { SignatureHooks } from './types'

function martialArtsDie(tier: number): number {
  if (tier >= 13) return 12
  if (tier >= 9) return 10
  if (tier >= 5) return 8
  return 6
}

/** Every 3rd player interval queues an extra unarmed strike (handled by combat). */
export const flurryOfBlows: SignatureHooks = {
  onFightStart(ctx) {
    ctx.runtime.flurryInterval = 0
  },
  onBeforeAttack(ctx) {
    ctx.runtime.flurryInterval += 1
  },
}

export function flurryDieSides(tier: number): number {
  return martialArtsDie(tier)
}

export function shouldFlurry(intervalIndex: number): boolean {
  return intervalIndex > 0 && intervalIndex % 3 === 0
}
