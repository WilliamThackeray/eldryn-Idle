import { getClass, type ClassId } from '../../data/classes'
import { getDungeon } from '../../data/dungeons'
import { getItem, type DamageType, type WeaponMastery } from '../../data/items'
import { getMonster, type BiomeId, type CreatureSize, type MonsterDef } from '../../data/monsters'
import type { BuffEffectId } from '../../data/spells'
import type { AbilityAbbr, SkillProgress } from '../../types/game'
import type { SkillId } from '../../data/skills'
import { activePerks, deriveAbilities, effectTotal, hasPerkEffect } from '../abilities'
import {
  COMBAT_LOG_LIMIT,
  FRIGHTEN_ATTACKS,
  MONSTER_INTERVAL_SEC,
  SLOW_INTERVAL_FACTOR,
  SPELL_INTERVAL_SEC,
} from '../config'
import type { ActiveBuff } from '../history'
import { frightenChance } from '../social'
import { rollD20, type RollMode } from '../dice'
import {
  armorClass,
  heavyArmorIntervalMultiplier,
  totalItemStats,
  weaponIntervalBase,
  type Equipment,
} from '../equipment'
import { intervalMs } from '../interval'
import type { Inventory } from '../inventory'
import type { Rng } from '../rng'
import {
  emptySignatureRuntime,
  forEachSignature,
  type SignatureRuntime,
} from '../signatures'
import { secondarySignatureUnlocked } from '../multiclass'
import {
  buildFightSlots,
  unlockSkillFor,
  usesSpellLoop,
  type SpellLoadout,
  type SpellSlot,
} from '../spells'
import { levelForXp, tier } from '../xp'

export interface CombatLootGain {
  id: string
  name: string
  quantity: number
}

export interface CombatFight {
  monsterId: string
  biome: BiomeId
  playerHp: number
  playerMaxHp: number
  monsterHp: number
  monsterMaxHp: number
  playerProgressMs: number
  monsterProgressMs: number
  phase: 'fight' | 'rest'
  restProgressMs: number
  playerIntervalMs: number
  monsterIntervalMs: number
  playerIntervalCount: number
  nextAttackAdvantage: boolean
  monsterNextDisadvantage: boolean
  slowActive: boolean
  pushDelayMs: number
  cleaveOverflow: number
  ammoSpent: number
  signature: SignatureRuntime
  /** Secondary class signature id when unlocked (Class Level ≥ 5); null otherwise. */
  secondarySignatureId: string | null
  kills: number
  sessionMs: number
  lootGained: CombatLootGain[]
  goldGained: number
  classXpGained: number
  openingDone: boolean
  outOfAmmo: boolean
  defeated: boolean
  log: string[]
  spellSlots: SpellSlot[]
  rotationIndex: number
  concentration: BuffEffectId | null
  /** Shield spell: +5 AC until the next hit taken. */
  shieldBonus: number
  /** Set when running a dungeon; null for Monster Hunting. */
  dungeonId: string | null
  /** Index into the dungeon run order. */
  nodeIndex: number
  runsCompleted: number
  restKind: 'short' | 'long' | null
  roomLog: string[]
  /** When set, dungeon stops after one chest (quest step). */
  questId: string | null
  /** Pending cleave applied when the next monster node starts. */
  pendingCleave: number
  /** CON Rank 20: survive at 1 HP once per fight. */
  relentlessUsed: boolean
  /** Menace Trophy: remaining Frighten attacks at −25% damage. */
  frightenAttacksLeft: number
  /** Monster ids killed during the current advance tick (quest progress). */
  killsThisTick: string[]
  /** Dungeon cleared this tick (chest looted). */
  dungeonClearedThisTick: string | null
}

export interface CombatAction {
  kind: 'combat'
  label: string
  monsterId: string
  biome: BiomeId
  baseIntervalMs: number
  progressMs: number
  mode?: 'hunt' | 'dungeon'
  dungeonId?: string
  questId?: string
}

export function maxHp(hitDie: number, classTier: number, conMod: number): number {
  const avg = Math.floor(hitDie / 2) + 1
  const perTier = Math.max(1, avg + conMod)
  return hitDie + perTier * Math.max(0, classTier - 1)
}

