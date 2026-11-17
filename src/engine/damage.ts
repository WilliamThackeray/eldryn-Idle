import type { DamageType } from '../data/items/types'

export function applyDamageModifiers(
  amount: number,
  damageType: DamageType,
  resistances: readonly DamageType[],
  vulnerabilities: readonly DamageType[],
  immunities: readonly DamageType[],
): number {
  if (amount <= 0) return 0
  if (immunities.includes(damageType)) return 0

  const resisted = resistances.includes(damageType)
  const vulnerable = vulnerabilities.includes(damageType)
  if (resisted && vulnerable) return Math.floor(amount)
  if (resisted) return Math.floor(amount * 0.5)
  if (vulnerable) return Math.floor(amount * 2)
  return Math.floor(amount)
}
