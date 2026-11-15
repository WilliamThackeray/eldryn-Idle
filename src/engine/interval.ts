import { DEX_SPEED_PER_MOD, MIN_INTERVAL_FRACTION } from './config'

export function intervalMs(baseMs: number, dexMod: number, otherSpeedBonus: number, usesDex: boolean): number {
  const dex = usesDex ? dexMod : 0
  const scaled = baseMs * (1 - DEX_SPEED_PER_MOD * dex) * (1 - otherSpeedBonus)
  return Math.max(MIN_INTERVAL_FRACTION * baseMs, scaled)
}
