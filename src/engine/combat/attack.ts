import { type DamageType } from '../../data/items'
import { getItem } from '../../data/items'
import type { MonsterDef } from '../../data/monsters'
import type { ClassId } from '../../data/classes'
import type { AbilityAbbr, SkillProgress } from '../../types/game'
import type { SkillId } from '../../data/skills'
import { MATERIAL_FLAGS, AMMO_RECOVERY } from '../config'
import { applyDamageModifiers } from '../damage'
import { resolveRollMode, roll, rollD20, rollDamageParts } from '../dice'
import type { Equipment } from '../equipment'
import { addItems, removeItems, type Inventory } from '../inventory'
import type { Rng } from '../rng'
import { getSignatureHooks, tryBardicInspiration } from '../signatures'
import { spendLowestSlot, usesSpellLoop } from '../spells'
import { levelForXp, proficiency, tier } from '../xp'
import { applyHitMasteries } from './masteries'
import {
  abilityModMap,
  abilityScoreMap,
  attackAbilityMod,
  type CombatFight,
  type CombatLootGain,
  damageDice,
  damageTypeOf,
  masteryOf,
  playerMagicBonus,
  playerWeapon,
  pushLog,
} from './state'

export function recoverAmmo(inventory: Inventory, equipment: Equipment, spent: number): Inventory {
  if (spent <= 0) return inventory
  const ammoId = equipment.ammo
  if (!ammoId) return inventory
  const recovered = Math.floor(spent * AMMO_RECOVERY)
  if (recovered <= 0) return inventory
  return addItems(inventory, [{ itemId: ammoId, quantity: recovered }])
}

export function mergeLoot(existing: CombatLootGain[], gained: { itemId: string; quantity: number }[]): CombatLootGain[] {
  const next = [...existing]
  for (const stack of gained) {
    const found = next.find((entry) => entry.id === stack.itemId)
    const name = getItem(stack.itemId)?.name ?? stack.itemId
    if (found) found.quantity += stack.quantity
    else next.push({ id: stack.itemId, name, quantity: stack.quantity })
  }
  return next
}

export function spendAmmo(
  fight: CombatFight,
  inventory: Inventory,
  equipment: Equipment,
  trace: boolean,
): { inventory: Inventory; ok: boolean } {
  const weapon = playerWeapon(equipment)
  if (!weapon?.properties.includes('ammunition')) return { inventory, ok: true }
  const ammoId = equipment.ammo
  if (!ammoId || (inventory[ammoId] ?? 0) <= 0) {
    fight.outOfAmmo = true
    pushLog(fight, 'Out of ammo. Hunt stopped.', trace)
    return { inventory, ok: false }
  }
  fight.ammoSpent += 1
  return { inventory: removeItems(inventory, [{ itemId: ammoId, quantity: 1 }]), ok: true }
}

