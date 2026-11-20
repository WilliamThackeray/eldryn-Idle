import type { AbilityAbbr } from '../types/game'
import {
  MAX_LEVEL,
  PROFICIENCY_BASE,
  PROFICIENCY_TIER_SPAN,
  TIER_DIVISOR,
  XP_EXPONENT_BASE,
  XP_EXPONENT_DIVISOR,
  XP_LEVEL_COEFFICIENT,
  XP_SUM_DIVISOR,
} from './config'

const xpToReach: number[] = [0, 0]
{
  let points = 0
  for (let level = 1; level < MAX_LEVEL; level++) {
    points += Math.floor(level + XP_LEVEL_COEFFICIENT * XP_EXPONENT_BASE ** (level / XP_EXPONENT_DIVISOR))
    xpToReach[level + 1] = Math.floor(points / XP_SUM_DIVISOR)
  }
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  if (level >= MAX_LEVEL) return xpToReach[MAX_LEVEL]
  return xpToReach[level] ?? 0
}

export function levelForXp(xp: number): number {
  const safe = sanitizeXp(xp)
  let level = 1
  for (let next = 2; next <= MAX_LEVEL; next++) {
    if (safe < xpToReach[next]) break
    level = next
  }
  return level
}

/** Tier = ceil(level / 5), clamped to 1–20. */
export function tier(level: number): number {
  const safe = Math.min(MAX_LEVEL, Math.max(1, Math.trunc(level)))
  return Math.ceil(safe / TIER_DIVISOR)
}

export function proficiency(skillTier: number): number {
  return PROFICIENCY_BASE + Math.floor((skillTier - 1) / PROFICIENCY_TIER_SPAN)
}

export interface XpProgress {
  level: number
  xp: number
  xpToNextLevel: number
  progress: number
  capped: boolean
}

export function progressToNext(xp: number): XpProgress {
  const safe = sanitizeXp(xp)
  const level = levelForXp(safe)
  const floorXp = xpForLevel(level)
  const capped = level >= MAX_LEVEL
  const xpToNextLevel = capped ? floorXp : xpForLevel(level + 1)
  const span = xpToNextLevel - floorXp
  const progress = capped || span <= 0 ? 100 : Math.min(100, ((safe - floorXp) / span) * 100)
  return { level, xp: safe, xpToNextLevel, progress, capped }
}

/** `modifiers` are fractions: 0.3 is +30% XP for that ability. Rolls ignore them. `extra` stacks additively (e.g. History tomes). */
export function applyXpModifiers(
  baseXp: number,
  skillAbility: AbilityAbbr,
  modifiers: Partial<Record<AbilityAbbr, number>>,
  extra = 0,
): number {
  return baseXp * (1 + (modifiers[skillAbility] ?? 0) + extra)
}

export function addXp(xp: number, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return xp
  return sanitizeXp(xp) + amount
}

function sanitizeXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0
  return xp
}