/** Class HP with CON percent, then flat item max HP. */
export function playerMaxHp(
  hitDie: number,
  classTier: number,
  conMod: number,
  skills: Record<SkillId, SkillProgress>,
  equipment: Equipment,
): number {
  const maxHpPct = effectTotal(activePerks({ skills }), 'maxHpPct')
  const base = Math.floor(maxHp(hitDie, classTier, conMod) * (1 + maxHpPct))
  return base + totalItemStats(equipment).maxHp
}

/** CON Rank 20: if a hit would drop HP to 0 and Relentless is unused, stay at 1 HP once. */
export function tryRelentless(
  fight: CombatFight,
  skills: Record<SkillId, SkillProgress>,
): boolean {
  if (fight.playerHp > 0 || fight.relentlessUsed) return false
  if (!hasPerkEffect(activePerks({ skills }), 'surviveAt1')) return false
  fight.playerHp = 1
  fight.relentlessUsed = true
  return true
}

export function monsterIntervalBaseMs(size: CreatureSize): number {
  return MONSTER_INTERVAL_SEC[size] * 1000
}

export function savingThrow(input: {
  rng: Rng
  ability: AbilityAbbr
  dc: number
  abilityMod: number
  proficient: boolean
  proficiencyBonus: number
  mode?: RollMode
}): { natural: number; total: number; success: boolean } {
  const natural = rollD20(input.rng, input.mode ?? 'normal')
  const bonus = input.abilityMod + (input.proficient ? input.proficiencyBonus : 0)
  const total = natural + bonus
  return { natural, total, success: total >= input.dc }
}

export function abilityModMap(skills: Record<SkillId, SkillProgress>): Record<AbilityAbbr, number> {
  const mods = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 }
  for (const ability of deriveAbilities(skills)) mods[ability.abbr] = ability.modifier
  return mods
}

export function abilityScoreMap(skills: Record<SkillId, SkillProgress>): Record<AbilityAbbr, number> {
  const scores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
  for (const ability of deriveAbilities(skills)) scores[ability.abbr] = ability.score
  return scores
}

export function pushLog(fight: CombatFight, line: string, trace: boolean) {
  if (!trace) return
  fight.log = [...fight.log, line].slice(-COMBAT_LOG_LIMIT)
}

export function playerWeapon(equipment: Equipment) {
  const main = equipment.mainHand ? getItem(equipment.mainHand) : undefined
  return main?.gear?.weapon
}

export function playerMagicBonus(equipment: Equipment): number {
  const main = equipment.mainHand ? getItem(equipment.mainHand) : undefined
  return main?.gear?.magicBonus ?? 0
}

export function attackAbilityMod(
  weapon: ReturnType<typeof playerWeapon>,
  mods: Record<AbilityAbbr, number>,
): { mod: number; abbr: AbilityAbbr } {
  if (!weapon) return { mod: mods.STR, abbr: 'STR' }
  if (weapon.range === 'ranged') return { mod: mods.DEX, abbr: 'DEX' }
  if (weapon.properties.includes('finesse')) {
    return mods.DEX >= mods.STR ? { mod: mods.DEX, abbr: 'DEX' } : { mod: mods.STR, abbr: 'STR' }
  }
  return { mod: mods.STR, abbr: 'STR' }
}

export function damageDice(equipment: Equipment): string {
  const weapon = playerWeapon(equipment)
  if (!weapon) return '1'
  if (weapon.properties.includes('versatile') && weapon.versatileDice && equipment.offHand == null) {
    return weapon.versatileDice
  }
  return weapon.dice
}

export function damageTypeOf(equipment: Equipment): DamageType {
  return playerWeapon(equipment)?.damageType ?? 'bludgeoning'
}

export function masteryOf(equipment: Equipment): WeaponMastery | null {
  return playerWeapon(equipment)?.mastery ?? null
}

export function computePlayerIntervalMs(
  skills: Record<SkillId, SkillProgress>,
  equipment: Equipment,
  spellcasting = false,
): number {
  const mods = abilityModMap(skills)
  const scores = abilityScoreMap(skills)
  const baseSec = spellcasting ? SPELL_INTERVAL_SEC : weaponIntervalBase(playerWeapon(equipment))
  const speedPct = spellcasting ? 0 : totalItemStats(equipment).attackSpeedPct
  const base = intervalMs(baseSec * 1000, mods.DEX, speedPct / 100, true)
  return base * heavyArmorIntervalMultiplier(equipment, scores.STR)
}

