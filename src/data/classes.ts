import type { AbilityAbbr } from '../types/game'
import type { CheckSkillId } from './checkSkills'
import { GEAR_MATERIALS, getItem, type ItemId } from './items'
import type { TradeSkillId } from './skills'

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

export type SpellTradition = 'arcane' | 'divine' | 'primal' | 'bardic'

export type Spellcasting =
  | { casterType: 'none' }
  | {
      casterType: 'full' | 'half' | 'pact'
      /** TODO(Prompt 25): spells are learned by inscribing scrolls. */
      unlockSkill: TradeSkillId
      castingAbility: AbilityAbbr
      tradition: SpellTradition
    }

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
  checkProficiencies: readonly CheckSkillId[]
  signatureAbility: SignatureAbility
  startingKit: readonly { itemId: ItemId; quantity: number }[]
}

export const TRADITION_REAGENT: Record<SpellTradition, ItemId> = {
  arcane: 'arcane-dust',
  divine: 'holy-water',
  primal: 'mistletoe-sprig',
  bardic: 'rosin',
}

export const TRADITION_LABEL: Record<SpellTradition, string> = {
  arcane: 'Arcane',
  divine: 'Divine',
  primal: 'Primal',
  bardic: 'Bardic',
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
    checkProficiencies: ['athletics', 'intimidation', 'perception', 'survival'],
    startingKit: [],
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
    checkProficiencies: ['athletics', 'acrobatics', 'intimidation', 'perception'],
    startingKit: [],
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
    checkProficiencies: ['stealth', 'sleightOfHand', 'perception', 'investigation', 'deception'],
    startingKit: [],
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
    playstyle: 'Flurries of unarmed strikes. Craft a quarterstaff when you want one.',
    difficulty: 2,
    xpModifiers: { DEX: 0.2, WIS: 0.2, STR: -0.15, CHA: -0.15 },
    hitDie: 8,
    saveProficiencies: ['STR', 'DEX'],
    weaponProficiencies: ['simple', 'shortsword'],
    spellcasting: { casterType: 'none' },
    checkProficiencies: ['acrobatics', 'stealth', 'insight', 'religion'],
    startingKit: [],
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
    playstyle: 'Cast from a spellbook. The rotation spends components, not spell slots.',
    difficulty: 3,
    xpModifiers: { INT: 0.3, WIS: 0.1, STR: -0.15, CON: -0.15 },
    hitDie: 6,
    saveProficiencies: ['INT', 'WIS'],
    weaponProficiencies: WIZARD_WEAPONS,
    spellcasting: {
      casterType: 'full',
      unlockSkill: 'scribing',
      castingAbility: 'INT',
      tradition: 'arcane',
    },
    checkProficiencies: ['arcana', 'history', 'investigation', 'insight'],
    startingKit: [],
    signatureAbility: {
      id: 'arcaneRecovery',
      name: 'Arcane Recovery',
      description: '15% chance not to consume components when casting.',
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
    spellcasting: {
      casterType: 'full',
      unlockSkill: 'scribing',
      castingAbility: 'WIS',
      tradition: 'divine',
    },
    checkProficiencies: ['religion', 'medicine', 'insight', 'history'],
    startingKit: [],
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
    playstyle: 'Quickened spells shorten the next interval. Leveled spells cost half the components.',
    difficulty: 3,
    xpModifiers: { INT: 0.3, CHA: 0.1, STR: -0.15, CON: -0.15 },
    hitDie: 6,
    saveProficiencies: ['CON', 'CHA'],
    weaponProficiencies: ['simple'],
    // TODO(design): casting ability may become INT after the INT/CHA XP swap.
    spellcasting: {
      casterType: 'full',
      unlockSkill: 'scribing',
      castingAbility: 'CHA',
      tradition: 'arcane',
    },
    checkProficiencies: ['arcana', 'deception', 'persuasion', 'intimidation'],
    startingKit: [],
    signatureAbility: {
      id: 'metamagicPactMagic',
      name: 'Metamagic / Pact Magic',
      description:
        'Metamagic: Quickened Spell makes the next spell interval 50% shorter (sorcery points per long rest). Leveled spells cost half the components. Eldritch Blast is the cantrip.',
    },
  },
  {
    id: 'paladin',
    name: 'Paladin',
    role: 'Holy warrior',
    playstyle: 'Half caster. Spend Holy Water to smite while you learn the front line.',
    difficulty: 2,
    xpModifiers: { STR: 0.15, INT: 0.15, CON: 0.1, DEX: -0.15, CHA: -0.15 },
    hitDie: 10,
    saveProficiencies: ['WIS', 'CHA'],
    weaponProficiencies: SIMPLE_MARTIAL,
    // TODO(design): casting ability may become INT after the INT/CHA XP swap.
    spellcasting: {
      casterType: 'half',
      unlockSkill: 'scribing',
      castingAbility: 'CHA',
      tradition: 'divine',
    },
    checkProficiencies: ['athletics', 'religion', 'persuasion', 'intimidation'],
    startingKit: [],
    signatureAbility: {
      id: 'divineSmite',
      name: 'Divine Smite',
      description: 'On a hit, spend 1 Holy Water for 2d8 radiant (+1d8 vs undead and fiends).',
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
    spellcasting: {
      casterType: 'half',
      unlockSkill: 'scribing',
      castingAbility: 'WIS',
      tradition: 'primal',
    },
    checkProficiencies: ['survival', 'perception', 'stealth', 'nature'],
    startingKit: [],
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
    spellcasting: {
      casterType: 'full',
      unlockSkill: 'scribing',
      castingAbility: 'WIS',
      tradition: 'primal',
    },
    checkProficiencies: ['nature', 'animalHandling', 'medicine', 'survival'],
    startingKit: [],
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
    playstyle: 'Inspiration dice patch failed rolls. Train Scribing to inscribe spells.',
    difficulty: 2,
    xpModifiers: { CHA: 0.25, DEX: 0.15, STR: -0.15, CON: -0.15 },
    hitDie: 8,
    saveProficiencies: ['DEX', 'CHA'],
    weaponProficiencies: ROGUE_BARD,
    spellcasting: {
      casterType: 'full',
      unlockSkill: 'scribing',
      castingAbility: 'CHA',
      tradition: 'bardic',
    },
    checkProficiencies: ['performance', 'persuasion', 'deception', 'insight'],
    startingKit: [],
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
