import { activityXp } from './define'
import type { ActivityDef } from './types'

const LOCKED = new Set<string>()

/** Keep this activity on its requiredLevel when a skill would otherwise slide it forward. */
export function lockUnlock(skillId: string, id: string) {
  LOCKED.add(`${skillId}:${id}`)
}

function key(activity: ActivityDef): string {
  return `${activity.skillId}:${activity.id}`
}

/** Scrolls, inscriptions, and tome copies are not part of the per-level cap. */
export function countsTowardCap(activity: ActivityDef): boolean {
  if (activity.id.startsWith('craft-tome-')) return false
  if (activity.id.startsWith('scribe-') || activity.id.startsWith('inscribe-')) return false
  return true
}

function capAt(level: number): number {
  return level === 1 ? 3 : 4
}

/**
 * Slide flexible activities forward so a skill never shows more than 3 unlocks at level 1
 * or 4 at any later level. Locked activities stay put.
 */
export function capSkillLevels(activities: ActivityDef[]): void {
  const bySkill = new Map<string, ActivityDef[]>()
  for (const activity of activities) {
    const list = bySkill.get(activity.skillId) ?? []
    list.push(activity)
    bySkill.set(activity.skillId, list)
  }
  for (const group of bySkill.values()) {
    const pacing = group.filter(countsTowardCap)
    const count = new Map<number, number>()
    const locked = pacing.filter((activity) => LOCKED.has(key(activity)))
    const flex = pacing.filter((activity) => !LOCKED.has(key(activity)))
    for (const activity of locked) {
      count.set(activity.requiredLevel, (count.get(activity.requiredLevel) ?? 0) + 1)
    }
    for (const activity of flex.sort((a, b) => a.requiredLevel - b.requiredLevel || a.id.localeCompare(b.id))) {
      let level = activity.requiredLevel
      while ((count.get(level) ?? 0) >= capAt(level)) level += 1
      activity.requiredLevel = level
      count.set(level, (count.get(level) ?? 0) + 1)
    }
    for (const activity of group) {
      activity.xp = activityXp(activity.requiredLevel, activity.kind)
    }
  }
}
