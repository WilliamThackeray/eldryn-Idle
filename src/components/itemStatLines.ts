import { getItem } from '../data/items'

export function itemStatLines(itemId: string): string[] {
  const def = getItem(itemId)
  if (!def) return []
  const lines: string[] = []
  if (def.heal != null) lines.push(`Heals ${def.heal} HP`)
  const gear = def.gear
  if (gear) {
    if (gear.magicBonus) lines.push(`Magic +${gear.magicBonus}`)
    if (gear.weapon) {
      lines.push(
        `Weapon ${gear.weapon.dice} ${gear.weapon.damageType}${
          gear.weapon.versatileDice ? ` (versatile ${gear.weapon.versatileDice})` : ''
        }`,
      )
      if (gear.weapon.properties.length) lines.push(`Properties: ${gear.weapon.properties.join(', ')}`)
      lines.push(`Mastery: ${gear.weapon.mastery}`)
    }
    if (gear.armor) {
      lines.push(
        `Armor ${gear.armor.weightClass} · value ${gear.armor.armorValue}${
          gear.armor.stealthDisadvantage ? ' · stealth disadvantage' : ''
        }`,
      )
      if (gear.armor.strRequirement != null) lines.push(`Requires STR ${gear.armor.strRequirement}`)
    }
    if (gear.shield) lines.push('Shield +2 AC')
    if (gear.material) lines.push(`Material: ${gear.material}`)
  }
  return lines
}