export function resolvePlayerAttack(input: {
  fight: CombatFight
  monster: MonsterDef
  skills: Record<SkillId, SkillProgress>
  equipment: Equipment
  inventory: Inventory
  activeClassId: ClassId
  classXp: number
  rng: Rng
  trace: boolean
  labelPrefix: string
  unarmedOverride?: { dice: string; damageType: DamageType; mastery: null }
}): {
  inventory: Inventory
  classXp: number
  skills: Record<SkillId, SkillProgress>
  killed: boolean
  stopped: boolean
} {
  const { fight, monster, equipment, rng, trace } = input
  let { inventory } = input
  const { classXp, skills } = input
  const mods = abilityModMap(skills)
  const scores = abilityScoreMap(skills)
  const classLevel = levelForXp(classXp)
  const classTier = tier(classLevel)
  const prof = proficiency(classTier)
  const weapon = input.unarmedOverride ? undefined : playerWeapon(equipment)
  const magic = input.unarmedOverride ? 0 : playerMagicBonus(equipment)
  const { mod: abilityBonus } = attackAbilityMod(weapon, mods)
  const mastery = input.unarmedOverride ? null : masteryOf(equipment)

  if (!input.unarmedOverride) {
    const ammo = spendAmmo(fight, inventory, equipment, trace)
    inventory = ammo.inventory
    if (!ammo.ok) return { inventory, classXp, skills, killed: false, stopped: true }
  }

  const heavyStrain =
    weapon?.properties.includes('heavy') &&
    scores.STR < 13 &&
    !(equipment.mainHand && getItem(equipment.mainHand)?.gear?.material === 'mithral' && MATERIAL_FLAGS.mithral.ignoresStrAndStealth)

  const advSources: Array<'advantage' | 'disadvantage'> = []
  if (fight.nextAttackAdvantage) advSources.push('advantage')
  if (fight.concentration === 'faerieFire') advSources.push('advantage')
  if (heavyStrain) advSources.push('disadvantage')
  fight.nextAttackAdvantage = false
  const mode = resolveRollMode(advSources)
  const hasAdvantage = mode === 'advantage'

  const hooks = getSignatureHooks(fight.signature.id)
  const sigCtx = {
    runtime: fight.signature,
    tier: classTier,
    abilityMod: (abbr: AbilityAbbr) => mods[abbr],
    rng,
    trace,
    log: (line: string) => pushLog(fight, line, trace),
  }
  hooks.onBeforeAttack?.({ ...sigCtx, hasAdvantage, intervalIndex: fight.playerIntervalCount })

  const natural = rollD20(rng, mode)
  let total = natural + abilityBonus + prof + magic
  let bardicNote = ''
  if (fight.signature.id === 'bardicInspiration') {
    const result = tryBardicInspiration(
      fight.signature.bardicUses,
      natural,
      total,
      monster.ac,
      classTier,
      rng,
    )
    if (result.bonus > 0) {
      fight.signature.bardicUses = result.uses
      total = result.total
      bardicNote = ` Bardic (+${result.bonus}).`
    }
  }

  const autoMiss = natural === 1
  const crit = natural === 20
  const hit = !autoMiss && (crit || total >= monster.ac)
  const intervalSec = (fight.playerIntervalMs / 1000).toFixed(2)
  let line = `${input.labelPrefix}${intervalSec}s. to hit: ${total}${bardicNote} - ${hit ? 'hits' : 'misses'}.`

  if (!hit) {
    if (mastery === 'graze' && abilityBonus > 0) {
      const graze = applyDamageModifiers(
        abilityBonus,
        damageTypeOf(equipment),
        monster.resistances,
        monster.vulnerabilities,
        monster.immunities,
      )
      fight.monsterHp = Math.max(0, fight.monsterHp - graze)
      line += ` Graze: ${graze} damage.`
      pushLog(fight, line, trace)
      return {
        inventory,
        classXp,
        skills,
        killed: fight.monsterHp <= 0,
        stopped: false,
      }
    }
    pushLog(fight, line, trace)
    return { inventory, classXp, skills, killed: false, stopped: false }
  }

  const diceNotation = input.unarmedOverride?.dice ?? damageDice(equipment)
  const dtype = input.unarmedOverride?.damageType ?? damageTypeOf(equipment)
  const parts = rollDamageParts(diceNotation, rng, crit)
  const hitCtx = {
    ...sigCtx,
    hasAdvantage,
    crit,
    bonusDice: 0,
    bonusFlat: 0,
    creatureType: monster.creatureType,
    spendLowestSlot: () => spendLowestSlot(fight.spellSlots),
  }
  hooks.onHit?.(hitCtx)
  if (fight.concentration === 'divineFavor') {
    const favor = roll('1d6', rng)
    hitCtx.bonusDice += favor
    if (trace) line += ` Divine Favor [1d6] ${favor}.`
  }
  if (fight.concentration === 'huntersMark') {
    const mark = roll('1d6', rng)
    hitCtx.bonusDice += mark
    if (trace) line += ` Hunter's Mark [1d6] ${mark}.`
  }

  const raw = Math.max(0, parts.dice + parts.flat + magic + abilityBonus + hitCtx.bonusDice + hitCtx.bonusFlat)
  const dealt = applyDamageModifiers(
    raw,
    dtype,
    monster.resistances,
    monster.vulnerabilities,
    monster.immunities,
  )
  const before = fight.monsterHp
  fight.monsterHp = Math.max(0, fight.monsterHp - dealt)
  line += ` [${diceNotation}] + ${abilityBonus + magic + hitCtx.bonusFlat} damage${crit ? ' (crit)' : ''}.`
  if (hitCtx.bonusDice > 0) line += ` bonus dice ${hitCtx.bonusDice}.`
  line += applyHitMasteries({
    fight,
    mastery,
    monster,
    abilityBonus,
    prof,
    rng,
    equipment,
    weapon,
    before,
    dealt,
  })


  pushLog(fight, line, trace)
  return {
    inventory,
    classXp,
    skills,
    killed: fight.monsterHp <= 0,
    stopped: false,
  }
}

