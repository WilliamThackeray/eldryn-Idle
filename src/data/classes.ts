import type { AbilityAbbr } from '../types/game'
import { GEAR_MATERIALS, getItem, type ItemId } from './items'
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

export type WeaponProficiency = 'simple' | 'martial' | ItemId

export interface ClassDefinition {
  id: ClassId
  name: string
  /** Short tagline shown on the class card. */
  role: string
  playstyle: string
  /** 1 is the most straightforward. */
  difficulty: 1 | 2 | 3
  xpModifiers: Partial<Record<AbilityAbbr, number>>
  /** Cleric only: +10% on the chosen ability. TODO(design): future subclass/domain hook. */
  focusBonus?: number
  hitDie: number
  saveProficiencies: readonly AbilityAbbr[]
  /** 5e weapon list: category tags and/or specific weapon ids. */
  weaponProficiencies: readonly WeaponProficiency[]
  spellcasting: Spellcasting
  /** Null for classes that do not cast. */
  tradition: string | null
  signatureAbility: SignatureAbility
  startingKit: readonly { itemId: ItemId; quantity: number }[]
}

const SIMPLE_MARTIAL = ['simple', 'martial'] as const satisfies readonly WeaponProficiency[]
const ROGUE_BARD = [
  'simple',
  'hand-crossbow',
  'longsword',
  'rapier',
  'shortsword',
] as const satisfies readonly WeaponProficiency[]
const WIZARD_WEAPONS = [
  'dagger',
  'dart',
  'sling',
  'quarterstaff',
  'light-crossbow',
] as const satisfies readonly WeaponProficiency[]
const DRUID_WEAPONS = [
  'club',
  'dagger',
  'dart',
  'javelin',
  'mace',
  'quarterstaff',
  'scimitar',
  'sickle',
  'spear',
  'sling',
] as const satisfies readonly WeaponProficiency[]

const FOOD = { itemId: 'cooked-meat' as ItemId, quantity: 10 }
const ARMOR_PIECES = ['helmet', 'chest', 'chaps', 'gauntlets', 'boots'] as const

type KitArmor = 'padded' | 'leather' | 'arcane' | 'vestment' | 'wildweave' | 'minstrel'

function armorPieces(kind: KitArmor): { itemId: ItemId; quantity: number }[] {
  return ARMOR_PIECES.map((slot) => ({ itemId: `${kind}-${slot}` as ItemId, quantity: 1 }))
}

function martialKit(weapon: ItemId, kind: 'padded' | 'leather'): { itemId: ItemId; quantity: number }[] {
  return [{ itemId: weapon, quantity: 1 }, ...armorPieces(kind), FOOD]
}

function casterKit(weapon: ItemId, kind: KitArmor): { itemId: ItemId; quantity: number }[] {
  // TODO(Prompt 16): add 50 cantrip reagents. Paladin and Ranger included.
  return [{ itemId: weapon, quantity: 1 }, ...armorPieces(kind), FOOD]
}

