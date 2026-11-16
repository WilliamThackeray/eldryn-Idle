import type { SkillId } from '../skills'
import { acrobaticsActivities } from './acrobatics'
import { animalHandlingActivities } from './animalHandling'
import { arcanaActivities } from './arcana'
import { athleticsActivities } from './athletics'
import { deceptionActivities } from './deception'
import { historyActivities } from './history'
import { insightActivities } from './insight'
import { intimidationActivities } from './intimidation'
import { investigationActivities } from './investigation'
import { medicineActivities } from './medicine'
import { natureActivities } from './nature'
import { perceptionActivities } from './perception'
import { performanceActivities } from './performance'
import { persuasionActivities } from './persuasion'
import { religionActivities } from './religion'
import { sleightOfHandActivities } from './sleightOfHand'
import { stealthActivities } from './stealth'
import { survivalActivities } from './survival'
import type { ActivityDef } from './types'
import { vitalityActivities } from './vitality'

export type { ActivityDef, GoldDrop, ItemStack, LootEntry } from './types'

export const ACTIVITIES: ActivityDef[] = [
  ...athleticsActivities,
  ...survivalActivities,
  ...sleightOfHandActivities,
  ...natureActivities,
  ...medicineActivities,
  ...acrobaticsActivities,
  ...animalHandlingActivities,
  ...arcanaActivities,
  ...deceptionActivities,
  ...historyActivities,
  ...insightActivities,
  ...intimidationActivities,
  ...investigationActivities,
  ...perceptionActivities,
  ...performanceActivities,
  ...persuasionActivities,
  ...religionActivities,
  ...stealthActivities,
  ...vitalityActivities,
]

const BY_KEY = new Map(ACTIVITIES.map((activity) => [`${activity.skillId}:${activity.id}`, activity]))

export function getActivity(skillId: SkillId, activityId: string): ActivityDef | undefined {
  return BY_KEY.get(`${skillId}:${activityId}`)
}

export function activitiesFor(skillId: SkillId): ActivityDef[] {
  return ACTIVITIES.filter((activity) => activity.skillId === skillId)
}
