import type { ItemStack } from '../data/activities/types'
import {
  getClass,
  TRADITION_REAGENT,
  type CasterType,
  type ClassId,
} from '../data/classes'
import { getItem, type ItemId } from '../data/items'
import { spellScrollId } from '../data/items/scrolls'
import { getSkill, type TradeSkillId } from '../data/skills'
import { getSpell, spellsForClass, type SpellDef, type SpellId } from '../data/spells'
import type { AbilityAbbr } from '../types/game'
import {
  CASTING_ABILITY_SOURCE,
  SPELL_SLOT_MODEL,
  type CastingAbilitySource,
  type SpellSlotModel,
} from './config'
import { hasItems, type Inventory } from './inventory'
import { levelForXp } from './xp'

export type { SpellSlotModel, CastingAbilitySource }

export interface SpellSlot {
  /** 0 = cantrip slot. */
  level: number
  spellId: SpellId | null
  spent: boolean
}

export interface SpellLoadout {
  /** Prepared spell id per slot index (index 0 is always the cantrip). */
  slots: (SpellId | null)[]
}

export type SpellLoadouts = Partial<Record<ClassId, SpellLoadout>>

/** Full caster leveled slots by character level (Tier). Index = level, value = count of that slot level. */
const FULL_SLOTS: Record<number, number[]> = {
  1: [0, 2],
  2: [0, 3],
  3: [0, 4, 2],
  4: [0, 4, 3],
  5: [0, 4, 3, 2],
  6: [0, 4, 3, 3],
  7: [0, 4, 3, 3, 1],
  8: [0, 4, 3, 3, 2],
  9: [0, 4, 3, 3, 3, 1],
  10: [0, 4, 3, 3, 3, 2],
  11: [0, 4, 3, 3, 3, 2, 1],
  12: [0, 4, 3, 3, 3, 2, 1],
  13: [0, 4, 3, 3, 3, 2, 1, 1],
  14: [0, 4, 3, 3, 3, 2, 1, 1],
  15: [0, 4, 3, 3, 3, 2, 1, 1, 1],
  16: [0, 4, 3, 3, 3, 2, 1, 1, 1],
  17: [0, 4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [0, 4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [0, 4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [0, 4, 3, 3, 3, 3, 2, 2, 1, 1],
}

/** Half caster (Paladin / Ranger). Level 1 has no leveled slots. */
const HALF_SLOTS: Record<number, number[]> = {
  1: [0],
  2: [0, 2],
  3: [0, 3],
  4: [0, 3],
  5: [0, 4, 2],
  6: [0, 4, 2],
  7: [0, 4, 3],
  8: [0, 4, 3],
  9: [0, 4, 3, 2],
  10: [0, 4, 3, 2],
  11: [0, 4, 3, 3],
  12: [0, 4, 3, 3],
  13: [0, 4, 3, 3, 1],
  14: [0, 4, 3, 3, 1],
  15: [0, 4, 3, 3, 2],
  16: [0, 4, 3, 3, 2],
  17: [0, 4, 3, 3, 3, 1],
  18: [0, 4, 3, 3, 3, 1],
  19: [0, 4, 3, 3, 3, 2],
  20: [0, 4, 3, 3, 3, 2],
}

/** Pact Magic: all slots at one max level. Count grows 1 → 2 → 3 (11) → 4 (17). */
function pactSlotLevel(tier: number): number {
  if (tier >= 17) return 5
  if (tier >= 11) return 5
  if (tier >= 9) return 5
  if (tier >= 7) return 4
  if (tier >= 5) return 3
  if (tier >= 3) return 2
  return 1
}

function pactSlotCount(tier: number): number {
  if (tier >= 17) return 4
  if (tier >= 11) return 3
  if (tier >= 2) return 2
  return 1
}

/** Spell level L unlocks at skill level 1 + (L-1)*10. Cantrips unlock at 1. */
export function unlockSkillLevel(spellLevel: number): number {
  if (spellLevel <= 0) return 1
  return 1 + (spellLevel - 1) * 10
}

/** Cantrip dice multiplier: 1 at 1, 2 at 21, 3 at 51, 4 at 81. */
export function cantripDiceCount(skillLevel: number): number {
  if (skillLevel >= 81) return 4
  if (skillLevel >= 51) return 3
  if (skillLevel >= 21) return 2
  return 1
}

export function concentrationDc(damage: number): number {
  return Math.max(10, Math.floor(damage / 2))
}

/** Tradition reagent for a caster class, or null for non-casters. */
export function traditionReagentFor(classId: ClassId): ItemId | null {
  const casting = getClass(classId).spellcasting
  if (casting.casterType === 'none') return null
  return TRADITION_REAGENT[casting.tradition]
}

/**
 * Components required to cast. Cantrips use 1 tradition reagent.
 * Pact Magic halves each stack (rounded up).
 */
export function componentCostForCast(input: {
  spell: SpellDef
  classId: ClassId
}): ItemStack[] {
  const { spell, classId } = input
  let stacks: ItemStack[]
  if (spell.level === 0) {
    const reagent = traditionReagentFor(classId)
    stacks = reagent ? [{ itemId: reagent, quantity: 1 }] : []
  } else {
    stacks = spell.components.map((stack) => ({ ...stack }))
  }
  if (getClass(classId).signatureAbility.id !== 'metamagicPactMagic') return stacks
  return stacks.map((stack) => ({
    itemId: stack.itemId,
    quantity: Math.ceil(stack.quantity / 2),
  }))
}

export function hasComponents(inventory: Inventory, cost: readonly ItemStack[]): boolean {
  if (cost.length === 0) return true
  return hasItems(inventory, [...cost])
}

/** First missing component name for UI / log text. */
export function missingComponentName(inventory: Inventory, cost: readonly ItemStack[]): string | null {
  for (const stack of cost) {
    if ((inventory[stack.itemId] ?? 0) < stack.quantity) {
      return getItem(stack.itemId)?.name ?? stack.itemId
    }
  }
  return null
}

export function formatComponentSpend(cost: readonly ItemStack[]): string {
  return cost
    .map((stack) => {
      const name = getItem(stack.itemId)?.name ?? stack.itemId
      return stack.quantity === 1 ? name : `${name} ×${stack.quantity}`
    })
    .join(', ')
}

/**
 * Build the slot list for a caster type at the given Tier (1–20).
 * Always prepends one cantrip slot (level 0).
 */
export function slotsFor(casterType: Exclude<CasterType, 'none'>, classTier: number): { level: number }[] {
  const tier = Math.min(20, Math.max(1, Math.trunc(classTier)))
  const slots: { level: number }[] = [{ level: 0 }]

  if (casterType === 'pact') {
    const level = pactSlotLevel(tier)
    const count = pactSlotCount(tier)
    for (let i = 0; i < count; i++) slots.push({ level })
    return slots
  }

  const table = casterType === 'half' ? HALF_SLOTS : FULL_SLOTS
  const counts = table[tier] ?? table[1]
  for (let level = 1; level < counts.length; level++) {
    const n = counts[level] ?? 0
    for (let i = 0; i < n; i++) slots.push({ level })
  }
  return slots
}

/** Effective caster type for combat: pact signature overrides full table. */
export function effectiveCasterType(classId: ClassId): Exclude<CasterType, 'none'> | null {
  const cls = getClass(classId)
  if (cls.spellcasting.casterType === 'none') return null
  if (cls.signatureAbility.id === 'metamagicPactMagic') return 'pact'
  return cls.spellcasting.casterType
}

/** True when the class has a spell list (including half casters). */
export function preparesSpells(classId: ClassId | null | undefined): boolean {
  return Boolean(classId && getClass(classId).spellcasting.casterType !== 'none')
}

/** True when the class loops spell slots in combat (full table or pact signature). */
export function usesSpellLoop(classId: ClassId): boolean {
  const type = effectiveCasterType(classId)
  if (type == null) return false
  if (type === 'half') return false
  return true
}

export function castingAbilityFor(classId: ClassId): AbilityAbbr {
  const cls = getClass(classId)
  if (cls.spellcasting.casterType === 'none') return 'INT'
  if (CASTING_ABILITY_SOURCE === 'unlockSkill') {
    return getSkill(cls.spellcasting.unlockSkill).ability
  }
  return cls.spellcasting.castingAbility
}

export function unlockSkillFor(classId: ClassId): TradeSkillId | null {
  const cls = getClass(classId)
  if (cls.spellcasting.casterType === 'none') return null
  return cls.spellcasting.unlockSkill
}

export function isSpellUnlocked(spell: SpellDef, skillLevel: number): boolean {
  return skillLevel >= unlockSkillLevel(spell.level)
}

export function spellOnClassList(
  spellId: string,
  classId: ClassId | null | undefined,
  secondaryClassId?: ClassId | null,
): boolean {
  const spell = getSpell(spellId)
  if (!spell) return false
  if (classId && spell.classes.includes(classId)) return true
  return Boolean(secondaryClassId && spell.classes.includes(secondaryClassId))
}

/** Scribing level and class list. `learn` also refuses a spell you already know. */
export function canInscribe(input: {
  spellId: string
  scribingLevel: number
  classId: ClassId | null | undefined
  secondaryClassId?: ClassId | null
  known?: readonly string[]
  mode?: 'learn' | 'scribe'
}): { ok: boolean; reason: string | null } {
  const spell = getSpell(input.spellId)
  if (!spell) return { ok: false, reason: 'Unknown spell.' }
  if (!spellOnClassList(spell.id, input.classId, input.secondaryClassId)) {
    return { ok: false, reason: 'Not on your class list.' }
  }
  const need = unlockSkillLevel(spell.level)
  if (input.scribingLevel < need) return { ok: false, reason: `Scribing ${need}.` }
  if ((input.mode ?? 'learn') === 'learn' && input.known?.includes(spell.id)) {
    return { ok: false, reason: 'Already known.' }
  }
  return { ok: true, reason: null }
}

/** Cantrip and first level-1 spell already known. No starting items. */
export function starterCasting(classId: ClassId): { known: SpellId[] } {
  const list = spellsForClass(classId)
  const cantrip = list.find((spell) => spell.level === 0)
  const leveled = list.filter((spell) => spell.level === 1)
  const known = [cantrip?.id, leveled[0]?.id].filter((id): id is SpellId => id != null)
  return { known }
}

/** Quest reward: a level-1 scroll, preferring one the starter kit did not already hand out. */
export function level1ScrollItem(classId: ClassId): ItemId | null {
  const leveled = spellsForClass(classId).filter((spell) => spell.level === 1)
  const pick = leveled[2] ?? leveled[1] ?? leveled[0]
  return pick ? (spellScrollId(pick.id) as ItemId) : null
}

export function knownSpells(classId: ClassId, skillLevel: number): SpellDef[] {
  return spellsForClass(classId).filter((spell) => isSpellUnlocked(spell, skillLevel))
}

/** Union of known spells for primary and optional secondary caster. */
export function knownSpellsForClasses(
  primaryClassId: ClassId,
  secondaryClassId: ClassId | null | undefined,
  skills: Record<TradeSkillId, { xp: number }>,
): SpellDef[] {
  const out = new Map<string, SpellDef>()
  for (const classId of [primaryClassId, secondaryClassId].filter(Boolean) as ClassId[]) {
    const unlock = unlockSkillFor(classId)
    const level = unlock ? levelForXp(skills[unlock]?.xp ?? 0) : 0
    for (const spell of knownSpells(classId, level)) {
      out.set(spell.id, spell)
    }
  }
  return [...out.values()]
}

/** Class that owns the spell for component costs. Primary wins when both have it. */
export function spellOwnerClass(
  spellId: SpellId,
  primaryClassId: ClassId,
  secondaryClassId: ClassId | null | undefined,
): ClassId {
  if (spellsForClass(primaryClassId).some((spell) => spell.id === spellId)) return primaryClassId
  if (secondaryClassId && spellsForClass(secondaryClassId).some((spell) => spell.id === spellId)) {
    return secondaryClassId
  }
  return primaryClassId
}

export function spellFitsSlot(spell: SpellDef, slotLevel: number): boolean {
  if (slotLevel === 0) return spell.level === 0
  return spell.level > 0 && spell.level <= slotLevel
}

export function diceForCast(
  spell: SpellDef,
  slotLevel: number,
  skillLevel: number,
): string | null {
  if (spell.level === 0) {
    const base = spell.diceBySlotLevel[1]
    if (!base) return null
    const count = cantripDiceCount(skillLevel)
    if (count === 1) return base
    const match = /^(\d+)d(\d+)$/.exec(base)
    if (!match) return base
    return `${Number(match[1]) * count}d${match[2]}`
  }
  const level = Math.max(spell.level, slotLevel)
  return spell.diceBySlotLevel[level] ?? spell.diceBySlotLevel[spell.level] ?? null
}

export function emptyLoadout(): SpellLoadout {
  return { slots: [] }
}

export function initialSpellLoadouts(): Record<ClassId, SpellLoadout> {
  const out = {} as Record<ClassId, SpellLoadout>
  for (const id of [
    'barbarian',
    'fighter',
    'rogue',
    'monk',
    'wizard',
    'cleric',
    'sorcererWarlock',
    'paladin',
    'ranger',
    'druid',
    'bard',
  ] as ClassId[]) {
    out[id] = emptyLoadout()
  }
  return out
}

/** Build fight slots from a loadout, dropping illegal spells. */
export function buildFightSlots(input: {
  classId: ClassId
  classTier: number
  skillLevel: number
  loadout: SpellLoadout | undefined
  secondaryClassId?: ClassId | null
  skills?: Record<TradeSkillId, { xp: number }>
  /** When set, only these spells can be slotted. Omitted keeps the old skill-level list for combat tests. */
  knownSpellIds?: readonly string[]
}): SpellSlot[] {
  const casterType = effectiveCasterType(input.classId)
  if (casterType == null) return []

  const structure = slotsFor(casterType, input.classTier)
  const knownList = input.knownSpellIds
    ? input.knownSpellIds
        .map((id) => getSpell(id))
        .filter((spell): spell is SpellDef => Boolean(spell && spellOnClassList(spell.id, input.classId, input.secondaryClassId)))
    : input.skills != null
      ? knownSpellsForClasses(input.classId, input.secondaryClassId, input.skills)
      : knownSpells(input.classId, input.skillLevel)
  const known = new Set(knownList.map((s) => s.id))
  const prepared = input.loadout?.slots ?? []

  return structure.map((slot, index) => {
    const id = prepared[index] ?? null
    if (id == null || !known.has(id)) {
      // Default cantrip slot to the first known cantrip.
      if (slot.level === 0) {
        const cantrip = knownList.find((s) => s.level === 0)
        return { level: 0, spellId: (cantrip?.id as SpellId | undefined) ?? null, spent: false }
      }
      return { level: slot.level, spellId: null, spent: false }
    }
    const spell = getSpell(id)
    if (!spell || !spellFitsSlot(spell, slot.level)) {
      return { level: slot.level, spellId: null, spent: false }
    }
    return { level: slot.level, spellId: id, spent: false }
  })
}

export function refreshSlotsOnLongRest(slots: SpellSlot[]): SpellSlot[] {
  return slots.map((slot) => ({ ...slot, spent: false }))
}

/**
 * Short rest recovery.
 * Arcane Recovery: restore expended slot levels totaling ceil(tier/2), none above 5th, once per long rest.
 * Pact Magic: refill every pact slot.
 */
export function applyShortRest(input: {
  slots: SpellSlot[]
  classId: ClassId
  classTier: number
  arcaneRecoveryUsed: boolean
}): { slots: SpellSlot[]; arcaneRecoveryUsed: boolean } {
  const sig = getClass(input.classId).signatureAbility.id
  if (sig === 'metamagicPactMagic') {
    return {
      slots: input.slots.map((slot) => ({ ...slot, spent: false })),
      arcaneRecoveryUsed: input.arcaneRecoveryUsed,
    }
  }
  if (sig !== 'arcaneRecovery' || input.arcaneRecoveryUsed) {
    return { slots: input.slots, arcaneRecoveryUsed: input.arcaneRecoveryUsed }
  }

  let budget = Math.ceil(input.classTier / 2)
  const next = input.slots.map((slot) => ({ ...slot }))
  // Prefer higher slots first so the budget buys meaningful casts, skip >5th and cantrip.
  const order = next
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slot.spent && slot.level >= 1 && slot.level <= 5)
    .sort((a, b) => b.slot.level - a.slot.level)

  for (const { slot, index } of order) {
    if (budget < slot.level) continue
    budget -= slot.level
    next[index] = { ...slot, spent: false }
  }
  return { slots: next, arcaneRecoveryUsed: true }
}

/**
 * Pick the next slot to attempt for this interval.
 * Expended: first unspent prepared leveled slot, else the cantrip.
 * Rotation: cycle the index; spent slots (expended leftovers) and empty slots skip to cantrip for that beat.
 */
export function pickSlotForCast(input: {
  slots: SpellSlot[]
  rotationIndex: number
  model?: SpellSlotModel
}): { slotIndex: number; fallbackToCantrip: boolean; nextRotationIndex: number } {
  const model = input.model ?? SPELL_SLOT_MODEL
  const cantripIndex = input.slots.findIndex((s) => s.level === 0)
  const safeCantrip = cantripIndex >= 0 ? cantripIndex : 0

  if (model === 'expended') {
    const ready = input.slots.findIndex(
      (slot) => slot.level > 0 && !slot.spent && slot.spellId != null,
    )
    if (ready >= 0) {
      return { slotIndex: ready, fallbackToCantrip: false, nextRotationIndex: input.rotationIndex }
    }
    return { slotIndex: safeCantrip, fallbackToCantrip: false, nextRotationIndex: input.rotationIndex }
  }

  // rotation
  if (input.slots.length === 0) {
    return { slotIndex: 0, fallbackToCantrip: true, nextRotationIndex: 0 }
  }
  const index = input.rotationIndex % input.slots.length
  const slot = input.slots[index]
  const nextRotationIndex = (index + 1) % input.slots.length
  if (!slot || slot.level === 0) {
    return { slotIndex: safeCantrip, fallbackToCantrip: false, nextRotationIndex }
  }
  if (slot.spent || slot.spellId == null) {
    return { slotIndex: safeCantrip, fallbackToCantrip: true, nextRotationIndex }
  }
  return { slotIndex: index, fallbackToCantrip: false, nextRotationIndex }
}

/** Spend the lowest unspent leveled slot. Returns the slot level spent, or null. */
export function spendLowestSlot(slots: SpellSlot[]): number | null {
  let best: { index: number; level: number } | null = null
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    if (!slot || slot.level < 1 || slot.spent) continue
    if (best == null || slot.level < best.level) best = { index: i, level: slot.level }
  }
  if (best == null) return null
  slots[best.index] = { ...slots[best.index]!, spent: true }
  return best.level
}

export function markSlotSpent(slots: SpellSlot[], index: number): void {
  const slot = slots[index]
  if (!slot || slot.level === 0) return
  slots[index] = { ...slot, spent: true }
}
