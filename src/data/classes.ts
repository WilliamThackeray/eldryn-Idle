import type { AbilityAbbr } from '../types/game'
import type { SkillId } from './skills'

export type ClassId =
  | 'barbarian'
  | 'fighter'
  | 'rogue'
  | 'monk'
  | 'wizard'
  | 'cleric'
  | 'sorcererWarlock'
  | 'paladin'
  | 'ranger'
  | 'druid'
  | 'bard'

export type ClericFocus = 'INT' | 'STR'

export type CasterType = 'full' | 'half' | 'pact' | 'none'

export type Spellcasting =
  | { casterType: 'none' }
  | { casterType: 'full' | 'half' | 'pact'; unlockSkill: SkillId; castingAbility: AbilityAbbr }

export interface SignatureAbility {
  id: string
  name: string
  description: string
}

export interface ClassDefinition {
  id: ClassId
  name: string
  xpModifiers: Partial<Record<AbilityAbbr, number>>
  /** Cleric only: +10% on the chosen ability. TODO(design): future subclass/domain hook. */
  focusBonus?: number
  hitDie: number
  saveProficiencies: readonly AbilityAbbr[]
  spellcasting: Spellcasting
  signatureAbility: SignatureAbility
}

export const CLASSES = [
  {
    id: 'barbarian',
    name: 'Barbarian',
    xpModifiers: { STR: 0.3, CON: 0.1, INT: -0.15, CHA: -0.15 },
    hitDie: 12,
    saveProficiencies: ['STR', 'CON'],
    spellcasting: { casterType: 'none' },
    signatureAbility: {
      id: 'rage',
      name: 'Rage',
      description:
        'After taking the first hit, gain resistance to bludgeoning, piercing, and slashing and +2 damage for 10 intervals. Uses per long rest scale with Tier.',
    },
  },
  {
    id: 'fighter',
    name: 'Fighter',
    xpModifiers: { STR: 0.2, DEX: 0.1, CON: 0.1, INT: -0.15, WIS: -0.15 },
    hitDie: 10,
    saveProficiencies: ['STR', 'CON'],
    spellcasting: { casterType: 'none' },
    signatureAbility: {
      id: 'secondWind',
      name: 'Second Wind',
      description:
        'Below 50% HP, heal 1d10 + Tier once per short rest. Action Surge: one extra attack interval per fight.',
    },
  },
  {
    id: 'rogue',
    name: 'Rogue',
    xpModifiers: { DEX: 0.3, CHA: 0.1, STR: -0.15, CON: -0.15 },
    hitDie: 8,
    saveProficiencies: ['DEX', 'INT'],
    spellcasting: { casterType: 'none' },
    signatureAbility: {
      id: 'sneakAttack',
      name: 'Sneak Attack',
      description: 'Any attack made with advantage adds Xd6 damage (X = ceil(Tier / 2)).',
    },
  },
  {
    id: 'monk',
    name: 'Monk',
    xpModifiers: { DEX: 0.2, WIS: 0.2, STR: -0.15, CHA: -0.15 },
    hitDie: 8,
    saveProficiencies: ['STR', 'DEX'],
    spellcasting: { casterType: 'none' },
    signatureAbility: {
      id: 'flurryOfBlows',
      name: 'Flurry of Blows',
      description:
        'Every 3rd interval adds an extra unarmed strike. Martial arts die grows 1d6 → 1d12 with Tier.',
    },
  },
  {
    id: 'wizard',
    name: 'Wizard',
    xpModifiers: { INT: 0.3, WIS: 0.1, STR: -0.15, CON: -0.15 },
    hitDie: 6,
    saveProficiencies: ['INT', 'WIS'],
    spellcasting: { casterType: 'full', unlockSkill: 'arcana', castingAbility: 'INT' },
    signatureAbility: {
      id: 'arcaneRecovery',
      name: 'Arcane Recovery',
      description: 'Recover some spell slots on a short rest (matters in dungeons).',
    },
  },
  {
    id: 'cleric',
    name: 'Cleric',
    // TODO(design): focusBonus is the future domain/subclass hook for +10% INT or STR.
    xpModifiers: { WIS: 0.3, DEX: -0.15, CHA: -0.15 },
    focusBonus: 0.1,
    hitDie: 8,
    saveProficiencies: ['WIS', 'CHA'],
    spellcasting: { casterType: 'full', unlockSkill: 'religion', castingAbility: 'WIS' },
    signatureAbility: {
      id: 'channelDivinity',
      name: 'Channel Divinity',
      description: 'Below 50% HP, heal 2d8 + WIS mod (uses per short rest).',
    },
  },
  {
    // TODO(design): split Sorcerer/Warlock later (Warlock d8, WIS/CHA saves, pact slots).
    id: 'sorcererWarlock',
    name: 'Sorcerer / Warlock',
    xpModifiers: { INT: 0.3, CHA: 0.1, STR: -0.15, CON: -0.15 },
    hitDie: 6,
    saveProficiencies: ['CON', 'CHA'],
    // TODO(design): casting ability may become INT after the INT/CHA XP swap.
    spellcasting: { casterType: 'full', unlockSkill: 'arcana', castingAbility: 'CHA' },
    signatureAbility: {
      id: 'metamagicPactMagic',
      name: 'Metamagic / Pact Magic',
      description:
        'Metamagic: Quickened Spell makes the next spell interval 50% shorter (sorcery points per long rest). Pact Magic: fewer slots, all at max level, recharged on short rests; Eldritch Blast cantrip.',
    },
  },
  {
    id: 'paladin',
    name: 'Paladin',
    xpModifiers: { STR: 0.15, INT: 0.15, CON: 0.1, DEX: -0.15, CHA: -0.15 },
    hitDie: 10,
    saveProficiencies: ['WIS', 'CHA'],
    // TODO(design): casting ability may become INT after the INT/CHA XP swap.
    spellcasting: { casterType: 'half', unlockSkill: 'religion', castingAbility: 'CHA' },
    signatureAbility: {
      id: 'divineSmite',
      name: 'Divine Smite',
      description: 'On a hit, spend a spell slot for 2d8 radiant (+1d8 vs undead and fiends).',
    },
  },
  {
    id: 'ranger',
    name: 'Ranger',
    xpModifiers: { DEX: 0.15, WIS: 0.15, CON: 0.1, INT: -0.15, CHA: -0.15 },
    hitDie: 10,
    saveProficiencies: ['STR', 'DEX'],
    spellcasting: { casterType: 'half', unlockSkill: 'nature', castingAbility: 'WIS' },
    signatureAbility: {
      id: 'huntersMark',
      name: "Hunter's Mark",
      description: '+1d6 on every hit against the chosen creature type.',
    },
  },
  {
    id: 'druid',
    name: 'Druid',
    xpModifiers: { WIS: 0.2, INT: 0.15, STR: -0.15, CHA: -0.1 },
    hitDie: 8,
    saveProficiencies: ['INT', 'WIS'],
    spellcasting: { casterType: 'full', unlockSkill: 'nature', castingAbility: 'WIS' },
    signatureAbility: {
      id: 'wildShape',
      name: 'Wild Shape',
      description:
        'The first time HP hits 0 (per short rest), take beast form with temporary HP = 5 × Tier.',
    },
  },
  {
    id: 'bard',
    name: 'Bard',
    xpModifiers: { CHA: 0.25, DEX: 0.15, STR: -0.15, CON: -0.15 },
    hitDie: 8,
    saveProficiencies: ['DEX', 'CHA'],
    // TODO(design): unlockSkill Performance vs Arcana.
    spellcasting: { casterType: 'full', unlockSkill: 'performance', castingAbility: 'CHA' },
    signatureAbility: {
      id: 'bardicInspiration',
      name: 'Bardic Inspiration',
      description:
        'Add 1d6 to a failed roll, often turning a miss into a hit (uses per short rest; die grows with Tier).',
    },
  },
] as const satisfies readonly ClassDefinition[]

