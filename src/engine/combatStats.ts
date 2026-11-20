import { getClass, isWeaponProficient, type ClassId } from '../data/classes'
import { getItem, type DamageType, type GearMaterial } from '../data/items'
import type { MonsterDef } from '../data/monsters'
import type { SkillId } from '../data/skills'
import { getSpell, type SpellId } from '../data/spells'
import type { AbilityAbbr, SkillProgress } from '../types/game'
import { activePerks, nickCeiling } from './abilities'
import {
  averageDamage,
  critThreshold,
  hitChance,
  playerToHitBonus,
} from './combat/attack'
import { attackStyleOf, triangleMultiplier } from './damage'
import {
  abilityModMap,
  abilityScoreMap,
  attackAbilityMod,
  computeMonsterIntervalMs,
  computePlayerIntervalMs,
  damageDice,
  damageTypeOf,
  masteryOf,
  playerMaxHp,
  playerWeapon,
  skillLevel,
} from './combat/state'
import {
  ARMOR_SLOT_SHARE,
  DEX_SPEED_PER_MOD,
  MATERIAL_FLAT_BONUS,
  MIN_INTERVAL_FRACTION,
  SPELL_INTERVAL_SEC,
} from './config'
/** Expected-value resist (no per-hit floor). */
function expectResist(
  amount: number,
  damageType: DamageType,
  resistances: readonly DamageType[],
  vulnerabilities: readonly DamageType[],
  immunities: readonly DamageType[],
): number {
  if (amount <= 0) return 0
  if (immunities.includes(damageType)) return 0
  const resisted = resistances.includes(damageType)
  const vulnerable = vulnerabilities.includes(damageType)
  if (resisted && vulnerable) return amount
  if (resisted) return amount * 0.5
  if (vulnerable) return amount * 2
  return amount
}
import {
  armorClass,
  heavyArmorIntervalMultiplier,
  totalItemStats,
  weaponIntervalBase,
  type Equipment,
  type EquipmentSlot,
} from './equipment'
import { removeItems, type Inventory } from './inventory'
import {
  buildFightSlots,
  castingAbilityFor,
  componentBagId,
  diceForCast,
  hasComponentBag,
  pickSlotForCast,
  unlockSkillFor,
  usesSpellLoop,
  type SpellLoadout,
} from './spells'
import { levelForXp, proficiency, tier } from './xp'

export interface StatPart {
  label: string
  value: number
}

export interface StatBreakdown {
  value: number
  parts: StatPart[]
}

export interface CombatStatsInput {
  skills: Record<SkillId, SkillProgress>
  equipment: Equipment
  classId: ClassId
  classXp: number
  inventory: Inventory
  spellLoadout?: SpellLoadout
}

export interface CombatMatchup {
  yourHitChance: StatBreakdown
  itsHitChance: StatBreakdown
  yourDps: StatBreakdown
  itsDps: StatBreakdown
  timeToKillSec: StatBreakdown
  triangleMultiplier: number
}

export interface CombatStats {
  toHit: StatBreakdown
  damageDice: StatBreakdown
  damageFlat: StatBreakdown
  intervalSec: StatBreakdown
  ac: StatBreakdown
  maxHp: StatBreakdown
  critRange: StatBreakdown
  resistances: { value: DamageType[]; parts: StatPart[] }
  saves: Record<AbilityAbbr, StatBreakdown>
  matchup?: CombatMatchup
}

const ARMOR_SHARE_SLOTS = ['helmet', 'chest', 'chaps', 'gauntlets', 'boots'] as const
const MATERIAL_LABEL: Record<GearMaterial, string> = {
  iron: 'Iron',
  steel: 'Steel',
  silvered: 'Silvered',
  mithral: 'Mithral',
  adamantine: 'Adamantine',
}

function sumParts(parts: StatPart[]): number {
  return parts.reduce((sum, part) => sum + part.value, 0)
}

function breakdown(parts: StatPart[]): StatBreakdown {
  return { value: sumParts(parts), parts: parts.filter((part) => part.value !== 0) }
}

