import type { Rng } from './rng'

export type RollMode = 'normal' | 'advantage' | 'disadvantage'

const DIE_FACES = /^(\d+d\d+)([+-]\d+d\d+)*([+-]\d+)?$/
const FLAT_ONLY = /^\d+$/

export function resolveRollMode(sources: Array<'advantage' | 'disadvantage'>): RollMode {
  const advantage = sources.includes('advantage')
  const disadvantage = sources.includes('disadvantage')
  if (advantage === disadvantage) return 'normal'
  return advantage ? 'advantage' : 'disadvantage'
}

export function rollD20(rng: Rng, mode: RollMode = 'normal'): number {
  const first = die(20, rng)
  if (mode === 'normal') return first
  const second = die(20, rng)
  return mode === 'advantage' ? Math.max(first, second) : Math.min(first, second)
}

/** shortcut: no keep-highest/lowest or parentheses, upgrade when attack notation needs them. */
export function roll(notation: string, rng: Rng): number {
  const compact = notation.replace(/\s+/g, '')
  if (FLAT_ONLY.test(compact)) return Number(compact)
  if (!DIE_FACES.test(compact)) throw new Error(`Bad dice notation: ${notation}`)

  let total = 0
  for (const match of compact.matchAll(/([+-]?)(\d+)d(\d+)|([+-])(\d+)/g)) {
    const sign = match[1] === '-' || match[4] === '-' ? -1 : 1
    if (match[2]) {
      const count = Number(match[2])
      const sides = Number(match[3])
      for (let i = 0; i < count; i++) total += sign * die(sides, rng)
    } else {
      total += sign * Number(match[5])
    }
  }
  return total
}

/** Roll dice (optionally doubled for a crit) and flat bonuses separately. `extraCritDice` adds that many of the first die on crits (Brutal). */
export function rollDamageParts(
  notation: string,
  rng: Rng,
  crit = false,
  extraCritDice = 0,
): { dice: number; flat: number; total: number } {
  const compact = notation.replace(/\s+/g, '')
  if (FLAT_ONLY.test(compact)) {
    const flat = Number(compact)
    return { dice: 0, flat, total: flat }
  }
  if (!DIE_FACES.test(compact)) throw new Error(`Bad dice notation: ${notation}`)

  let dice = 0
  let flat = 0
  let firstDieSides: number | null = null
  for (const match of compact.matchAll(/([+-]?)(\d+)d(\d+)|([+-])(\d+)/g)) {
    if (match[2]) {
      const sign = match[1] === '-' ? -1 : 1
      const count = Number(match[2]) * (crit ? 2 : 1)
      const sides = Number(match[3])
      if (firstDieSides == null) firstDieSides = sides
      for (let i = 0; i < count; i++) dice += sign * die(sides, rng)
    } else {
      flat += (match[4] === '-' ? -1 : 1) * Number(match[5])
    }
  }
  if (crit && extraCritDice > 0 && firstDieSides != null) {
    for (let i = 0; i < extraCritDice; i++) dice += die(firstDieSides, rng)
  }
  return { dice, flat, total: dice + flat }
}

function die(sides: number, rng: Rng): number {
  return 1 + Math.floor(rng() * sides)
}
