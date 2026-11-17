import type { SignatureHooks } from './types'

export const wildShape: SignatureHooks = {
  onFightStart(ctx) {
    ctx.runtime.wildShapeUsed = false
  },
}

/** Returns temporary HP if Wild Shape triggers, else null. */
export function tryWildShape(used: boolean, tier: number): number | null {
  if (used) return null
  return 5 * tier
}