function materialParts(equipment: Equipment): StatPart[] {
  const parts: StatPart[] = []
  const main = equipment.mainHand ? getItem(equipment.mainHand)?.gear : undefined
  if (main?.weapon) {
    if (main.material) {
      const flat = MATERIAL_FLAT_BONUS[main.material]
      if (flat) parts.push({ label: MATERIAL_LABEL[main.material], value: flat })
    }
    if (main.magicBonus) parts.push({ label: 'Magic', value: main.magicBonus })
  }
  for (const slot of Object.keys(equipment) as EquipmentSlot[]) {
    const stats = getItem(equipment[slot] ?? '')?.gear?.stats
    if (stats?.toHit) parts.push({ label: getItem(equipment[slot]!)!.name, value: stats.toHit })
  }
  return parts
}

function damageFlatParts(equipment: Equipment, abilityBonus: number, abbr: AbilityAbbr): StatPart[] {
  const parts: StatPart[] = [{ label: abbr, value: abilityBonus }]
  const main = equipment.mainHand ? getItem(equipment.mainHand)?.gear : undefined
  if (main?.weapon) {
    if (main.material) {
      const flat = MATERIAL_FLAT_BONUS[main.material]
      if (flat) parts.push({ label: MATERIAL_LABEL[main.material], value: flat })
    }
    if (main.magicBonus) parts.push({ label: 'Magic', value: main.magicBonus })
  }
  for (const slot of Object.keys(equipment) as EquipmentSlot[]) {
    const stats = getItem(equipment[slot] ?? '')?.gear?.stats
    if (stats?.damage) parts.push({ label: getItem(equipment[slot]!)!.name, value: stats.damage })
  }
  return parts
}

function armorBreakdown(equipment: Equipment, dexMod: number): StatBreakdown {
  const parts: StatPart[] = [{ label: 'Base', value: 10 }]
  const terms: string[] = []
  let armorSum = 0
  let heaviest: 'none' | 'light' | 'medium' | 'heavy' = 'none'
  const rank = { light: 1, medium: 2, heavy: 3 } as const

  for (const slot of ARMOR_SHARE_SLOTS) {
    const gear = equipment[slot] ? getItem(equipment[slot]!)?.gear : undefined
    const armor = gear?.armor
    if (!armor) continue
    const material = gear?.material ? MATERIAL_FLAT_BONUS[gear.material] : 0
    const piece = armor.armorValue + material
    const share = ARMOR_SLOT_SHARE[slot]
    armorSum += piece * share
    terms.push(`${slot} ${piece.toFixed(1)}`)
    if (heaviest === 'none' || rank[armor.weightClass] > rank[heaviest]) heaviest = armor.weightClass
  }
  const floored = Math.floor(armorSum)
  if (floored !== 0 || terms.length > 0) {
    parts.push({
      label: terms.length ? `floor(${terms.join(' + ')})` : 'Armor',
      value: floored,
    })
  }

  const capped =
    heaviest === 'heavy' ? 0 : heaviest === 'medium' ? Math.min(dexMod, 2) : dexMod
  if (capped !== 0) {
    parts.push({
      label: heaviest === 'medium' ? 'DEX (cap 2)' : 'DEX',
      value: capped,
    })
  }

  const off = equipment.offHand ? getItem(equipment.offHand)?.gear : undefined
  if (off?.shield) parts.push({ label: 'Shield', value: 2 })

  const itemAc = totalItemStats(equipment).ac
  if (itemAc) parts.push({ label: 'Magic', value: itemAc })

  return breakdown(parts)
}

