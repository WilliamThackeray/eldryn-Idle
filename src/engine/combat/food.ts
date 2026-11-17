import { getItem } from '../../data/items'
import type { AbilityAbbr, SkillProgress } from '../../types/game'
import type { SkillId } from '../../data/skills'
import { AUTO_EAT_THRESHOLD } from '../config'
import type { Equipment } from '../equipment'
import { removeItems, type Inventory } from '../inventory'
import { addXp, applyXpModifiers } from '../xp'
import { type CombatFight, pushLog } from './state'

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
  const foodId = equipment.food
  const item = foodId ? getItem(foodId) : undefined
  const heal = item?.heal
  if (!foodId || heal == null || (inventory[foodId] ?? 0) <= 0) {
    fight.defeated = true
    pushLog(fight, 'No food left. Returning to town.', trace)
    return { inventory, skills, ate: false, defeated: true }
  }
  inventory = removeItems(inventory, [{ itemId: foodId, quantity: 1 }])
  const before = fight.playerHp
  fight.playerHp = Math.min(fight.playerMaxHp, fight.playerHp + heal)
  const healed = fight.playerHp - before
  if (healed > 0) {
    const vitalityXp = applyXpModifiers(healed, 'CON', input.modifiers)
    skills = { ...skills, vitality: { xp: addXp(skills.vitality.xp, vitalityXp) } }
  }
  pushLog(fight, `Eat ${item?.name ?? foodId}: +${heal} HP.`, trace)
  return { inventory, skills, ate: true, defeated: false }
}
