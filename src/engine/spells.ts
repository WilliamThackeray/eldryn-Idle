import { getClass, type CasterType, type ClassId } from '../data/classes'
import { getSkill, type SkillId } from '../data/skills'
import {
  getSpell,
  spellsForClass,
  type ComponentTier,
  type SpellDef,
  type SpellId,
} from '../data/spells'
import type { AbilityAbbr } from '../types/game'
import {
  CASTING_ABILITY_SOURCE,
  SPELL_SLOT_MODEL,
  type CastingAbilitySource,
  type SpellSlotModel,
} from './config'
import type { Inventory } from './inventory'

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

const BAG_BY_TIER: Record<ComponentTier, string> = {
  basic: 'component-bag-basic',
  fine: 'component-bag-fine',
  rare: 'component-bag-rare',
  exotic: 'component-bag-exotic',
  legendary: 'component-bag-legendary',
}

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

export function componentBagId(tier: ComponentTier): string {
  return BAG_BY_TIER[tier]
}

export function componentTierForSpellLevel(spellLevel: number): ComponentTier | null {
  if (spellLevel <= 0) return null
  if (spellLevel <= 2) return 'basic'
  if (spellLevel <= 4) return 'fine'
  if (spellLevel <= 6) return 'rare'
  if (spellLevel <= 8) return 'exotic'
  return 'legendary'
}

export function concentrationDc(damage: number): number {
  return Math.max(10, Math.floor(damage / 2))
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

export function unlockSkillFor(classId: ClassId): SkillId | null {
  const cls = getClass(classId)
  if (cls.spellcasting.casterType === 'none') return null
  return cls.spellcasting.unlockSkill
}

export function isSpellUnlocked(spell: SpellDef, skillLevel: number): boolean {
  return skillLevel >= unlockSkillLevel(spell.level)
}

export function knownSpells(classId: ClassId, skillLevel: number): SpellDef[] {
  return spellsForClass(classId).filter((spell) => isSpellUnlocked(spell, skillLevel))
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

export function hasComponentBag(inventory: Inventory, spell: SpellDef): boolean {
  if (spell.level === 0 || spell.componentTier == null) return true
  const bagId = componentBagId(spell.componentTier)
  return (inventory[bagId] ?? 0) > 0
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
}): SpellSlot[] {
  const casterType = effectiveCasterType(input.classId)
  if (casterType == null) return []

  const structure = slotsFor(casterType, input.classTier)
  const known = new Set(knownSpells(input.classId, input.skillLevel).map((s) => s.id))
  const prepared = input.loadout?.slots ?? []

  return structure.map((slot, index) => {
    const id = prepared[index] ?? null
    if (id == null || !known.has(id)) {
      // Default cantrip slot to the first known cantrip.
      if (slot.level === 0) {
        const cantrip = knownSpells(input.classId, input.skillLevel).find((s) => s.level === 0)
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
