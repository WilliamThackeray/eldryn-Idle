import type { DamageType, WeaponProperty } from '../data/items/types'
import type { MonsterArchetype } from '../data/monsters/types'
import { TRIANGLE_STRONG, TRIANGLE_WEAK } from './config'

export type AttackStyle = 'melee' | 'ranged' | 'magic'

export function attackStyleOf(weapon: {
  range: 'melee' | 'ranged'
  properties: readonly WeaponProperty[]
} | null | undefined): AttackStyle {
  if (!weapon) return 'melee'
  if (weapon.range === 'ranged' || weapon.properties.includes('thrown')) return 'ranged'
  return 'melee'
}

export function triangleMultiplier(style: AttackStyle, archetype: MonsterArchetype): number {
  if (archetype === 'standard') return 1
  const strong =
    (style === 'melee' && archetype === 'warded') ||
    (style === 'ranged' && archetype === 'skirmisher') ||
    (style === 'magic' && archetype === 'armored')
  if (strong) return 1 + TRIANGLE_STRONG
  const weak =
    (style === 'melee' && archetype === 'skirmisher') ||
    (style === 'ranged' && archetype === 'armored') ||
    (style === 'magic' && archetype === 'warded')
  if (weak) return 1 - TRIANGLE_WEAK
  return 1
}

export function applyTriangle(amount: number, style: AttackStyle, archetype: MonsterArchetype): number {
  if (amount <= 0) return 0
  return Math.floor(amount * triangleMultiplier(style, archetype))
}

export function triangleNote(style: AttackStyle, archetype: MonsterArchetype): string {
  if (archetype === 'standard') return ''
  const mult = triangleMultiplier(style, archetype)
  return ` ×${mult} (${style} vs ${archetype})`
}

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