function expectedWeaponSwing(input: {
  skills: Record<SkillId, SkillProgress>
  equipment: Equipment
  classXp: number
  classId: ClassId
  monster: MonsterDef
}): number {
  const mods = abilityModMap(input.skills)
  const weapon = playerWeapon(input.equipment)
  const { mod: abilityBonus } = attackAbilityMod(weapon, mods)
  const item = totalItemStats(input.equipment)
  const toHit = playerToHitBonus(input.skills, input.equipment, input.classXp, input.classId)
  const pHit = hitChance(toHit, input.monster.ac)
  const critFloor = critThreshold(item.critRange)
  const pCrit = (21 - critFloor) / 20
  const pHitNonCrit = Math.max(0, pHit - pCrit)
  const pMiss = 1 - pHit
  const dice = damageDice(input.equipment)
  const avgDice = averageDamage(dice)
  const flat = abilityBonus + item.damage
  const dtype = damageTypeOf(input.equipment)
  const style = attackStyleOf(weapon)
  const mult = triangleMultiplier(style, input.monster.archetype)
  const resist = (raw: number) =>
    expectResist(raw, dtype, input.monster.resistances, input.monster.vulnerabilities, input.monster.immunities) *
    mult

  let expected = pHitNonCrit * resist(avgDice + flat) + pCrit * resist(2 * avgDice + flat)

  if (masteryOf(input.equipment) === 'graze' && abilityBonus > 0) {
    expected += pMiss * resist(abilityBonus)
  }

  const off = input.equipment.offHand ? getItem(input.equipment.offHand)?.gear?.weapon : undefined
  if (
    masteryOf(input.equipment) === 'nick' &&
    weapon?.properties.includes('light') &&
    off
  ) {
    const nickAvg = averageDamage(off.dice)
    const nickChance = nickCeiling(activePerks({ skills: input.skills })) / 10
    expected +=
      pHit *
      nickChance *
      expectResist(
        nickAvg,
        off.damageType,
        input.monster.resistances,
        input.monster.vulnerabilities,
        input.monster.immunities,
      ) *
      mult
  }

  return expected
}

function expectedSpellDamage(input: {
  spellId: SpellId
  slotLevel: number
  skills: Record<SkillId, SkillProgress>
  classId: ClassId
  classXp: number
  monster: MonsterDef
}): number {
  const spell = getSpell(input.spellId)
  if (!spell || spell.kind === 'heal' || spell.kind === 'buff') return 0

  const mods = abilityModMap(input.skills)
  const classTier = tier(levelForXp(input.classXp))
  const prof = proficiency(classTier)
  const castMod = mods[castingAbilityFor(input.classId)]
  const unlock = unlockSkillFor(input.classId)
  const skillLvl = skillLevel(input.skills, unlock)
  const notation = diceForCast(spell, Math.max(spell.level, input.slotLevel), skillLvl)
  if (!notation) return 0
  const avg = averageDamage(notation)
  const dtype = spell.damageType ?? 'force'
  const mult = triangleMultiplier('magic', input.monster.archetype)
  const resist = (raw: number) =>
    expectResist(raw, dtype, input.monster.resistances, input.monster.vulnerabilities, input.monster.immunities) *
    mult

  if (spell.kind === 'attack') {
    if (spell.autoHit) return resist(avg)
    const bonus = castMod + prof
    const pHit = hitChance(bonus, input.monster.ac)
    const pCrit = 1 / 20
    const pHitNonCrit = Math.max(0, pHit - pCrit)
    return pHitNonCrit * resist(avg) + pCrit * resist(2 * avg)
  }

  // save
  const saveAbility = spell.saveAbility ?? 'DEX'
  const saveBonus = input.monster.saveBonuses[saveAbility] ?? 0
  const dc = 8 + prof + castMod
  const need = dc - saveBonus
  const pFail = Math.min(0.95, Math.max(0.05, (need - 1) / 20))
  const pSave = 1 - pFail
  if (!spell.halfOnSave) return pFail * resist(avg)
  return pFail * resist(avg) + pSave * resist(avg / 2)
}

/**
 * shortcut: this estimate skips opening attacks, Quickened Spell, concentration damage,
 * advantage, and signature bonus dice; replace it with a seeded fight simulation if those
 * need to show up in the number.
 */
