import type { ClassId } from '../../data/classes'
import type { MonsterDef } from '../../data/monsters'
import { getSpell, type SpellId } from '../../data/spells'
import type { SkillProgress } from '../../types/game'
import type { TradeSkillId } from '../../data/skills'
import { activePerks, effectTotal } from '../abilities'
import { ARCANE_RECOVERY_SAVE_CHANCE, SPELL_SLOT_MODEL } from '../config'
import { applyDamageModifiers, applyTriangle, triangleNote } from '../damage'
import { roll, rollD20, rollDamageParts } from '../dice'
import { removeItems, type Inventory } from '../inventory'
import type { Rng } from '../rng'
import {
  castingAbilityFor,
  componentCostForCast,
  diceForCast,
  formatComponentSpend,
  hasComponents,
  markSlotSpent,
  missingComponentName,
  pickSlotForCast,
  type SpellSlot,
  unlockSkillFor,
} from '../spells'
import { levelForXp, proficiency, tier } from '../xp'
import { totalItemStats, type Equipment } from '../equipment'
import { critThreshold, resolvePlayerAttack } from './attack'
import { abilityModMap, type CombatFight, pushLog, savingThrow, skillLevel } from './state'

export function resolveSpellCast(input: {
  fight: CombatFight
  monster: MonsterDef
  skills: Record<TradeSkillId, SkillProgress>
  inventory: Inventory
  equipment: Equipment
  activeClassId: ClassId
  classXp: number
  rng: Rng
  trace: boolean
  bestiaryBonus?: number
  intelDamagePct?: number
}): {
  inventory: Inventory
  classXp: number
  skills: Record<TradeSkillId, SkillProgress>
  killed: boolean
  stopped: boolean
} {
  const { fight, monster, rng, trace } = input
  let { inventory } = input
  const { classXp, skills } = input
  const mods = abilityModMap(skills)
  const classTier = tier(levelForXp(classXp))
  const prof = proficiency(classTier)
  const castAbility = castingAbilityFor(input.activeClassId)
  const castMod = mods[castAbility]
  const unlock = unlockSkillFor(input.activeClassId)
  const skillLvl = skillLevel(skills, unlock)
  const saveDc = 8 + prof + castMod + effectTotal(activePerks({ skills }), 'spellSaveDc')
  const intelPct = Math.max(0, input.intelDamagePct ?? 0)

  const picked = pickSlotForCast({
    slots: fight.spellSlots,
    rotationIndex: fight.rotationIndex,
    model: SPELL_SLOT_MODEL,
  })
  fight.rotationIndex = picked.nextRotationIndex

  let slot: SpellSlot | undefined = fight.spellSlots[picked.slotIndex]
  let spellId: SpellId | null = slot?.spellId ?? null
  let slotLevel = slot?.level ?? 0
  let usedCantripFallback = false
  let missingLeveledName: string | null = null

  const cantripSlot = fight.spellSlots.find((entry) => entry.level === 0)
  const cantripId = cantripSlot?.spellId ?? null

  const trySpell = spellId ? getSpell(spellId) : undefined
  const leveledCost =
    trySpell && slotLevel > 0
      ? componentCostForCast({ spell: trySpell, classId: input.activeClassId })
      : []
  const canPayLeveled = trySpell != null && slotLevel > 0 && hasComponents(inventory, leveledCost)

  if (!trySpell || slotLevel === 0 || !canPayLeveled || picked.fallbackToCantrip) {
    if (trySpell && slotLevel > 0 && !canPayLeveled && !picked.fallbackToCantrip) {
      usedCantripFallback = true
      missingLeveledName = missingComponentName(inventory, leveledCost)
    }
    spellId = cantripId
    slotLevel = 0
    slot = cantripSlot
  }

  const spell = spellId ? getSpell(spellId) : undefined
  if (!spell) {
    pushLog(fight, 'No cantrip prepared. Interval wasted.', trace)
    return { inventory, classXp, skills, killed: false, stopped: false }
  }

  const cost = componentCostForCast({ spell, classId: input.activeClassId })
  if (!hasComponents(inventory, cost)) {
    const missing = missingComponentName(inventory, cost) ?? 'components'
    pushLog(fight, `Out of ${missing} — weapon attack.`, trace)
    return resolvePlayerAttack({
      fight,
      monster,
      skills,
      equipment: input.equipment,
      inventory,
      activeClassId: input.activeClassId,
      classXp,
      rng,
      trace,
      labelPrefix: 'Weapon fallback: ',
      bestiaryBonus: input.bestiaryBonus,
    })
  }

  const isWizard = input.activeClassId === 'wizard'
  const savedComponents = isWizard && cost.length > 0 && rng() < ARCANE_RECOVERY_SAVE_CHANCE
  if (!savedComponents && cost.length > 0) {
    inventory = removeItems(inventory, [...cost])
  }

  if (
    SPELL_SLOT_MODEL === 'expended' &&
    spell.level > 0 &&
    !usedCantripFallback &&
    picked.slotIndex >= 0
  ) {
    markSlotSpent(fight.spellSlots, picked.slotIndex)
  }

  const notation = diceForCast(spell, Math.max(spell.level, slotLevel), skillLvl)
  const intervalSec = (fight.playerIntervalMs / 1000).toFixed(2)
  let line = `Cast ${spell.name}${slotLevel > 0 ? ` (slot ${slotLevel})` : ''}: ${intervalSec}s.`
  if (usedCantripFallback) {
    line += ` Out of ${missingLeveledName ?? 'components'} — ${spell.name}.`
  }
  if (savedComponents) line += ' Arcane Recovery: components saved.'
  else if (cost.length > 0) line += ` Spent ${formatComponentSpend(cost)}.`

  if (spell.kind === 'heal') {
    const healDice = notation ? roll(notation, rng) : 0
    const healed = Math.max(0, healDice + castMod)
    fight.playerHp = Math.min(fight.playerMaxHp, fight.playerHp + healed)
    line += ` Heal ${healed}.`
    pushLog(fight, line, trace)
    return { inventory, classXp, skills, killed: false, stopped: false }
  }

  if (spell.kind === 'buff') {
    if (spell.buffEffect === 'shield') {
      fight.shieldBonus = 5
      line += ' +5 AC until hit.'
    } else if (spell.buffEffect) {
      fight.concentration = spell.concentration ? spell.buffEffect : fight.concentration
      if (spell.concentration) line += ` Concentrating (${spell.name}).`
      else line += ` ${spell.name}.`
    }
    pushLog(fight, line, trace)
    return { inventory, classXp, skills, killed: false, stopped: false }
  }

  const dtype = spell.damageType ?? 'force'
  const style = 'magic' as const
  const finishDamage = (amount: number) => {
    let dealt = applyTriangle(
      applyDamageModifiers(
        amount,
        dtype,
        monster.resistances,
        monster.vulnerabilities,
        monster.immunities,
      ),
      style,
      monster.archetype,
    )
    if (intelPct > 0) dealt = Math.floor(dealt * (1 + intelPct))
    return dealt
  }
  const note = triangleNote(style, monster.archetype)

  if (spell.kind === 'attack') {
    if (spell.autoHit) {
      const parts = rollDamageParts(notation ?? '0', rng, false)
      const dealt = finishDamage(parts.total)
      fight.monsterHp = Math.max(0, fight.monsterHp - dealt)
      line += ` Auto-hit [${notation}] ${dealt} ${dtype}${note}.`
      pushLog(fight, line, trace)
      return { inventory, classXp, skills, killed: fight.monsterHp <= 0, stopped: false }
    }

    const natural = rollD20(rng)
    const bestiary = Math.max(0, Math.floor(input.bestiaryBonus ?? 0))
    const total = natural + castMod + prof + bestiary
    const autoMiss = natural === 1
    const critFloor = critThreshold(totalItemStats(input.equipment).critRange)
    const crit = !autoMiss && natural >= critFloor
    const hit = !autoMiss && (crit || total >= monster.ac)
    line += ` to hit ${total} - ${hit ? 'hits' : 'misses'}.`
    if (!hit) {
      pushLog(fight, line, trace)
      return { inventory, classXp, skills, killed: false, stopped: false }
    }
    const parts = rollDamageParts(notation ?? '0', rng, crit)
    const dealt = finishDamage(parts.total)
    fight.monsterHp = Math.max(0, fight.monsterHp - dealt)
    line += ` [${notation}] ${dealt} ${dtype}${crit ? ' (crit)' : ''}${note}.`
    pushLog(fight, line, trace)
    return { inventory, classXp, skills, killed: fight.monsterHp <= 0, stopped: false }
  }

  // save
  const saveAbility = spell.saveAbility ?? 'DEX'
  const save = savingThrow({
    rng,
    ability: saveAbility,
    dc: saveDc,
    abilityMod: monster.saveBonuses[saveAbility] ?? 0,
    proficient: false,
    proficiencyBonus: 0,
  })
  line += ` DC ${saveDc} ${saveAbility} save: ${save.total} - ${save.success ? 'saved' : 'failed'}.`
  const parts = rollDamageParts(notation ?? '0', rng, false)
  let raw = parts.total
  if (save.success) {
    if (!spell.halfOnSave) raw = 0
    else raw = Math.floor(raw / 2)
  }
  const dealt = finishDamage(raw)
  if (dealt > 0) {
    fight.monsterHp = Math.max(0, fight.monsterHp - dealt)
    line += ` [${notation}] ${dealt} ${dtype}${note}.`
  } else {
    line += ' No damage.'
  }
  pushLog(fight, line, trace)
  return { inventory, classXp, skills, killed: fight.monsterHp <= 0, stopped: false }
}