export function doOpeningAttacks(input: {
  fight: CombatFight
  monster: MonsterDef
  skills: Record<SkillId, SkillProgress>
  equipment: Equipment
  inventory: Inventory
  activeClassId: ClassId
  classXp: number
  rng: Rng
  trace: boolean
}): ReturnType<typeof resolvePlayerAttack> {
  const { fight, monster, equipment } = input
  fight.openingDone = true
  if (usesSpellLoop(input.activeClassId)) {
    return {
      inventory: input.inventory,
      classXp: input.classXp,
      skills: input.skills,
      killed: false,
      stopped: false,
    }
  }
  const weapon = playerWeapon(equipment)
  const ranged = weapon?.range === 'ranged'
  const reach = weapon?.properties.includes('reach') && !monster.reach
  if (!ranged && !reach) {
    return {
      inventory: input.inventory,
      classXp: input.classXp,
      skills: input.skills,
      killed: false,
      stopped: false,
    }
  }
  return resolvePlayerAttack({
    ...input,
    labelPrefix: ranged ? 'Opening volley: ' : 'Reach opening: ',
  })
}

export function difficultyHint(input: {
  playerToHitBonus: number
  monsterAc: number
  playerHp: number
  monsterAvgDamagePerInterval: number
}): 'Easy' | 'Even' | 'Hard' {
  const hitChance = Math.min(0.95, Math.max(0.05, (21 - (input.monsterAc - input.playerToHitBonus)) / 20))
  const avg = Math.max(0, input.monsterAvgDamagePerInterval)
  if (hitChance >= 0.65 && input.playerHp >= 4 * avg) return 'Easy'
  if (hitChance < 0.4 || 3 * avg >= input.playerHp) return 'Hard'
  return 'Even'
}

export function averageDamage(notation: string): number {
  const compact = notation.replace(/\s+/g, '')
  if (/^\d+$/.test(compact)) return Number(compact)
  let total = 0
  for (const match of compact.matchAll(/([+-]?)(\d+)d(\d+)|([+-])(\d+)/g)) {
    if (match[2]) {
      const sign = match[1] === '-' ? -1 : 1
      const count = Number(match[2])
      const sides = Number(match[3])
      total += sign * count * ((sides + 1) / 2)
    } else {
      total += (match[4] === '-' ? -1 : 1) * Number(match[5])
    }
  }
  return total
}

export function playerToHitBonus(
  skills: Record<SkillId, SkillProgress>,
  equipment: Equipment,
  classXp: number,
): number {
  const mods = abilityModMap(skills)
  const weapon = playerWeapon(equipment)
  const { mod } = attackAbilityMod(weapon, mods)
  return mod + proficiency(tier(levelForXp(classXp))) + playerMagicBonus(equipment)
}

/** Exported for tests: nick check uses 1d10, proc on 1–2. */
export function nickProc(rng: Rng): boolean {
  return 1 + Math.floor(rng() * 10) <= 2
}
