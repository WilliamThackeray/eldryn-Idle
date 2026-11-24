import { ACTIVITIES, type ActivityDef } from '../data/activities'
import { parseTomeActivityId } from '../data/historyContent'
import { getItem } from '../data/items'
import { SKILLS, type TradeSkillId } from '../data/skills'
import { activityUnlocked, type QuestProgress } from './quest'
import { spellOnClassList } from './spells'
import type { ClassId } from '../data/classes'
import { TOME_SKILL_GATE_STEP } from './config'
import { levelForXp } from './xp'

export interface Viewer {
  skills: Record<string, { xp: number }>
  renown: number
  classId: ClassId | null
  secondaryClassId: ClassId | null
  questProgress: QuestProgress
}

export interface ActivityPresentation {
  visible: boolean
  /** Real name, "Requires a quest", or "A Smithing activity (Lv N)". */
  label: string
  lock: 'level' | 'renown' | 'quest' | null
}

function skillName(skillId: string): string {
  return SKILLS.find((skill) => skill.id === skillId)?.name ?? skillId
}

function spellIdOf(activity: ActivityDef): string | null {
  if (activity.learnSpell) return activity.learnSpell
  if (activity.id.startsWith('scribe-')) return activity.id.slice('scribe-'.length)
  if (activity.id.startsWith('inscribe-')) return activity.id.slice('inscribe-'.length)
  return null
}

export function skillLevel(viewer: Viewer, skillId: string): number {
  return levelForXp(viewer.skills[skillId]?.xp ?? 0)
}

/** Spells off the class list, and tomes for a skill the player has not trained, stay out of the list. */
export function activityIsListed(activity: ActivityDef, viewer: Viewer): boolean {
  const spellId = spellIdOf(activity)
  if (spellId && !spellOnClassList(spellId, viewer.classId, viewer.secondaryClassId)) return false
  const tome = parseTomeActivityId(activity.id)
  if (tome && skillLevel(viewer, tome.skillId) < (tome.volume - 1) * TOME_SKILL_GATE_STEP) return false
  return true
}

function masked(activity: ActivityDef): string {
  return `A ${skillName(activity.skillId)} activity (Lv ${activity.requiredLevel})`
}

export function presentActivity(activity: ActivityDef, viewer: Viewer): ActivityPresentation {
  if (!activityIsListed(activity, viewer)) {
    return { visible: false, label: masked(activity), lock: 'level' }
  }
  if (skillLevel(viewer, activity.skillId) < activity.requiredLevel) {
    return { visible: false, label: masked(activity), lock: 'level' }
  }
  if (activity.renownRequired != null && viewer.renown < activity.renownRequired) {
    return { visible: false, label: masked(activity), lock: 'renown' }
  }
  if (!activityUnlocked(activity.requiresQuest, viewer.questProgress)) {
    return { visible: false, label: 'Requires a quest', lock: 'quest' }
  }
  return { visible: true, label: activity.name, lock: null }
}

export function newlyVisible(before: Viewer, after: Viewer): ActivityDef[] {
  return ACTIVITIES.filter((activity) => {
    const was = presentActivity(activity, before).visible
    return !was && presentActivity(activity, after).visible
  })
}

export function presentedActivityLabel(
  skillId: TradeSkillId,
  activityId: string,
  viewer: Viewer,
): string | null {
  const activity = ACTIVITIES.find((entry) => entry.skillId === skillId && entry.id === activityId)
  if (!activity) return null
  return presentActivity(activity, viewer).label
}

/** Mask a crafted item or set name when none of its recipes are visible. */
export function maskCraftLabel(skillNameText: string, label: string, viewer: Viewer): string {
  const skill = SKILLS.find((entry) => entry.name === skillNameText)
  if (!skill) return label
  const matches = ACTIVITIES.filter((activity) => {
    if (activity.skillId !== skill.id) return false
    if (activity.name.includes(label)) return true
    return activity.outputs.some((output) => (getItem(output.itemId)?.name ?? '').includes(label))
  })
  if (matches.length === 0) return label
  if (matches.some((activity) => presentActivity(activity, viewer).visible)) return label
  const earliest = matches.reduce((best, row) => (row.requiredLevel < best.requiredLevel ? row : best))
  return presentActivity(earliest, viewer).label
}