export function playerArmorClass(fight: CombatFight, equipment: Equipment, dexMod: number): number {
  let ac = armorClass(equipment, dexMod) + fight.shieldBonus
  if (fight.concentration === 'shieldOfFaith') ac += 2
  if (fight.concentration === 'barkskin') ac = Math.max(ac, 16)
  return ac
}

export function skillLevel(skills: Record<SkillId, SkillProgress>, skillId: SkillId | null): number {
  if (!skillId) return 1
  return levelForXp(skills[skillId]?.xp ?? 0)
}

export function computeMonsterIntervalMs(monster: MonsterDef, slowActive: boolean): number {
  const base = monsterIntervalBaseMs(monster.size)
  return slowActive ? base * SLOW_INTERVAL_FACTOR : base
}

export function rollFrightenAttacks(buffs: ActiveBuff[] | undefined, rng: Rng): number {
  const chance = frightenChance(buffs)
  if (!(chance > 0) || rng() >= chance) return 0
  return FRIGHTEN_ATTACKS
}

export function createFight(input: {
  monsterId: string
  biome: BiomeId
  skills: Record<SkillId, SkillProgress>
  equipment: Equipment
  activeClassId: ClassId
  classXp: number
  rng: Rng
  trace?: boolean
  spellLoadout?: SpellLoadout
  activeBuffs?: ActiveBuff[]
  secondaryClassId?: ClassId | null
  secondaryClassXp?: number
}): CombatFight | null {
  const monster = getMonster(input.monsterId)
  if (!monster) return null
  const cls = getClass(input.activeClassId)
  const mods = abilityModMap(input.skills)
  const classLevel = levelForXp(input.classXp)
  const classTier = tier(classLevel)
  const playerMax = playerMaxHp(cls.hitDie, classTier, mods.CON, input.skills, input.equipment)
  const casting = usesSpellLoop(input.activeClassId)
  const playerInterval = computePlayerIntervalMs(input.skills, input.equipment, casting)
  const signature = emptySignatureRuntime(cls.signatureAbility.id)
  const secondaryClassId = input.secondaryClassId ?? null
  const secondaryClassXp = input.secondaryClassXp ?? 0
  const secondarySignatureId =
    secondaryClassId && secondarySignatureUnlocked(secondaryClassXp)
      ? getClass(secondaryClassId).signatureAbility.id
      : null
  const unlockSkill = unlockSkillFor(input.activeClassId)
  const spellSlots = buildFightSlots({
    classId: input.activeClassId,
    classTier,
    skillLevel: skillLevel(input.skills, unlockSkill),
    loadout: input.spellLoadout,
    secondaryClassId,
    skills: input.skills,
  })
  const frightenAttacksLeft = rollFrightenAttacks(input.activeBuffs, input.rng)
  const fight: CombatFight = {
    monsterId: monster.id,
    biome: input.biome,
    playerHp: playerMax,
    playerMaxHp: playerMax,
    monsterHp: monster.hp,
    monsterMaxHp: monster.hp,
    playerProgressMs: 0,
    monsterProgressMs: 0,
    phase: 'fight',
    restProgressMs: 0,
    playerIntervalMs: playerInterval,
    monsterIntervalMs: computeMonsterIntervalMs(monster, false),
    playerIntervalCount: 0,
    nextAttackAdvantage: false,
    monsterNextDisadvantage: false,
    slowActive: false,
    pushDelayMs: 0,
    cleaveOverflow: 0,
    ammoSpent: 0,
    signature,
    secondarySignatureId,
    kills: 0,
    sessionMs: 0,
    lootGained: [],
    goldGained: 0,
    classXpGained: 0,
    openingDone: false,
    outOfAmmo: false,
    defeated: false,
    log: [],
    spellSlots,
    rotationIndex: 0,
    concentration: null,
    shieldBonus: 0,
    dungeonId: null,
    nodeIndex: 0,
    runsCompleted: 0,
    restKind: null,
    roomLog: [],
    questId: null,
    pendingCleave: 0,
    relentlessUsed: false,
    frightenAttacksLeft,
    killsThisTick: [],
    dungeonClearedThisTick: null,
  }

  const ctxBase = {
    runtime: signature,
    tier: classTier,
    abilityMod: (abbr: AbilityAbbr) => mods[abbr],
    rng: input.rng,
    trace: input.trace ?? false,
    log: (line: string) => pushLog(fight, line, input.trace ?? false),
  }
  forEachSignature(signature.id, secondarySignatureId, (hooks) => {
    hooks.onFightStart?.(ctxBase)
  })
  if (signature.id === 'huntersMark' || secondarySignatureId === 'huntersMark') {
    signature.markedType = monster.creatureType
  }
  if (frightenAttacksLeft > 0) {
    pushLog(fight, `Frighten: the enemy deals less damage for ${frightenAttacksLeft} attacks.`, input.trace ?? false)
  }

  return fight
}

