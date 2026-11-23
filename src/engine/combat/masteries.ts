import { getItem, type WeaponMastery } from '../../data/items'
import type { MonsterDef } from '../../data/monsters'
import type { SkillProgress } from '../../types/game'
import type { TradeSkillId } from '../../data/skills'
import { activePerks, nickCeiling } from '../abilities'
import { PUSH_DELAY_FRACTION } from '../config'
import { applyDamageModifiers } from '../damage'
import { rollDamageParts } from '../dice'
import type { Equipment } from '../equipment'
import type { Rng } from '../rng'
import {
  type CombatFight,
  computeMonsterIntervalMs,
  playerWeapon,
  savingThrow,
} from './state'

export function applyHitMasteries(input: {
  fight: CombatFight
  mastery: WeaponMastery | null
  monster: MonsterDef
  abilityBonus: number
  prof: number
  rng: Rng
  equipment: Equipment
  weapon: ReturnType<typeof playerWeapon>
  before: number
  dealt: number
  skills: Record<TradeSkillId, SkillProgress>
}): string {
  const { fight, mastery, monster, abilityBonus, prof, rng, equipment, weapon, before, dealt } = input
  let line = ''
    const overflow = before > 0 && fight.monsterHp === 0 ? dealt - before : 0
    if (mastery === 'cleave' && overflow > 0) fight.cleaveOverflow += overflow

    // Masteries on hit
    if (mastery === 'vex') fight.nextAttackAdvantage = true
    if (mastery === 'sap') fight.monsterNextDisadvantage = true
    if (mastery === 'slow' && !fight.slowActive) {
      fight.slowActive = true
      fight.monsterIntervalMs = computeMonsterIntervalMs(monster, true)
    }
    if (mastery === 'push') {
      fight.pushDelayMs = fight.monsterIntervalMs * PUSH_DELAY_FRACTION
    }
    if (mastery === 'topple') {
      const dc = 8 + prof + abilityBonus
      const save = savingThrow({
        rng,
        ability: 'CON',
        dc,
        abilityMod: monster.saveBonuses.CON ?? 0,
        proficient: false,
        proficiencyBonus: 0,
      })
      if (!save.success) {
        fight.nextAttackAdvantage = true
        line += ` Topple: prone.`
      } else {
        line += ` Topple: saved.`
      }
    }
    if (mastery === 'nick' && weapon?.properties.includes('light') && equipment.offHand) {
      const off = getItem(equipment.offHand)?.gear?.weapon
      if (off) {
        const ceiling = nickCeiling(activePerks({ skills: input.skills }))
        const nickRoll = 1 + Math.floor(rng() * 10)
        if (nickRoll <= ceiling) {
          const nickParts = rollDamageParts(off.dice, rng, false)
          const nickDmg = applyDamageModifiers(
            nickParts.total,
            off.damageType,
            monster.resistances,
            monster.vulnerabilities,
            monster.immunities,
          )
          fight.monsterHp = Math.max(0, fight.monsterHp - nickDmg)
          line += ` Nick ([${ceiling}/1d10]): ${nickRoll} - nick - [${off.dice}] offhand damage.`
        } else {
          line += ` Nick ([${ceiling}/1d10]): ${nickRoll} - no nick`
        }
      }
    }
  return line
}
