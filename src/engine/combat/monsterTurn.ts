import { getClass, type ClassId } from '../../data/classes'
import type { DamageType } from '../../data/items'
import type { MonsterDef } from '../../data/monsters'
import type { AbilityAbbr, SkillProgress } from '../../types/game'
import type { SkillId } from '../../data/skills'
import { applyDamageModifiers } from '../damage'
import { resolveRollMode, rollD20, rollDamageParts } from '../dice'
import { emptyEquipment, totalItemStats, type Equipment } from '../equipment'
import type { Rng } from '../rng'
import { getSignatureHooks, tryWildShape } from '../signatures'
import { concentrationDc } from '../spells'
import { addXp, applyXpModifiers, levelForXp, proficiency, tier } from '../xp'
import { abilityModMap, type CombatFight, playerArmorClass, pushLog, savingThrow, tryRelentless } from './state'

export function applyPlayerDamage(input: {
  fight: CombatFight
  amount: number
  damageType: DamageType
  skills: Record<SkillId, SkillProgress>
  activeClassId: ClassId
  classXp: number
  rng: Rng
  trace: boolean
  modifiers: Partial<Record<AbilityAbbr, number>>
  equipment?: Equipment
}): { skills: Record<SkillId, SkillProgress>; defeated: boolean } {
  const { fight, rng, trace } = input
  let skills = input.skills
  let amount = input.amount
  const cls = getClass(input.activeClassId)
  const mods = abilityModMap(skills)
  const classTier = tier(levelForXp(input.classXp))
  const hooks = getSignatureHooks(fight.signature.id)
  const itemStats = totalItemStats(input.equipment ?? emptyEquipment())

  if (fight.concentration === 'protectionFromEnergyFire' && input.damageType === 'fire') {
    amount = Math.floor(amount / 2)
  }

  hooks.onDamaged?.({
    runtime: fight.signature,
    tier: classTier,
    abilityMod: (abbr) => mods[abbr],
    rng,
    trace,
    log: (line) => pushLog(fight, line, trace),
    damage: amount,
    damageType: input.damageType,
    setDamage: (next) => {
      amount = next
    },
  })

  // Adamantine: crits become normal — handled at attack time if needed later.
  const taken = applyDamageModifiers(
    Math.max(0, amount),
    input.damageType,
    itemStats.resistances,
    [],
    [],
  )
  if (taken > 0) {
    if (fight.shieldBonus > 0) fight.shieldBonus = 0
    fight.playerHp = Math.max(0, fight.playerHp - taken)
    const vitalityXp = applyXpModifiers(taken, 'CON', input.modifiers)
    skills = {
      ...skills,
      vitality: { xp: addXp(skills.vitality.xp, vitalityXp) },
    }

    if (fight.concentration) {
      const dc = concentrationDc(taken)
      const save = savingThrow({
        rng,
        ability: 'CON',
        dc,
        abilityMod: mods.CON + itemStats.saveBonus,
        proficient: cls.saveProficiencies.some((save) => save === 'CON'),
        proficiencyBonus: proficiency(classTier),
      })
      if (save.success) {
        pushLog(fight, `Concentration DC ${dc}: ${save.total} - held.`, trace)
      } else {
        pushLog(fight, `Concentration DC ${dc}: ${save.total} - broken.`, trace)
        fight.concentration = null
      }
    }
  }

  if (fight.playerHp <= 0 && tryRelentless(fight, skills)) {
    pushLog(fight, 'Relentless: you hang on at 1 HP.', trace)
  }

  if (fight.playerHp > 0) {
    hooks.onLowHp?.({
      runtime: fight.signature,
      tier: classTier,
      abilityMod: (abbr) => mods[abbr],
      rng,
      trace,
      log: (line) => pushLog(fight, line, trace),
      hp: fight.playerHp,
      maxHp: fight.playerMaxHp,
      heal: (healAmt) => {
        if (healAmt <= 0) return
        fight.playerHp = Math.min(fight.playerMaxHp, fight.playerHp + healAmt)
        const vitalityXp = applyXpModifiers(healAmt, 'CON', input.modifiers)
        skills = {
          ...skills,
          vitality: { xp: addXp(skills.vitality.xp, vitalityXp) },
        }
      },
    })
    return { skills, defeated: false }
  }

  // Wild Shape
  if (fight.signature.id === 'wildShape') {
    const temp = tryWildShape(fight.signature.wildShapeUsed, classTier)
    if (temp != null) {
      fight.signature.wildShapeUsed = true
      fight.playerHp = temp
      pushLog(fight, `Wild Shape: ${temp} temporary HP.`, trace)
      return { skills, defeated: false }
    }
  }

  fight.defeated = true
  pushLog(fight, 'You fall. Returning to town.', trace)
  return { skills, defeated: true }
}

export function resolveMonsterAttacks(input: {
  fight: CombatFight
  monster: MonsterDef
  equipment: Equipment
  dexMod: number
  skills: Record<SkillId, SkillProgress>
  activeClassId: ClassId
  classXp: number
  rng: Rng
  trace: boolean
  modifiers: Partial<Record<AbilityAbbr, number>>
}): { skills: Record<SkillId, SkillProgress>; defeated: boolean } {
  const { fight, monster, equipment, trace } = input
  let skills = input.skills
  fight.monsterProgressMs = 0
  const playerAc = playerArmorClass(fight, equipment, input.dexMod)
      const disadvSources: Array<'advantage' | 'disadvantage'> = []
      if (fight.monsterNextDisadvantage) disadvSources.push('disadvantage')
      if (fight.concentration === 'blur') disadvSources.push('disadvantage')
      const mode = resolveRollMode(disadvSources)
      fight.monsterNextDisadvantage = false

      for (const attack of monster.attacks) {
        const natural = rollD20(input.rng, mode)
        const total = natural + attack.toHit
        const autoMiss = natural === 1
        const crit = natural === 20
        const hit = !autoMiss && (crit || total >= playerAc)
        let line = `${monster.name} ${attack.name}: to hit ${total} - ${hit ? 'hits' : 'misses'}.`
        if (hit) {
          const parts = rollDamageParts(attack.damage, input.rng, crit)
          const dealt = parts.total
          line += ` ${dealt} ${attack.damageType}.`
          pushLog(fight, line, trace)
          const result = applyPlayerDamage({
            fight,
            amount: dealt,
            damageType: attack.damageType,
            skills,
            activeClassId: input.activeClassId,
            classXp: input.classXp,
            rng: input.rng,
            trace,
            modifiers: input.modifiers,
            equipment: input.equipment,
          })
          skills = result.skills
          if (result.defeated) return { skills, defeated: true }
        } else {
          pushLog(fight, line, trace)
        }
      }
  return { skills, defeated: false }
}
