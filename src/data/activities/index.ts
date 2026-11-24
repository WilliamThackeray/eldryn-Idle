import type { TradeSkillId } from '../skills'
import { alchemyActivities } from './alchemy'
import { bindingActivities } from './binding'
import { commerceActivities } from './commerce'
import { cookingActivities } from './cooking'
import { enchantingActivities } from './enchanting'
import { fishingActivities } from './fishing'
import { foragingActivities } from './foraging'
import { huntingActivities } from './hunting'
import { jewelcraftingActivities } from './jewelcrafting'
import { leatherworkingActivities } from './leatherworking'
import { miningActivities } from './mining'
import { performanceActivities } from './performance'
import { scribingActivities } from './scribing'
import { skillingGearActivities } from './skillingGear'
import { smithingActivities } from './smithing'
import { thieveryActivities } from './thievery'
import { weavingActivities } from './weaving'
import { woodcraftActivities } from './woodcraft'
import { woodcuttingActivities } from './woodcutting'
import type { ActivityDef } from './types'

export type { ActivityDef, GoldDrop, ItemStack, LootEntry } from './types'

export const ACTIVITIES: ActivityDef[] = [
  ...miningActivities,
  ...smithingActivities,
  ...woodcuttingActivities,
  ...woodcraftActivities,
  ...leatherworkingActivities,
  ...jewelcraftingActivities,
  ...thieveryActivities,
  ...cookingActivities,
  ...alchemyActivities,
  ...scribingActivities,
  ...enchantingActivities,
  ...weavingActivities,
  ...foragingActivities,
  ...fishingActivities,
  ...huntingActivities,
  ...commerceActivities,
  ...performanceActivities,
  ...bindingActivities,
  ...skillingGearActivities,
]

const BY_KEY = new Map(ACTIVITIES.map((activity) => [`${activity.skillId}:${activity.id}`, activity]))

export function getActivity(skillId: TradeSkillId, activityId: string): ActivityDef | undefined {
  return BY_KEY.get(`${skillId}:${activityId}`)
}

export function activitiesFor(skillId: TradeSkillId): ActivityDef[] {
  return ACTIVITIES.filter((activity) => activity.skillId === skillId)
}
