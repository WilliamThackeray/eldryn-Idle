import type { AbilityAbbr } from '../types/game'
import type { ItemStack } from './activities/types'
import type { ClassId } from './classes'
import type { ItemId } from './items'
import type { DamageType } from './items/types'

export type SpellSchool =
  | 'abjuration'
  | 'conjuration'
  | 'divination'
  | 'enchantment'
  | 'evocation'
  | 'illusion'
  | 'necromancy'
  | 'transmutation'

export type SpellKind = 'attack' | 'save' | 'heal' | 'buff'

export type BuffEffectId =
  | 'blur'
  | 'shieldOfFaith'
  | 'faerieFire'
  | 'barkskin'
  | 'protectionFromEnergyFire'
  | 'huntersMark'
  | 'divineFavor'
  | 'shield'

export interface SpellDef {
  id: string
  name: string
  level: number
  school: SpellSchool
  classes: readonly ClassId[]
  kind: SpellKind
  /** Ability the target saves with, for save spells. */
  saveAbility?: AbilityAbbr
  /** Half damage on a successful save (Fireball, Thunderwave, Shatter). */
  halfOnSave?: boolean
  /** Magic Missile: no attack roll. */
  autoHit?: boolean
  /**
   * Dice per slot level. Index 0 unused; cantrips use index 1 as the base die
   * (scaled by cantripDiceCount). Leveled spells use the cast slot level.
   */
  diceBySlotLevel: readonly (string | null)[]
  damageType?: DamageType
  concentration: boolean
  /** Leveled spells only. Cantrips use the caster's tradition reagent at cast time. */
  components: readonly ItemStack[]
  buffEffect?: BuffEffectId
}

function dice(levels: Record<number, string>): (string | null)[] {
  const out: (string | null)[] = [null]
  for (let i = 1; i <= 9; i++) out[i] = levels[i] ?? null
  return out
}

function cantrip(base: string): (string | null)[] {
  return dice({ 1: base })
}

function c(itemId: ItemId, quantity = 1): ItemStack {
  return { itemId, quantity }
}

