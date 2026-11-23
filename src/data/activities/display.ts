import type { SkillId } from '../skills'
import type { ActivityDef } from './types'

/** Skills with an explicit tab list. Anything else tabs only when it is large and categorized. */
export const SKILL_TABS: Partial<Record<SkillId, readonly string[]>> = {
  athletics: ['Mining', 'Smelting', 'Smithing'],
  survival: ['Woodcutting', 'Foraging', 'Fishing', 'Butchering', 'Fletching', 'Woodworking', 'Leatherworking'],
  history: ['Lore', 'Tomes', 'Study Notes', 'Bestiaries'],
  arcana: ['Study', 'Focuses', 'Attire', 'Reagents'],
  sleightOfHand: ['Trapping', 'Pickpocketing', 'Lockpicking', 'Jewelcrafting'],
  nature: ['Cooking', 'Gardening', 'Crafting', 'Attire'],
  religion: ['Worship', 'Crafting', 'Attire'],
  performance: ['Venues', 'Attire'],
}

export function skillUsesTabs(skillId: SkillId, activities: ActivityDef[]): boolean {
  if (SKILL_TABS[skillId]) return activities.length > 0
  if (activities.length <= 8) return false
  const categories = new Set(activities.map((activity) => activity.category).filter(Boolean))
  return categories.size >= 2
}

export function tabsFor(skillId: SkillId, activities: ActivityDef[]): string[] {
  if (!skillUsesTabs(skillId, activities)) return []
  const declared = SKILL_TABS[skillId]
  const present = declared
    ? declared.filter((tab) => activities.some((activity) => activity.category === tab))
    : [...new Set(activities.flatMap((activity) => (activity.category ? [activity.category] : [])))]
  return [...present]
}

export function fillDisplay(
  activities: ActivityDef[],
  pick: (activity: ActivityDef, index: number) => { category: string; group?: string; sortOrder?: number },
): ActivityDef[] {
  return activities.map((activity, index) => {
    if (activity.category) {
      return activity.sortOrder == null ? { ...activity, sortOrder: index } : activity
    }
    const extra = pick(activity, index)
    return {
      ...activity,
      category: extra.category,
      group: extra.group,
      sortOrder: extra.sortOrder ?? index,
    }
  })
}

export interface GroupParts {
  subtab?: string
  heading?: string
  subheading?: string
}

export function parseGroup(group?: string): GroupParts {
  if (!group) return {}
  const parts = group.split(' / ')
  if (parts.length >= 3) return { subtab: parts[0], heading: parts[1], subheading: parts.slice(2).join(' / ') }
  if (parts.length === 2) return { subtab: parts[0], heading: parts[1] }
  return { heading: parts[0] }
}

export function compareActivities(a: ActivityDef, b: ActivityDef): number {
  const order = (a.sortOrder ?? a.requiredLevel) - (b.sortOrder ?? b.requiredLevel)
  if (order !== 0) return order
  if (a.requiredLevel !== b.requiredLevel) return a.requiredLevel - b.requiredLevel
  return a.name.localeCompare(b.name)
}

export function visibleActivities<T extends { locked: boolean }>(
  items: T[],
  hideLocked: boolean,
  showAllLocked: boolean,
): { shown: T[]; hiddenLocked: number } {
  const unlocked = items.filter((item) => !item.locked)
  const locked = items.filter((item) => item.locked)
  if (hideLocked) return { shown: unlocked, hiddenLocked: 0 }
  if (showAllLocked || locked.length <= 1) return { shown: [...unlocked, ...locked], hiddenLocked: 0 }
  return { shown: [...unlocked, locked[0]!], hiddenLocked: locked.length - 1 }
}
