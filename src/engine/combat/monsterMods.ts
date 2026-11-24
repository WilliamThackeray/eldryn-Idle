import type { MonsterDef } from '../../data/monsters'
import {
  MOD_ARMORED_AC,
  MOD_ELUSIVE_HIT,
  MOD_ENRAGE_DAMAGE,
  MOD_ENRAGE_HP,
  MOD_FRENZY_SPEED,
  MOD_HULKING_DICE,
  MOD_HULKING_HP,
  MOD_REGEN_PCT,
  MOD_VENOM_DICE,
  MOD_VENOM_INTERVALS,
  MONSTER_INTERVAL_SEC,
} from '../config'

export const MONSTER_MOD_IDS = [
  'frenzied',
  'armored',
  'regenerating',
  'venomous',
  'enraged',
  'elusive',
  'hulking',
] as const

export type MonsterModId = (typeof MONSTER_MOD_IDS)[number]

export const MONSTER_MOD_LABEL: Record<MonsterModId, string> = {
  frenzied: 'Frenzied',
  armored: 'Armored',
  regenerating: 'Regenerating',
  venomous: 'Venomous',
  enraged: 'Enraged',
  elusive: 'Elusive',
  hulking: 'Hulking',
}

export function isMonsterModId(value: string): value is MonsterModId {
  return (MONSTER_MOD_IDS as readonly string[]).includes(value)
}

export interface MonsterProfile {
  ac: number
  hp: number
  intervalMs: number
  regenPct: number
  venomDice: string | null
  venomIntervals: number
  enrageBelow: number
  enrageDamagePct: number
  extraDamageDie: number
}

/** Data-driven stat hook. Callers in the turn pipeline read this instead of the raw def. */
export function monsterProfile(monster: MonsterDef, mods: readonly MonsterModId[]): MonsterProfile {
  const set = new Set(mods)
  let hp = monster.hp
  let ac = monster.ac
  let intervalMs = MONSTER_INTERVAL_SEC[monster.size] * 1000
  if (set.has('hulking')) hp = Math.max(1, Math.floor(hp * (1 + MOD_HULKING_HP)))
  if (set.has('armored')) ac += MOD_ARMORED_AC
  if (set.has('elusive')) ac += Math.round(MOD_ELUSIVE_HIT * 20)
  if (set.has('frenzied')) intervalMs = Math.max(1, Math.floor(intervalMs * (1 - MOD_FRENZY_SPEED)))
  return {
    ac,
    hp,
    intervalMs,
    regenPct: set.has('regenerating') ? MOD_REGEN_PCT : 0,
    venomDice: set.has('venomous') ? MOD_VENOM_DICE : null,
    venomIntervals: set.has('venomous') ? MOD_VENOM_INTERVALS : 0,
    enrageBelow: set.has('enraged') ? MOD_ENRAGE_HP : 0,
    enrageDamagePct: set.has('enraged') ? MOD_ENRAGE_DAMAGE : 0,
    extraDamageDie: set.has('hulking') ? MOD_HULKING_DICE : 0,
  }
}

/** Elusive is folded into AC (−10% hit chance ≈ +2 AC). `toHitPenalty` is a flat penalty such as Choking Spores. */
export function modifiedAc(monster: MonsterDef, mods: readonly MonsterModId[], toHitPenalty = 0): number {
  return monsterProfile(monster, mods).ac + Math.max(0, toHitPenalty)
}

export function regenHeal(maxHp: number, mods: readonly MonsterModId[]): number {
  if (!mods.includes('regenerating')) return 0
  return Math.max(1, Math.floor(maxHp * MOD_REGEN_PCT))
}

/** Append extra dice of the first die size. "2d8+4" + 1 → "2d8+4+1d8". */
export function addDamageDice(notation: string, extra: number): string {
  if (extra <= 0) return notation
  const match = notation.match(/d(\d+)/)
  if (!match) return notation
  return `${notation}+${extra}d${match[1]}`
}