function expectedPlayerDps(input: CombatStatsInput, monster: MonsterDef): { dps: number; ttk: number } {
  const casting = usesSpellLoop(input.classId)
  const intervalMs = computePlayerIntervalMs(input.skills, input.equipment, casting)
  const intervalSec = intervalMs / 1000

  if (!casting) {
    const perSwing = expectedWeaponSwing({
      skills: input.skills,
      equipment: input.equipment,
      classXp: input.classXp,
      classId: input.classId,
      monster,
    })
    const dps = intervalSec > 0 ? perSwing / intervalSec : 0
    const ttk = dps > 0 ? monster.hp / dps : Infinity
    return { dps, ttk }
  }

  const classTier = tier(levelForXp(input.classXp))
  const unlock = unlockSkillFor(input.classId)
  const slots = buildFightSlots({
    classId: input.classId,
    classTier,
    skillLevel: skillLevel(input.skills, unlock),
    loadout: input.spellLoadout,
  }).map((slot) => ({ ...slot }))
  if (slots.length === 0) return { dps: 0, ttk: Infinity }

  let rotationIndex = 0
  let remaining = monster.hp
  let casts = 0
  const maxCasts = 500
  let inventory = { ...input.inventory }

  while (remaining > 0 && casts < maxCasts) {
    const picked = pickSlotForCast({ slots, rotationIndex })
    rotationIndex = picked.nextRotationIndex
    let slot = slots[picked.slotIndex]
    let spellId = slot?.spellId ?? null
    let slotLevel = slot?.level ?? 0
    let usedCantripFallback = false

    const cantrip = slots.find((entry) => entry.level === 0)
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
      spellId = cantrip?.spellId ?? null
      slotLevel = 0
      slot = cantrip ?? slot
    }

    const spell = spellId ? getSpell(spellId) : undefined
    if (spell && spell.level > 0 && spell.componentTier) {
      inventory = removeItems(inventory, [{ itemId: componentBagId(spell.componentTier), quantity: 1 }])
      if (!usedCantripFallback && picked.slotIndex >= 0 && slots[picked.slotIndex]) {
        slots[picked.slotIndex] = { ...slots[picked.slotIndex]!, spent: true }
      }
    }

    const expected = spellId
      ? expectedSpellDamage({
          spellId,
          slotLevel,
          skills: input.skills,
          classId: input.classId,
          classXp: input.classXp,
          monster,
        })
      : 0
    remaining -= expected
    casts += 1
  }

  const timeSec = casts * intervalSec
  const dealt = monster.hp - Math.max(0, remaining)
  const dps = timeSec > 0 ? dealt / timeSec : 0
  const ttk = dps > 0 ? monster.hp / dps : Infinity
  return { dps, ttk }
}

function monsterDps(monster: MonsterDef): number {
  const perTurn = monster.attacks.reduce((sum, attack) => sum + averageDamage(attack.damage), 0)
  const intervalSec = computeMonsterIntervalMs(monster, false) / 1000
  return intervalSec > 0 ? perTurn / intervalSec : 0
}