export const CLASSES = [
  {
    id: 'barbarian',
    name: 'Barbarian',
    role: 'Melee tank',
    playstyle: 'Rage after the first hit. Train Strength and Constitution.',
    difficulty: 1,
    xpModifiers: { STR: 0.3, CON: 0.1, INT: -0.15, CHA: -0.15 },
    hitDie: 12,
    saveProficiencies: ['STR', 'CON'],
    weaponProficiencies: SIMPLE_MARTIAL,
    spellcasting: { casterType: 'none' },
    tradition: null,
    startingKit: martialKit('greataxe', 'leather'),
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
    role: 'Front-line soldier',
    playstyle: 'Wear leather, swing a longsword, and heal once per short rest.',
    difficulty: 1,
    xpModifiers: { STR: 0.2, DEX: 0.1, CON: 0.1, INT: -0.15, WIS: -0.15 },
    hitDie: 10,
    saveProficiencies: ['STR', 'CON'],
    weaponProficiencies: SIMPLE_MARTIAL,
    spellcasting: { casterType: 'none' },
    tradition: null,
    startingKit: martialKit('longsword', 'leather'),
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
    role: 'Skirmisher',
    playstyle: 'A finesse blade and light armor. Set up advantage, then sneak attack.',
    difficulty: 2,
    xpModifiers: { DEX: 0.3, CHA: 0.1, STR: -0.15, CON: -0.15 },
    hitDie: 8,
    saveProficiencies: ['DEX', 'INT'],
    weaponProficiencies: ROGUE_BARD,
    spellcasting: { casterType: 'none' },
    tradition: null,
    startingKit: martialKit('rapier', 'leather'),
    signatureAbility: {
      id: 'sneakAttack',
      name: 'Sneak Attack',
      description: 'Any attack made with advantage adds Xd6 damage (X = ceil(Tier / 2)).',
    },
  },
  {
    id: 'monk',
    name: 'Monk',
    role: 'Unarmed striker',
    playstyle: 'Start with a quarterstaff, then flurries of unarmed strikes.',
    difficulty: 2,
    xpModifiers: { DEX: 0.2, WIS: 0.2, STR: -0.15, CHA: -0.15 },
    hitDie: 8,
    saveProficiencies: ['STR', 'DEX'],
    weaponProficiencies: ['simple', 'shortsword'],
    spellcasting: { casterType: 'none' },
    tradition: null,
    startingKit: martialKit('quarterstaff', 'padded'),
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
    role: 'Glass-cannon caster',
    playstyle: 'Cast from a spellbook. Stay back and spend slots in order.',
    difficulty: 3,
    xpModifiers: { INT: 0.3, WIS: 0.1, STR: -0.15, CON: -0.15 },
    hitDie: 6,
    saveProficiencies: ['INT', 'WIS'],
    weaponProficiencies: WIZARD_WEAPONS,
    spellcasting: { casterType: 'full', unlockSkill: 'arcana', castingAbility: 'INT' },
    tradition: 'Arcane',
    startingKit: casterKit('quarterstaff', 'arcane'),
    signatureAbility: {
      id: 'arcaneRecovery',
      name: 'Arcane Recovery',
      description: 'Recover some spell slots on a short rest (matters in dungeons).',
    },
  },
  {
    id: 'cleric',
    name: 'Cleric',
    role: 'Divine healer',
    playstyle: 'Pick an INT or STR focus. Channel Divinity when you are hurt.',
    difficulty: 2,
    // TODO(design): focusBonus is the future domain/subclass hook for +10% INT or STR.
    xpModifiers: { WIS: 0.3, DEX: -0.15, CHA: -0.15 },
    focusBonus: 0.1,
    hitDie: 8,
    saveProficiencies: ['WIS', 'CHA'],
    weaponProficiencies: ['simple'],
    spellcasting: { casterType: 'full', unlockSkill: 'religion', castingAbility: 'WIS' },
    tradition: 'Divine',
    startingKit: casterKit('quarterstaff', 'vestment'),
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
    role: 'Arcane striker',
    playstyle: 'Quickened spells, and pact slots that return on a short rest.',
    difficulty: 3,
    xpModifiers: { INT: 0.3, CHA: 0.1, STR: -0.15, CON: -0.15 },
    hitDie: 6,
    saveProficiencies: ['CON', 'CHA'],
    weaponProficiencies: ['simple'],
    // TODO(design): casting ability may become INT after the INT/CHA XP swap.
    spellcasting: { casterType: 'full', unlockSkill: 'arcana', castingAbility: 'CHA' },
    tradition: 'Arcane / Pact',
    startingKit: casterKit('dagger', 'arcane'),
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
    role: 'Holy warrior',
    playstyle: 'Half caster. Spend a slot to smite while you learn the front line.',
    difficulty: 2,
    xpModifiers: { STR: 0.15, INT: 0.15, CON: 0.1, DEX: -0.15, CHA: -0.15 },
    hitDie: 10,
    saveProficiencies: ['WIS', 'CHA'],
    weaponProficiencies: SIMPLE_MARTIAL,
    // TODO(design): casting ability may become INT after the INT/CHA XP swap.
    spellcasting: { casterType: 'half', unlockSkill: 'religion', castingAbility: 'CHA' },
    tradition: 'Divine',
    startingKit: casterKit('longsword', 'leather'),
    signatureAbility: {
      id: 'divineSmite',
      name: 'Divine Smite',
      description: 'On a hit, spend a spell slot for 2d8 radiant (+1d8 vs undead and fiends).',
    },
  },
  {
    id: 'ranger',
    name: 'Ranger',
    role: 'Hunter',
    playstyle: "Half caster. Hunter's Mark adds damage to every hit.",
    difficulty: 2,
    xpModifiers: { DEX: 0.15, WIS: 0.15, CON: 0.1, INT: -0.15, CHA: -0.15 },
    hitDie: 10,
    saveProficiencies: ['STR', 'DEX'],
    weaponProficiencies: SIMPLE_MARTIAL,
    spellcasting: { casterType: 'half', unlockSkill: 'nature', castingAbility: 'WIS' },
    tradition: 'Primal',
    startingKit: casterKit('shortsword', 'leather'),
    signatureAbility: {
      id: 'huntersMark',
      name: "Hunter's Mark",
      description: '+1d6 on every hit against the chosen creature type.',
    },
  },
  {
    id: 'druid',
    name: 'Druid',
    role: 'Primal caster',
    playstyle: 'Full caster. The first time you hit 0 HP, you take a beast form.',
    difficulty: 3,
    xpModifiers: { WIS: 0.2, INT: 0.15, STR: -0.15, CHA: -0.1 },
    hitDie: 8,
    saveProficiencies: ['INT', 'WIS'],
    weaponProficiencies: DRUID_WEAPONS,
    spellcasting: { casterType: 'full', unlockSkill: 'nature', castingAbility: 'WIS' },
    tradition: 'Primal',
    startingKit: casterKit('quarterstaff', 'wildweave'),
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
    role: 'Support caster',
    playstyle: 'Inspiration dice patch failed rolls. Train Performance to unlock spells.',
    difficulty: 2,
    xpModifiers: { CHA: 0.25, DEX: 0.15, STR: -0.15, CON: -0.15 },
    hitDie: 8,
    saveProficiencies: ['DEX', 'CHA'],
    weaponProficiencies: ROGUE_BARD,
    // TODO(design): unlockSkill Performance vs Arcana.
    spellcasting: { casterType: 'full', unlockSkill: 'performance', castingAbility: 'CHA' },
    tradition: 'Bardic',
    startingKit: casterKit('dagger', 'minstrel'),
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

/** Strip material prefix so steel-longsword matches longsword proficiency. */
export function weaponBaseId(itemId: string): string {
  for (const material of GEAR_MATERIALS) {
    const prefix = `${material}-`
    if (itemId.startsWith(prefix)) return itemId.slice(prefix.length)
  }
  return itemId
}

/** Unarmed / missing weapon counts as proficient. Null class keeps proficiency (legacy callers). */
export function isWeaponProficient(classId: ClassId | null, itemId: ItemId | null | undefined): boolean {
  if (classId == null || itemId == null) return true
  const item = getItem(itemId)
  const weapon = item?.gear?.weapon
  if (!weapon) return true
  const base = weaponBaseId(itemId)
  const list = getClass(classId).weaponProficiencies as readonly WeaponProficiency[]
  return (
    list.includes(weapon.category) ||
    list.includes(base as ItemId) ||
    list.includes(itemId)
  )
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
  const mods: Partial<Record<AbilityAbbr, number>> = { ...entry.xpModifiers }
  if (entry.id === 'cleric' && entry.focusBonus != null) {
    mods[clericFocus] = (mods[clericFocus] ?? 0) + entry.focusBonus
  }
  return mods
}

export function netModifierPercent(mods: Partial<Record<AbilityAbbr, number>>): number {
  return Math.round(Object.values(mods).reduce((sum, value) => sum + (value ?? 0), 0) * 100)
}
