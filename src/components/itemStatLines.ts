import { getItem } from '../data/items'
import { getSkill, isSkillId } from '../data/skills'

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
          gear.armor.stealthDisadvantage ? ' · Thievery disadvantage' : ''
        }`,
      )
      if (gear.armor.strRequirement != null) lines.push(`Requires STR ${gear.armor.strRequirement}`)
    }
    if (gear.shield) lines.push('Shield +2 AC')
    if (gear.material) lines.push(`Material: ${gear.material}`)
    if (gear.rider) lines.push(`Rider ${gear.rider.dice} ${gear.rider.damageType}`)
    if (gear.summon) {
      lines.push(
        `Summon HP ${gear.summon.hp} · AC ${gear.summon.ac} · +${gear.summon.toHit} · ${gear.summon.damage}`,
      )
    }
    const stats = gear.stats
    if (stats) {
      if (stats.ac) lines.push(`AC +${stats.ac}`)
      if (stats.toHit) lines.push(`To hit +${stats.toHit}`)
      if (stats.damage) lines.push(`Damage +${stats.damage}`)
      if (stats.saveBonus) lines.push(`Saves +${stats.saveBonus}`)
      if (stats.maxHp) lines.push(`Max HP +${stats.maxHp}`)
      if (stats.spellAttack) lines.push(`Spell attack +${stats.spellAttack}`)
      if (stats.spellSaveDc) lines.push(`Spell save DC +${stats.spellSaveDc}`)
      if (stats.componentSaveChance)
        lines.push(`Component save +${Math.round(stats.componentSaveChance * 100)}%`)
      if (stats.resistances?.length) lines.push(`Resist ${stats.resistances.join(', ')}`)
      for (const [skillId, value] of Object.entries(stats.skillCheck ?? {})) {
        if (value == null || !isSkillId(skillId)) continue
        lines.push(`${getSkill(skillId).name} check +${value}`)
      }
      for (const [skillId, value] of Object.entries(stats.skillXpPct ?? {})) {
        if (value == null || !isSkillId(skillId)) continue
        lines.push(`${getSkill(skillId).name} XP +${value}%`)
      }
      for (const [skillId, value] of Object.entries(stats.skillSpeedPct ?? {})) {
        if (value == null || !isSkillId(skillId)) continue
        lines.push(`${getSkill(skillId).name} speed +${value}%`)
      }
    }
  }
  return lines
}