export const SPELLS = [
  // --- Cantrips ---
  {
    id: 'fire-bolt',
    name: 'Fire Bolt',
    level: 0,
    school: 'evocation',
    classes: ['wizard', 'sorcererWarlock'],
    kind: 'attack',
    diceBySlotLevel: cantrip('1d10'),
    damageType: 'fire',
    concentration: false,
    components: [],
  },
  {
    id: 'sacred-flame',
    name: 'Sacred Flame',
    level: 0,
    school: 'evocation',
    classes: ['cleric'],
    kind: 'save',
    saveAbility: 'DEX',
    halfOnSave: false,
    diceBySlotLevel: cantrip('1d8'),
    damageType: 'radiant',
    concentration: false,
    components: [],
  },
  {
    id: 'eldritch-blast',
    name: 'Eldritch Blast',
    level: 0,
    school: 'evocation',
    classes: ['sorcererWarlock'],
    kind: 'attack',
    diceBySlotLevel: cantrip('1d10'),
    damageType: 'force',
    concentration: false,
    components: [],
  },
  {
    id: 'poison-spray',
    name: 'Poison Spray',
    level: 0,
    school: 'conjuration',
    classes: ['druid'],
    kind: 'save',
    saveAbility: 'CON',
    halfOnSave: false,
    diceBySlotLevel: cantrip('1d12'),
    damageType: 'poison',
    concentration: false,
    components: [],
  },
  {
    id: 'vicious-mockery',
    name: 'Vicious Mockery',
    level: 0,
    school: 'enchantment',
    classes: ['bard'],
    kind: 'save',
    saveAbility: 'WIS',
    halfOnSave: false,
    diceBySlotLevel: cantrip('1d6'),
    damageType: 'psychic',
    concentration: false,
    components: [],
  },

  // --- 1st level ---
  {
    id: 'magic-missile',
    name: 'Magic Missile',
    level: 1,
    school: 'evocation',
    classes: ['wizard'],
    kind: 'attack',
    autoHit: true,
    diceBySlotLevel: dice({
      1: '3d4+3',
      2: '4d4+4',
      3: '5d4+5',
      4: '6d4+6',
      5: '7d4+7',
      6: '8d4+8',
      7: '9d4+9',
      8: '10d4+10',
      9: '11d4+11',
    }),
    damageType: 'force',
    concentration: false,
    components: [c('arcane-dust', 3)],
  },
  {
    id: 'shield',
    name: 'Shield',
    level: 1,
    school: 'abjuration',
    classes: ['wizard', 'sorcererWarlock'],
    kind: 'buff',
    diceBySlotLevel: dice({ 1: '0', 2: '0', 3: '0', 4: '0', 5: '0', 6: '0', 7: '0', 8: '0', 9: '0' }),
    concentration: false,
    components: [c('iron-bar')],
    buffEffect: 'shield',
  },
  {
    id: 'cure-wounds',
    name: 'Cure Wounds',
    level: 1,
    school: 'abjuration',
    classes: ['cleric', 'druid', 'paladin', 'ranger', 'bard'],
    kind: 'heal',
    diceBySlotLevel: dice({
      1: '1d8',
      2: '2d8',
      3: '3d8',
      4: '4d8',
      5: '5d8',
      6: '6d8',
      7: '7d8',
      8: '8d8',
      9: '9d8',
    }),
    concentration: false,
    components: [c('forest-herbs', 2)],
  },
  {
    id: 'healing-word',
    name: 'Healing Word',
    level: 1,
    school: 'abjuration',
    classes: ['bard', 'cleric'],
    kind: 'heal',
    diceBySlotLevel: dice({
      1: '1d4',
      2: '2d4',
      3: '3d4',
      4: '4d4',
      5: '5d4',
      6: '6d4',
      7: '7d4',
      8: '8d4',
      9: '9d4',
    }),
    concentration: false,
    components: [c('forest-herbs', 2)],
  },
  {
    id: 'shield-of-faith',
    name: 'Shield of Faith',
    level: 1,
    school: 'abjuration',
    classes: ['cleric', 'paladin'],
    kind: 'buff',
    diceBySlotLevel: dice({ 1: '0', 2: '0', 3: '0', 4: '0', 5: '0', 6: '0', 7: '0', 8: '0', 9: '0' }),
    concentration: true,
    components: [c('blessed-parchment')],
    buffEffect: 'shieldOfFaith',
  },
  {
    id: 'hunters-mark',
    name: "Hunter's Mark",
    level: 1,
    school: 'divination',
    classes: ['ranger'],
    kind: 'buff',
    diceBySlotLevel: dice({ 1: '0', 2: '0', 3: '0', 4: '0', 5: '0', 6: '0', 7: '0', 8: '0', 9: '0' }),
    concentration: true,
    components: [c('wolf-fang')],
    buffEffect: 'huntersMark',
  },
  {
    id: 'divine-favor',
    name: 'Divine Favor',
    level: 1,
    school: 'evocation',
    classes: ['paladin'],
    kind: 'buff',
    diceBySlotLevel: dice({ 1: '0', 2: '0', 3: '0', 4: '0', 5: '0', 6: '0', 7: '0', 8: '0', 9: '0' }),
    concentration: true,
    components: [c('holy-water', 2)],
    buffEffect: 'divineFavor',
  },
  {
    id: 'faerie-fire',
    name: 'Faerie Fire',
    level: 1,
    school: 'evocation',
    classes: ['bard'],
    kind: 'buff',
    diceBySlotLevel: dice({ 1: '0', 2: '0', 3: '0', 4: '0', 5: '0', 6: '0', 7: '0', 8: '0', 9: '0' }),
    concentration: true,
    components: [c('fey-herbs')],
    buffEffect: 'faerieFire',
  },
  {
    id: 'thunderwave',
    name: 'Thunderwave',
    level: 1,
    school: 'evocation',
    classes: ['druid'],
    kind: 'save',
    saveAbility: 'CON',
    halfOnSave: true,
    diceBySlotLevel: dice({
      1: '2d8',
      2: '3d8',
      3: '4d8',
      4: '5d8',
      5: '6d8',
      6: '7d8',
      7: '8d8',
      8: '9d8',
      9: '10d8',
    }),
    damageType: 'thunder',
    concentration: false,
    components: [c('goat-horn')],
  },

  // --- 2nd level ---
  {
    id: 'scorching-ray',
    name: 'Scorching Ray',
    level: 2,
    school: 'evocation',
    classes: ['wizard', 'sorcererWarlock'],
    kind: 'attack',
    // One attack roll for idle; dice scale with slot (3 rays at 2nd → 4 at 3rd …).
    diceBySlotLevel: dice({
      2: '6d6',
      3: '8d6',
      4: '10d6',
      5: '12d6',
      6: '14d6',
      7: '16d6',
      8: '18d6',
      9: '20d6',
    }),
    damageType: 'fire',
    concentration: false,
    components: [c('coal'), c('desert-spices')],
  },
  {
    id: 'blur',
    name: 'Blur',
    level: 2,
    school: 'illusion',
    classes: ['wizard'],
    kind: 'buff',
    diceBySlotLevel: dice({ 2: '0', 3: '0', 4: '0', 5: '0', 6: '0', 7: '0', 8: '0', 9: '0' }),
    concentration: true,
    components: [c('frog-skin')],
    buffEffect: 'blur',
  },
  {
    id: 'barkskin',
    name: 'Barkskin',
    level: 2,
    school: 'transmutation',
    classes: ['druid', 'ranger'],
    kind: 'buff',
    diceBySlotLevel: dice({ 2: '0', 3: '0', 4: '0', 5: '0', 6: '0', 7: '0', 8: '0', 9: '0' }),
    concentration: true,
    components: [c('oak-bark')],
    buffEffect: 'barkskin',
  },
  {
    id: 'prayer-of-healing',
    name: 'Prayer of Healing',
    level: 2,
    school: 'abjuration',
    classes: ['cleric'],
    kind: 'heal',
    diceBySlotLevel: dice({
      2: '2d8',
      3: '3d8',
      4: '4d8',
      5: '5d8',
      6: '6d8',
      7: '7d8',
      8: '8d8',
      9: '9d8',
    }),
    concentration: false,
    components: [c('healing-potion')],
  },
  {
    id: 'shatter',
    name: 'Shatter',
    level: 2,
    school: 'evocation',
    classes: ['bard'],
    kind: 'save',
    saveAbility: 'CON',
    halfOnSave: true,
    diceBySlotLevel: dice({
      2: '3d8',
      3: '4d8',
      4: '5d8',
      5: '6d8',
      6: '7d8',
      7: '8d8',
      8: '9d8',
      9: '10d8',
    }),
    damageType: 'thunder',
    concentration: false,
    components: [c('mica-chip')],
  },

  // --- 3rd level ---
  {
    id: 'fireball',
    name: 'Fireball',
    level: 3,
    school: 'evocation',
    classes: ['wizard', 'sorcererWarlock'],
    kind: 'save',
    saveAbility: 'DEX',
    halfOnSave: true,
    diceBySlotLevel: dice({
      3: '8d6',
      4: '9d6',
      5: '10d6',
      6: '11d6',
      7: '12d6',
      8: '13d6',
      9: '14d6',
    }),
    damageType: 'fire',
    concentration: false,
    components: [c('fireball-reagent')],
  },
  {
    id: 'mass-healing-word',
    name: 'Mass Healing Word',
    level: 3,
    school: 'abjuration',
    classes: ['cleric', 'bard'],
    kind: 'heal',
    diceBySlotLevel: dice({
      3: '1d4',
      4: '2d4',
      5: '3d4',
      6: '4d4',
      7: '5d4',
      8: '6d4',
      9: '7d4',
    }),
    concentration: false,
    components: [c('troll-blood-tonic')],
  },
  {
    id: 'protection-from-energy',
    name: 'Protection from Energy',
    level: 3,
    school: 'abjuration',
    classes: ['druid'],
    kind: 'buff',
    diceBySlotLevel: dice({ 3: '0', 4: '0', 5: '0', 6: '0', 7: '0', 8: '0', 9: '0' }),
    concentration: true,
    components: [c('warding-chalk')],
    buffEffect: 'protectionFromEnergyFire',
  },
  {
    id: 'conjure-barrage',
    name: 'Conjure Barrage',
    level: 3,
    school: 'conjuration',
    classes: ['ranger'],
    kind: 'save',
    saveAbility: 'DEX',
    halfOnSave: true,
    diceBySlotLevel: dice({ 3: '3d8', 4: '4d8', 5: '5d8', 6: '6d8', 7: '7d8', 8: '8d8', 9: '9d8' }),
    damageType: 'piercing',
    concentration: false,
    // shortcut: bolts/bullets ignored, upgrade if barrage should take any ammo.
    components: [c('spider-silk'), c('arrows')],
  },
] as const satisfies readonly SpellDef[]

export type SpellId = (typeof SPELLS)[number]['id']

const BY_ID = new Map<string, SpellDef>(SPELLS.map((spell) => [spell.id, spell]))

export function isSpellId(id: string): id is SpellId {
  return BY_ID.has(id)
}

export function getSpell(id: string): SpellDef | undefined {
  return BY_ID.get(id)
}

export function spellsForClass(classId: ClassId): SpellDef[] {
  return SPELLS.filter((spell) => (spell.classes as readonly string[]).includes(classId))
}
