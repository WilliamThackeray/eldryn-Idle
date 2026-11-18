import type { ClassId } from '../../data/classes'
import { type ItemId } from '../../data/items'
import type { MonsterDef } from '../../data/monsters'
import { getSpell, type SpellId } from '../../data/spells'
import type { SkillProgress } from '../../types/game'
import type { SkillId } from '../../data/skills'
import { activePerks, effectTotal } from '../abilities'
import { SPELL_SLOT_MODEL } from '../config'
import { applyDamageModifiers } from '../damage'
import { roll, rollD20, rollDamageParts } from '../dice'
import { removeItems, type Inventory } from '../inventory'
import type { Rng } from '../rng'
import {
  castingAbilityFor,
  componentBagId,
  diceForCast,
  hasComponentBag,
  markSlotSpent,
  pickSlotForCast,
  type SpellSlot,
  unlockSkillFor,
} from '../spells'
import { levelForXp, proficiency, tier } from '../xp'
import { abilityModMap, type CombatFight, pushLog, savingThrow, skillLevel } from './state'

export function resolveSpellCast(input: {
  fight: CombatFight
  monster: MonsterDef
  skills: Record<SkillId, SkillProgress>
  inventory: Inventory
  activeClassId: ClassId
  classXp: number
  rng: Rng
  trace: boolean
}): {
  inventory: Inventory
  classXp: number
  skills: Record<SkillId, SkillProgress>
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

  const cantripSlot = fight.spellSlots.find((entry) => entry.level === 0)
  const cantripId = cantripSlot?.spellId ?? null

  const trySpell = spellId ? getSpell(spellId) : undefined
  if (
    !trySpell ||
    slotLevel === 0 ||
    !hasComponentBag(inventory, trySpell) ||
    picked.fallbackToCantrip
  ) {
    if (trySpell && slotLevel > 0 && !hasComponentBag(inventory, trySpell) && !picked.fallbackToCantrip) {
      usedCantripFallback = true
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

  if (spell.level > 0 && spell.componentTier) {
    const bagId = componentBagId(spell.componentTier)
    inventory = removeItems(inventory, [{ itemId: bagId as ItemId, quantity: 1 }])
    if (SPELL_SLOT_MODEL === 'expended' && !usedCantripFallback && picked.slotIndex >= 0) {
      markSlotSpent(fight.spellSlots, picked.slotIndex)
    }
  }

  const notation = diceForCast(spell, Math.max(spell.level, slotLevel), skillLvl)
  const intervalSec = (fight.playerIntervalMs / 1000).toFixed(2)
  let line = `Cast ${spell.name}${slotLevel > 0 ? ` (slot ${slotLevel})` : ''}: ${intervalSec}s.`
  if (usedCantripFallback) line += ' Out of components — cantrip.'
  if (spell.level > 0 && spell.componentTier) {
    line += ` Spent ${componentBagId(spell.componentTier)}.`
  }

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

  if (spell.kind === 'attack') {
    if (spell.autoHit) {
      const parts = rollDamageParts(notation ?? '0', rng, false)
      const dealt = applyDamageModifiers(
        parts.total,
        dtype,
        monster.resistances,
        monster.vulnerabilities,
        monster.immunities,
      )
      fight.monsterHp = Math.max(0, fight.monsterHp - dealt)
      line += ` Auto-hit [${notation}] ${dealt} ${dtype}.`
      pushLog(fight, line, trace)
      return { inventory, classXp, skills, killed: fight.monsterHp <= 0, stopped: false }
    }

    const natural = rollD20(rng)
    const total = natural + castMod + prof
    const autoMiss = natural === 1
    const crit = natural === 20
    const hit = !autoMiss && (crit || total >= monster.ac)
    line += ` to hit ${total} - ${hit ? 'hits' : 'misses'}.`
    if (!hit) {
      pushLog(fight, line, trace)
      return { inventory, classXp, skills, killed: false, stopped: false }
    }
    const parts = rollDamageParts(notation ?? '0', rng, crit)
    const dealt = applyDamageModifiers(
      parts.total,
      dtype,
      monster.resistances,
      monster.vulnerabilities,
      monster.immunities,
    )
    fight.monsterHp = Math.max(0, fight.monsterHp - dealt)
    line += ` [${notation}] ${dealt} ${dtype}${crit ? ' (crit)' : ''}.`
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
  const dealt = applyDamageModifiers(
    raw,
    dtype,
    monster.resistances,
    monster.vulnerabilities,
    monster.immunities,
  )
  if (dealt > 0) {
    fight.monsterHp = Math.max(0, fight.monsterHp - dealt)
    line += ` [${notation}] ${dealt} ${dtype}.`
  } else {
    line += ' No damage.'
  }
  pushLog(fight, line, trace)
  return { inventory, classXp, skills, killed: fight.monsterHp <= 0, stopped: false }
}
