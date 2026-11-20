import { getItem } from '../../data/items'
import type { AbilityAbbr, SkillProgress } from '../../types/game'
import type { SkillId } from '../../data/skills'
import { activePerks, effectTotal } from '../abilities'
import { AUTO_EAT_THRESHOLD } from '../config'
import type { Equipment } from '../equipment'
import { removeItems, type Inventory } from '../inventory'
import { addXp, applyXpModifiers } from '../xp'
import { type CombatFight, pushLog } from './state'

/** Heal amount for one bite of the equipped food, after the CON food-heal perk. */
export function foodHealAmount(
  equipment: Equipment,
  skills: Record<SkillId, SkillProgress>,
): number | null {
  const foodId = equipment.food
  const item = foodId ? getItem(foodId) : undefined
  const heal = item?.heal
  if (!foodId || heal == null) return null
  const foodHealPct = effectTotal(activePerks({ skills }), 'foodHealPct')
  return Math.round(heal * (1 + foodHealPct))
}

/** Equipped food count in inventory (0 when nothing usable is equipped). */
export function equippedFoodCount(equipment: Equipment, inventory: Inventory): number {
  const foodId = equipment.food
  if (!foodId) return 0
  const item = getItem(foodId)
  if (item?.heal == null) return 0
  return inventory[foodId] ?? 0
}

/**
 * Consume one equipped food if available. Returns ate=false when the stack is empty
 * or the food slot is empty / non-healing — caller decides defeat vs rest stop.
 */
export function eatOneFood(input: {
  fight: CombatFight
  inventory: Inventory
  equipment: Equipment
  skills: Record<SkillId, SkillProgress>
  modifiers: Partial<Record<AbilityAbbr, number>>
  trace: boolean
}): { inventory: Inventory; skills: Record<SkillId, SkillProgress>; ate: boolean } {
  const { fight, equipment, trace } = input
  let inventory = input.inventory
  let skills = input.skills
  const foodId = equipment.food
  const item = foodId ? getItem(foodId) : undefined
  const heal = item?.heal
  if (!foodId || heal == null || (inventory[foodId] ?? 0) <= 0) {
    return { inventory, skills, ate: false }
  }
  inventory = removeItems(inventory, [{ itemId: foodId, quantity: 1 }])
  const healAmt = foodHealAmount(equipment, skills) ?? 0
  const before = fight.playerHp
  fight.playerHp = Math.min(fight.playerMaxHp, fight.playerHp + healAmt)
  const healed = fight.playerHp - before
  if (healed > 0) {
    const vitalityXp = applyXpModifiers(healed, 'CON', input.modifiers)
    skills = { ...skills, vitality: { xp: addXp(skills.vitality.xp, vitalityXp) } }
  }
  pushLog(fight, `Eat ${item?.name ?? foodId}: +${healAmt} HP.`, trace)
  return { inventory, skills, ate: true }
}

export function tryAutoEat(input: {
  fight: CombatFight
  inventory: Inventory
  equipment: Equipment
  skills: Record<SkillId, SkillProgress>
  modifiers: Partial<Record<AbilityAbbr, number>>
  trace: boolean
}): { inventory: Inventory; skills: Record<SkillId, SkillProgress>; ate: boolean; defeated: boolean } {
  const { fight, equipment, trace } = input
  let inventory = input.inventory
  let skills = input.skills
  if (fight.playerHp >= fight.playerMaxHp * AUTO_EAT_THRESHOLD) {
    return { inventory, skills, ate: false, defeated: false }
  }
  const bitten = eatOneFood({
    fight,
    inventory,
    equipment,
    skills,
    modifiers: input.modifiers,
    trace,
  })
  inventory = bitten.inventory
  skills = bitten.skills
  if (!bitten.ate) {
    fight.defeated = true
    pushLog(fight, 'No food left. Returning to town.', trace)
    return { inventory, skills, ate: false, defeated: true }
  }
  return { inventory, skills, ate: true, defeated: false }
}

/**
 * shortcut: ignores overheal waste and short-rest hit dice, replace when dungeon food pacing is shown separately.
 * Expected food per hour and hours until empty for the current hunt matchup.
 */
export function foodOutlook(input: {
  foodCount: number
  healPerBite: number
  hpLostPerKill: number
  cycleSec: number
}): { foodPerHour: number; hoursUntilEmpty: number } | null {
  if (input.foodCount <= 0 || input.healPerBite <= 0 || input.cycleSec <= 0) return null
  const bitesPerKill = input.hpLostPerKill / input.healPerBite
  const foodPerHour = (bitesPerKill / input.cycleSec) * 3600
  if (!(foodPerHour > 0)) return null
  return { foodPerHour, hoursUntilEmpty: input.foodCount / foodPerHour }
}
