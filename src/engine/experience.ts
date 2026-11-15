export const MAX_SKILL_LEVEL = 99

// XP to reach level L = floor(sum_{l=1}^{L-1} floor(l + 300 * 2^(l/7)) / 4)
const xpToReach: number[] = [0, 0]
{
  let points = 0
  for (let level = 1; level < MAX_SKILL_LEVEL; level++) {
    points += Math.floor(level + 300 * 2 ** (level / 7))
    xpToReach[level + 1] = Math.floor(points / 4)
  }
}

export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0
  if (level >= MAX_SKILL_LEVEL) return xpToReach[MAX_SKILL_LEVEL]
  return xpToReach[level] ?? 0
}

export function levelFromXp(xp: number): number {
  const safe = sanitizeXp(xp)
  let level = 1
  for (let next = 2; next <= MAX_SKILL_LEVEL; next++) {
    if (safe < xpToReach[next]) break
    level = next
  }
  return level
}

export interface XpProgress {
  level: number
  xp: number
  xpToNextLevel: number
  progress: number
  capped: boolean
}

export function describeXp(xp: number): XpProgress {
  const safe = sanitizeXp(xp)
  const level = levelFromXp(safe)
  const floor = xpToReachLevel(level)
  const capped = level >= MAX_SKILL_LEVEL
  const xpToNextLevel = capped ? floor : xpToReachLevel(level + 1)
  const span = xpToNextLevel - floor
  const progress = capped || span <= 0 ? 100 : Math.min(100, ((safe - floor) / span) * 100)
  return { level, xp: safe, xpToNextLevel, progress, capped }
}

export function addXp(xp: number, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return xp
  return sanitizeXp(xp) + amount
}

function sanitizeXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0
  return xp
}