/** Start a dungeon at encounter 0. Caller must have already consumed the entry item. */
export function beginDungeonFight(input: {
  dungeonId: string
  skills: Record<SkillId, SkillProgress>
  equipment: Equipment
  activeClassId: ClassId
  classXp: number
  rng: Rng
  trace?: boolean
  spellLoadout?: SpellLoadout
  questId?: string | null
  activeBuffs?: ActiveBuff[]
  secondaryClassId?: ClassId | null
  secondaryClassXp?: number
}): CombatFight | null {
  const dungeon = getDungeon(input.dungeonId)
  if (!dungeon) return null
  const first = dungeon.encounters[0]
  if (!first) return null
  const fight = createFight({
    monsterId: first,
    biome: dungeon.biome,
    skills: input.skills,
    equipment: input.equipment,
    activeClassId: input.activeClassId,
    classXp: input.classXp,
    rng: input.rng,
    trace: input.trace,
    spellLoadout: input.spellLoadout,
    activeBuffs: input.activeBuffs,
    secondaryClassId: input.secondaryClassId,
    secondaryClassXp: input.secondaryClassXp,
  })
  if (!fight) return null
  fight.dungeonId = dungeon.id
  fight.nodeIndex = 0
  fight.runsCompleted = 0
  fight.restKind = null
  fight.roomLog = []
  fight.questId = input.questId ?? null
  fight.pendingCleave = 0
  return fight
}

export interface CombatAdvanceInput {
  fight: CombatFight
  skills: Record<SkillId, SkillProgress>
  inventory: Inventory
  gold: number
  favor?: number
  bounty?: import('../social').Bounty | null
  equipment: Equipment
  activeClassId: ClassId
  classXp: number
  secondaryClassXp?: number
  echoes?: number
  /** True when a secondary class is active (earns MULTICLASS_XP_SHARE). */
  hasSecondary?: boolean
  elapsedMs: number
  rng: Rng
  trace: boolean
  modifiers?: Partial<Record<AbilityAbbr, number>>
  /** Missing means on. */
  stopWhenOutOfFood?: boolean
  /** History bestiary volumes by creature type. */
  bestiaries?: Partial<Record<import('../../data/monsters/types').CreatureType, number>>
  /** History tome volumes; Vitality XP uses the vitality entry. */
  tomes?: Partial<Record<SkillId, number>>
  activeBuffs?: ActiveBuff[]
}

export interface CombatAdvanceResult {
  favor?: number
  bounty?: import('../social').Bounty | null
  fight: CombatFight | null
  skills: Record<SkillId, SkillProgress>
  inventory: Inventory
  gold: number
  classXp: number
  secondaryClassXp?: number
  stop: boolean
  /** Last fight snapshot for log lines when the hunt ends. */
  lastLog: string[]
  kills: number
  defeated: boolean
  /** Quest id when a quest dungeon/combat step finished this tick. */
  questStepComplete?: string | null
  /** True when a dungeon run ended (defeat, stop, missing key, or quest one-shot). */
  leftDungeonOrQuest?: boolean
  /** Monster ids killed this advance tick. */
  killsThisTick?: string[]
  /** Dungeon id cleared (chest looted) this tick. */
  dungeonCleared?: string | null
}
