import { combatGateFor } from '../tiers'
import type { ActivityDef } from './types'

/** Adds the tier's combat material to a best-in-tier recipe that does not already list it. */
export function withCombatGates(activities: ActivityDef[]): ActivityDef[] {
  return activities.map((activity) => {
    const output = activity.outputs[0]?.itemId
    if (!output) return activity
    const gate = combatGateFor(output)
    if (!gate) return activity
    if (activity.inputs?.some((stack) => stack.itemId === gate)) return activity
    return { ...activity, inputs: [...(activity.inputs ?? []), { itemId: gate, quantity: 1 }] }
  })
}