export function computeCombatStats(input: CombatStatsInput, monster?: MonsterDef): CombatStats {
  const cls = getClass(input.classId)
  const mods = abilityModMap(input.skills)
  const scores = abilityScoreMap(input.skills)
  const classLevel = levelForXp(input.classXp)
  const classTier = tier(classLevel)
  const prof = proficiency(classTier)
  const weapon = playerWeapon(input.equipment)
  const { mod: abilityBonus, abbr } = attackAbilityMod(weapon, mods)
  const item = totalItemStats(input.equipment)
  const casting = usesSpellLoop(input.classId)

  const weaponProficient = isWeaponProficient(input.classId, input.equipment.mainHand)
  const toHitParts: StatPart[] = [
    ...(weaponProficient ? [{ label: 'Prof', value: prof }] : []),
    { label: abbr, value: abilityBonus },
    ...materialParts(input.equipment),
  ]
  // Deduplicate materialParts that already include magic; materialParts only from main hand + explicit stats.
  const toHit = breakdown(toHitParts)

  const diceLabel = damageDice(input.equipment)
  const damageDiceStat: StatBreakdown = {
    value: averageDamage(diceLabel),
    parts: [{ label: diceLabel, value: averageDamage(diceLabel) }],
  }
  const damageFlat = breakdown(damageFlatParts(input.equipment, abilityBonus, abbr))

  const baseSec = casting ? SPELL_INTERVAL_SEC : weaponIntervalBase(weapon)
  const baseMs = baseSec * 1000
  const dexFactor = 1 - DEX_SPEED_PER_MOD * mods.DEX
  const speedPct = casting ? 0 : item.attackSpeedPct
  const speedFactor = 1 - speedPct / 100
  const scaled = baseMs * dexFactor * speedFactor
  const floored = Math.max(MIN_INTERVAL_FRACTION * baseMs, scaled)
  const heavy = heavyArmorIntervalMultiplier(input.equipment, scores.STR)
  const intervalMs = floored * heavy
  const intervalParts: StatPart[] = [
    { label: 'Base', value: baseSec },
    { label: 'DEX', value: (baseMs * (dexFactor - 1) * speedFactor) / 1000 },
  ]
  if (speedPct) intervalParts.push({ label: 'Attack speed', value: (baseMs * dexFactor * (speedFactor - 1)) / 1000 })
  if (floored > scaled) {
    intervalParts.push({ label: 'Floor', value: (floored - scaled) / 1000 })
  }
  if (heavy !== 1) intervalParts.push({ label: 'Heavy armor', value: (intervalMs - floored) / 1000 })
  const intervalSec = {
    value: intervalMs / 1000,
    parts: intervalParts.filter((part) => Math.abs(part.value) > 1e-9),
  }

  const ac = armorBreakdown(input.equipment, mods.DEX)
  // Lock AC to the same helper combat uses outside of fight buffs.
  if (ac.value !== armorClass(input.equipment, mods.DEX)) {
    ac.value = armorClass(input.equipment, mods.DEX)
  }
  const maxHpValue = playerMaxHp(cls.hitDie, classTier, mods.CON, input.skills, input.equipment)
  const maxHpParts: StatPart[] = [
    {
      label: 'Class',
      value: maxHpValue - item.maxHp,
    },
  ]
  if (item.maxHp) maxHpParts.push({ label: 'Items', value: item.maxHp })
  const maxHpStat = breakdown(maxHpParts)

  const critFloor = critThreshold(item.critRange)
  const critLabel = critFloor >= 20 ? '20' : `${critFloor}–20`
  const critRange: StatBreakdown = {
    value: item.critRange,
    parts: [{ label: critLabel, value: item.critRange }],
  }

  const resistances = {
    value: item.resistances,
    parts: item.resistances.map((type) => ({ label: type, value: 1 })),
  }

  const saves = {} as Record<AbilityAbbr, StatBreakdown>
  for (const ability of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const) {
    const proficient = cls.saveProficiencies.some((entry) => entry === ability)
    const parts: StatPart[] = [
      { label: ability, value: mods[ability] },
      ...(proficient ? [{ label: 'Prof', value: prof }] : []),
      ...(item.saveBonus ? [{ label: 'Items', value: item.saveBonus }] : []),
    ]
    saves[ability] = breakdown(parts)
  }

  // Lock to-hit to the combat helper.
  toHit.value = playerToHitBonus(input.skills, input.equipment, input.classXp, input.classId)

  const stats: CombatStats = {
    toHit,
    damageDice: damageDiceStat,
    damageFlat,
    intervalSec,
    ac,
    maxHp: maxHpStat,
    critRange,
    resistances,
    saves,
  }

  if (monster) {
    const yourHit = hitChance(toHit.value, monster.ac)
    const first = monster.attacks[0]
    const itsHit = first ? hitChance(first.toHit, ac.value) : 0
    const { dps, ttk } = expectedPlayerDps(input, monster)
    const its = monsterDps(monster)
    const style = casting ? 'magic' : attackStyleOf(weapon)
    const tri = triangleMultiplier(style, monster.archetype)
    stats.matchup = {
      yourHitChance: {
        value: yourHit,
        parts: [
          { label: 'To-hit', value: toHit.value },
          { label: 'Monster AC', value: monster.ac },
        ],
      },
      itsHitChance: {
        value: itsHit,
        parts: first
          ? [
              { label: 'Monster to-hit', value: first.toHit },
              { label: 'Your AC', value: ac.value },
            ]
          : [],
      },
      yourDps: { value: dps, parts: [{ label: 'Expected', value: dps }] },
      itsDps: { value: its, parts: [{ label: 'Expected', value: its }] },
      timeToKillSec: {
        value: Number.isFinite(ttk) ? ttk : 0,
        parts: [{ label: 'Monster HP / DPS', value: Number.isFinite(ttk) ? ttk : 0 }],
      },
      triangleMultiplier: tri,
    }
  }

  return stats
}