const CLASS_BY_ID = Object.fromEntries(CLASSES.map((entry) => [entry.id, entry])) as Record<
  ClassId,
  (typeof CLASSES)[number]
>

const CLASS_IDS = new Set<string>(CLASSES.map((entry) => entry.id))

export function isClassId(id: string): id is ClassId {
  return CLASS_IDS.has(id)
}

export function getClass(id: ClassId): (typeof CLASSES)[number] {
  return CLASS_BY_ID[id]
}

export function initialClassProgress(): Record<ClassId, { xp: number }> {
  const classes = {} as Record<ClassId, { xp: number }>
  for (const entry of CLASSES) classes[entry.id] = { xp: 0 }
  return classes
}

/** Effective XP modifiers for the active class. Cleric adds focusBonus on clericFocus. */
export function modifiersFor(
  classId: ClassId | null,
  clericFocus: ClericFocus = 'INT',
): Partial<Record<AbilityAbbr, number>> {
  if (!classId) return {}
  const entry = CLASS_BY_ID[classId]
  const mods = { ...entry.xpModifiers }
  if (entry.id === 'cleric' && entry.focusBonus != null) {
    mods[clericFocus] = (mods[clericFocus] ?? 0) + entry.focusBonus
  }
  return mods
}

export function netModifierPercent(mods: Partial<Record<AbilityAbbr, number>>): number {
  return Math.round(Object.values(mods).reduce((sum, value) => sum + (value ?? 0), 0) * 100)
}
