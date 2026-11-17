import { getClass, type ClassId } from '../data/classes'
import { getDungeon } from '../data/dungeons'
import { getItem, type DamageType, type ItemId, type WeaponMastery } from '../data/items'
import { getMonster, type BiomeId, type CreatureSize, type MonsterDef } from '../data/monsters'
import { getSpell, type BuffEffectId, type SpellId } from '../data/spells'
import type { AbilityAbbr, SkillProgress } from '../types/game'
import type { SkillId } from '../data/skills'
import { deriveAbilities } from './abilities'
import {
  AMMO_RECOVERY,
  AUTO_EAT_THRESHOLD,
  COMBAT_LOG_LIMIT,
  MATERIAL_FLAGS,
  MONSTER_INTERVAL_SEC,
  PUSH_DELAY_FRACTION,
  QUICKENED_INTERVAL_FACTOR,
  RESPAWN_MS,
  SLOW_INTERVAL_FACTOR,
  SPELL_INTERVAL_SEC,
  SPELL_SLOT_MODEL,
} from './config'
import { applyDamageModifiers } from './damage'
import { resolveRollMode, roll, rollD20, rollDamageParts, type RollMode } from './dice'
import {
  applyLootToInventory,
  buildRunOrder,
  consumeEntryItem,
  resolveSecret,
  resolveTrap,
  type DungeonNode,
} from './dungeon'
import {
  emptyEquipment,
  armorClass,
  heavyArmorIntervalMultiplier,
  weaponIntervalBase,
  type Equipment,
} from './equipment'
import { intervalMs } from './interval'
import { addItems, removeItems, type Inventory } from './inventory'
import { rollGold, rollLoot } from './loot'
import type { Rng } from './rng'
import {
  emptySignatureRuntime,
  flurryDieSides,
  getSignatureHooks,
  shouldFlurry,
  tryBardicInspiration,
  tryQuicken,
  tryWildShape,
  type SignatureRuntime,
} from './signatures'
import { longRest, shortRest } from './rest'
import {
  buildFightSlots,
  castingAbilityFor,
  componentBagId,
  concentrationDc,
  diceForCast,
  hasComponentBag,
  markSlotSpent,
  pickSlotForCast,
  spendLowestSlot,
  unlockSkillFor,
  usesSpellLoop,
  type SpellLoadout,
  type SpellSlot,
} from './spells'
import { addXp, applyXpModifiers, levelForXp, proficiency, tier } from './xp'

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

function abilityModMap(skills: Record<SkillId, SkillProgress>): Record<AbilityAbbr, number> {
  const mods = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 }
  for (const ability of deriveAbilities(skills)) mods[ability.abbr] = ability.modifier
  return mods
}

function abilityScoreMap(skills: Record<SkillId, SkillProgress>): Record<AbilityAbbr, number> {
  const scores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
  for (const ability of deriveAbilities(skills)) scores[ability.abbr] = ability.score
  return scores
}

function pushLog(fight: CombatFight, line: string, trace: boolean) {
  if (!trace) return
  fight.log = [...fight.log, line].slice(-COMBAT_LOG_LIMIT)
}

function playerWeapon(equipment: Equipment) {
  const main = equipment.mainHand ? getItem(equipment.mainHand) : undefined
  return main?.gear?.weapon
}

function playerMagicBonus(equipment: Equipment): number {
  const main = equipment.mainHand ? getItem(equipment.mainHand) : undefined
  return main?.gear?.magicBonus ?? 0
}

function attackAbilityMod(
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

function damageDice(equipment: Equipment): string {
  const weapon = playerWeapon(equipment)
  if (!weapon) return '1'
  if (weapon.properties.includes('versatile') && weapon.versatileDice && equipment.offHand == null) {
    return weapon.versatileDice
  }
  return weapon.dice
}

function damageTypeOf(equipment: Equipment): DamageType {
  return playerWeapon(equipment)?.damageType ?? 'bludgeoning'
}

function masteryOf(equipment: Equipment): WeaponMastery | null {
  return playerWeapon(equipment)?.mastery ?? null
}

function computePlayerIntervalMs(
  skills: Record<SkillId, SkillProgress>,
  equipment: Equipment,
  spellcasting = false,
): number {
  const mods = abilityModMap(skills)
  const scores = abilityScoreMap(skills)
  const baseSec = spellcasting ? SPELL_INTERVAL_SEC : weaponIntervalBase(playerWeapon(equipment))
  const base = intervalMs(baseSec * 1000, mods.DEX, 0, true)
  return base * heavyArmorIntervalMultiplier(equipment, scores.STR)
}

function playerArmorClass(fight: CombatFight, equipment: Equipment, dexMod: number): number {
  let ac = armorClass(equipment, dexMod) + fight.shieldBonus
  if (fight.concentration === 'shieldOfFaith') ac += 2
  if (fight.concentration === 'barkskin') ac = Math.max(ac, 16)
  return ac
}

function skillLevel(skills: Record<SkillId, SkillProgress>, skillId: SkillId | null): number {
  if (!skillId) return 1
  return levelForXp(skills[skillId]?.xp ?? 0)
}

function computeMonsterIntervalMs(monster: MonsterDef, slowActive: boolean): number {
  const base = monsterIntervalBaseMs(monster.size)
  return slowActive ? base * SLOW_INTERVAL_FACTOR : base
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
}): CombatFight | null {
  const monster = getMonster(input.monsterId)
  if (!monster) return null
  const cls = getClass(input.activeClassId)
  const mods = abilityModMap(input.skills)
  const classLevel = levelForXp(input.classXp)
  const classTier = tier(classLevel)
  const playerMax = maxHp(cls.hitDie, classTier, mods.CON)
  const casting = usesSpellLoop(input.activeClassId)
  const playerInterval = computePlayerIntervalMs(input.skills, input.equipment, casting)
  const signature = emptySignatureRuntime(cls.signatureAbility.id)
  const unlockSkill = unlockSkillFor(input.activeClassId)
  const spellSlots = buildFightSlots({
    classId: input.activeClassId,
    classTier,
    skillLevel: skillLevel(input.skills, unlockSkill),
    loadout: input.spellLoadout,
  })
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
  }

  const hooks = getSignatureHooks(signature.id)
  const ctxBase = {
    runtime: signature,
    tier: classTier,
    abilityMod: (abbr: AbilityAbbr) => mods[abbr],
    rng: input.rng,
    trace: input.trace ?? false,
    log: (line: string) => pushLog(fight, line, input.trace ?? false),
  }
  hooks.onFightStart?.(ctxBase)
  if (signature.id === 'huntersMark') signature.markedType = monster.creatureType

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

function recoverAmmo(inventory: Inventory, equipment: Equipment, spent: number): Inventory {
  if (spent <= 0) return inventory
  const ammoId = equipment.ammo
  if (!ammoId) return inventory
  const recovered = Math.floor(spent * AMMO_RECOVERY)
  if (recovered <= 0) return inventory
  return addItems(inventory, [{ itemId: ammoId, quantity: recovered }])
}

function mergeLoot(existing: CombatLootGain[], gained: { itemId: string; quantity: number }[]): CombatLootGain[] {
  const next = [...existing]
  for (const stack of gained) {
    const found = next.find((entry) => entry.id === stack.itemId)
    const name = getItem(stack.itemId)?.name ?? stack.itemId
    if (found) found.quantity += stack.quantity
    else next.push({ id: stack.itemId, name, quantity: stack.quantity })
  }
  return next
}

function spendAmmo(
  fight: CombatFight,
  inventory: Inventory,
  equipment: Equipment,
  trace: boolean,
): { inventory: Inventory; ok: boolean } {
  const weapon = playerWeapon(equipment)
  if (!weapon?.properties.includes('ammunition')) return { inventory, ok: true }
  const ammoId = equipment.ammo
  if (!ammoId || (inventory[ammoId] ?? 0) <= 0) {
    fight.outOfAmmo = true
    pushLog(fight, 'Out of ammo. Hunt stopped.', trace)
    return { inventory, ok: false }
  }
  fight.ammoSpent += 1
  return { inventory: removeItems(inventory, [{ itemId: ammoId, quantity: 1 }]), ok: true }
}

function resolvePlayerAttack(input: {
  fight: CombatFight
  monster: MonsterDef
  skills: Record<SkillId, SkillProgress>
  equipment: Equipment
  inventory: Inventory
  activeClassId: ClassId
  classXp: number
  rng: Rng
  trace: boolean
  labelPrefix: string
  unarmedOverride?: { dice: string; damageType: DamageType; mastery: null }
}): {
  inventory: Inventory
  classXp: number
  skills: Record<SkillId, SkillProgress>
  killed: boolean
  stopped: boolean
} {
  const { fight, monster, equipment, rng, trace } = input
  let { inventory, classXp, skills } = input
  const cls = getClass(input.activeClassId)
  const mods = abilityModMap(skills)
  const scores = abilityScoreMap(skills)
  const classLevel = levelForXp(classXp)
  const classTier = tier(classLevel)
  const prof = proficiency(classTier)
  const weapon = input.unarmedOverride ? null : playerWeapon(equipment)
  const magic = input.unarmedOverride ? 0 : playerMagicBonus(equipment)
  const { mod: abilityBonus } = attackAbilityMod(weapon, mods)
  const mastery = input.unarmedOverride ? null : masteryOf(equipment)

  if (!input.unarmedOverride) {
    const ammo = spendAmmo(fight, inventory, equipment, trace)
    inventory = ammo.inventory
    if (!ammo.ok) return { inventory, classXp, skills, killed: false, stopped: true }
  }

  const heavyStrain =
    weapon?.properties.includes('heavy') &&
    scores.STR < 13 &&
    !(equipment.mainHand && getItem(equipment.mainHand)?.gear?.material === 'mithral' && MATERIAL_FLAGS.mithral.ignoresStrAndStealth)

  const advSources: Array<'advantage' | 'disadvantage'> = []
  if (fight.nextAttackAdvantage) advSources.push('advantage')
  if (fight.concentration === 'faerieFire') advSources.push('advantage')
  if (heavyStrain) advSources.push('disadvantage')
  fight.nextAttackAdvantage = false
  const mode = resolveRollMode(advSources)
  const hasAdvantage = mode === 'advantage'

  const hooks = getSignatureHooks(fight.signature.id)
  const sigCtx = {
    runtime: fight.signature,
    tier: classTier,
    abilityMod: (abbr: AbilityAbbr) => mods[abbr],
    rng,
    trace,
    log: (line: string) => pushLog(fight, line, trace),
  }
  hooks.onBeforeAttack?.({ ...sigCtx, hasAdvantage, intervalIndex: fight.playerIntervalCount })

  let natural = rollD20(rng, mode)
  let total = natural + abilityBonus + prof + magic
  let bardicNote = ''
  if (fight.signature.id === 'bardicInspiration') {
    const result = tryBardicInspiration(
      fight.signature.bardicUses,
      natural,
      total,
      monster.ac,
      classTier,
      rng,
    )
    if (result.bonus > 0) {
      fight.signature.bardicUses = result.uses
      total = result.total
      bardicNote = ` Bardic (+${result.bonus}).`
    }
  }

  const autoMiss = natural === 1
  const crit = natural === 20
  const hit = !autoMiss && (crit || total >= monster.ac)
  const intervalSec = (fight.playerIntervalMs / 1000).toFixed(2)
  let line = `${input.labelPrefix}${intervalSec}s. to hit: ${total}${bardicNote} - ${hit ? 'hits' : 'misses'}.`

  if (!hit) {
    if (mastery === 'graze' && abilityBonus > 0) {
      const graze = applyDamageModifiers(
        abilityBonus,
        damageTypeOf(equipment),
        monster.resistances,
        monster.vulnerabilities,
        monster.immunities,
      )
      fight.monsterHp = Math.max(0, fight.monsterHp - graze)
      line += ` Graze: ${graze} damage.`
      pushLog(fight, line, trace)
      return {
        inventory,
        classXp,
        skills,
        killed: fight.monsterHp <= 0,
        stopped: false,
      }
    }
    pushLog(fight, line, trace)
    return { inventory, classXp, skills, killed: false, stopped: false }
  }

  const diceNotation = input.unarmedOverride?.dice ?? damageDice(equipment)
  const dtype = input.unarmedOverride?.damageType ?? damageTypeOf(equipment)
  const parts = rollDamageParts(diceNotation, rng, crit)
  const hitCtx = {
    ...sigCtx,
    hasAdvantage,
    crit,
    bonusDice: 0,
    bonusFlat: 0,
    creatureType: monster.creatureType,
    spendLowestSlot: () => spendLowestSlot(fight.spellSlots),
  }
  hooks.onHit?.(hitCtx)
  if (fight.concentration === 'divineFavor') {
    const favor = roll('1d6', rng)
    hitCtx.bonusDice += favor
    if (trace) line += ` Divine Favor [1d6] ${favor}.`
  }
  if (fight.concentration === 'huntersMark') {
    const mark = roll('1d6', rng)
    hitCtx.bonusDice += mark
    if (trace) line += ` Hunter's Mark [1d6] ${mark}.`
  }

  const raw = Math.max(0, parts.dice + parts.flat + magic + abilityBonus + hitCtx.bonusDice + hitCtx.bonusFlat)
  const dealt = applyDamageModifiers(
    raw,
    dtype,
    monster.resistances,
    monster.vulnerabilities,
    monster.immunities,
  )
  const before = fight.monsterHp
  fight.monsterHp = Math.max(0, fight.monsterHp - dealt)
  const overflow = before > 0 && fight.monsterHp === 0 ? dealt - before : 0
  if (mastery === 'cleave' && overflow > 0) fight.cleaveOverflow += overflow

  line += ` [${diceNotation}] + ${abilityBonus + magic + hitCtx.bonusFlat} damage${crit ? ' (crit)' : ''}.`
  if (hitCtx.bonusDice > 0) line += ` bonus dice ${hitCtx.bonusDice}.`

  // Masteries on hit
  if (mastery === 'vex') fight.nextAttackAdvantage = true
  if (mastery === 'sap') fight.monsterNextDisadvantage = true
  if (mastery === 'slow' && !fight.slowActive) {
    fight.slowActive = true
    fight.monsterIntervalMs = computeMonsterIntervalMs(monster, true)
  }
  if (mastery === 'push') {
    fight.pushDelayMs = fight.monsterIntervalMs * PUSH_DELAY_FRACTION
  }
  if (mastery === 'topple') {
    const dc = 8 + prof + abilityBonus
    const save = savingThrow({
      rng,
      ability: 'CON',
      dc,
      abilityMod: monster.saveBonuses.CON ?? 0,
      proficient: false,
      proficiencyBonus: 0,
    })
    if (!save.success) {
      fight.nextAttackAdvantage = true
      line += ` Topple: prone.`
    } else {
      line += ` Topple: saved.`
    }
  }
  if (mastery === 'nick' && weapon?.properties.includes('light') && equipment.offHand) {
    const off = getItem(equipment.offHand)?.gear?.weapon
    if (off) {
      const nickRoll = 1 + Math.floor(rng() * 10)
      if (nickRoll <= 2) {
        const nickParts = rollDamageParts(off.dice, rng, false)
        const nickDmg = applyDamageModifiers(
          nickParts.total,
          off.damageType,
          monster.resistances,
          monster.vulnerabilities,
          monster.immunities,
        )
        fight.monsterHp = Math.max(0, fight.monsterHp - nickDmg)
        line += ` Nick ([2/1d10]): ${nickRoll} - nick - [${off.dice}] offhand damage.`
      } else {
        line += ` Nick ([2/1d10]): ${nickRoll} - no nick`
      }
    }
  }

  pushLog(fight, line, trace)
  return {
    inventory,
    classXp,
    skills,
    killed: fight.monsterHp <= 0,
    stopped: false,
  }
}

function resolveSpellCast(input: {
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
  let { inventory, classXp, skills } = input
  const mods = abilityModMap(skills)
  const classTier = tier(levelForXp(classXp))
  const prof = proficiency(classTier)
  const castAbility = castingAbilityFor(input.activeClassId)
  const castMod = mods[castAbility]
  const unlock = unlockSkillFor(input.activeClassId)
  const skillLvl = skillLevel(skills, unlock)
  const saveDc = 8 + prof + castMod

  const picked = pickSlotForCast({
    slots: fight.spellSlots,
    rotationIndex: fight.rotationIndex,
    model: SPELL_SLOT_MODEL,
  })
  fight.rotationIndex = picked.nextRotationIndex

  let slot = fight.spellSlots[picked.slotIndex]
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

function applyPlayerDamage(input: {
  fight: CombatFight
  amount: number
  damageType: DamageType
  skills: Record<SkillId, SkillProgress>
  activeClassId: ClassId
  classXp: number
  rng: Rng
  trace: boolean
  modifiers: Partial<Record<AbilityAbbr, number>>
}): { skills: Record<SkillId, SkillProgress>; defeated: boolean } {
  const { fight, rng, trace } = input
  let skills = input.skills
  let amount = input.amount
  const cls = getClass(input.activeClassId)
  const mods = abilityModMap(skills)
  const classTier = tier(levelForXp(input.classXp))
  const hooks = getSignatureHooks(fight.signature.id)

  if (fight.concentration === 'protectionFromEnergyFire' && input.damageType === 'fire') {
    amount = Math.floor(amount / 2)
  }

  hooks.onDamaged?.({
    runtime: fight.signature,
    tier: classTier,
    abilityMod: (abbr) => mods[abbr],
    rng,
    trace,
    log: (line) => pushLog(fight, line, trace),
    damage: amount,
    damageType: input.damageType,
    setDamage: (next) => {
      amount = next
    },
  })

  // Adamantine: crits become normal — handled at attack time if needed later.
  const taken = Math.max(0, amount)
  if (taken > 0) {
    if (fight.shieldBonus > 0) fight.shieldBonus = 0
    fight.playerHp = Math.max(0, fight.playerHp - taken)
    const vitalityXp = applyXpModifiers(taken, 'CON', input.modifiers)
    skills = {
      ...skills,
      vitality: { xp: addXp(skills.vitality.xp, vitalityXp) },
    }

    if (fight.concentration) {
      const dc = concentrationDc(taken)
      const save = savingThrow({
        rng,
        ability: 'CON',
        dc,
        abilityMod: mods.CON,
        proficient: cls.saveProficiencies.includes('CON'),
        proficiencyBonus: proficiency(classTier),
      })
      if (save.success) {
        pushLog(fight, `Concentration DC ${dc}: ${save.total} - held.`, trace)
      } else {
        pushLog(fight, `Concentration DC ${dc}: ${save.total} - broken.`, trace)
        fight.concentration = null
      }
    }
  }

  if (fight.playerHp > 0) {
    hooks.onLowHp?.({
      runtime: fight.signature,
      tier: classTier,
      abilityMod: (abbr) => mods[abbr],
      rng,
      trace,
      log: (line) => pushLog(fight, line, trace),
      hp: fight.playerHp,
      maxHp: fight.playerMaxHp,
      heal: (healAmt) => {
        if (healAmt <= 0) return
        fight.playerHp = Math.min(fight.playerMaxHp, fight.playerHp + healAmt)
        const vitalityXp = applyXpModifiers(healAmt, 'CON', input.modifiers)
        skills = {
          ...skills,
          vitality: { xp: addXp(skills.vitality.xp, vitalityXp) },
        }
      },
    })
    return { skills, defeated: false }
  }

  // Wild Shape
  if (fight.signature.id === 'wildShape') {
    const temp = tryWildShape(fight.signature.wildShapeUsed, classTier)
    if (temp != null) {
      fight.signature.wildShapeUsed = true
      fight.playerHp = temp
      pushLog(fight, `Wild Shape: ${temp} temporary HP.`, trace)
      return { skills, defeated: false }
    }
  }

  fight.defeated = true
  pushLog(fight, 'You fall. Returning to town.', trace)
  return { skills, defeated: true }
}

function pushRoomLog(fight: CombatFight, line: string) {
  fight.roomLog = [...fight.roomLog, line].slice(-COMBAT_LOG_LIMIT)
}

function spawnDungeonMonster(
  fight: CombatFight,
  monster: MonsterDef,
  skills: Record<SkillId, SkillProgress>,
  equipment: Equipment,
  casting: boolean,
  trace: boolean,
): { killedByCleave: boolean } {
  fight.monsterId = monster.id
  fight.biome = fight.biome
  fight.phase = 'fight'
  fight.restProgressMs = 0
  fight.restKind = null
  fight.monsterHp = monster.hp
  fight.monsterMaxHp = monster.hp
  fight.openingDone = false
  fight.playerIntervalMs = computePlayerIntervalMs(skills, equipment, casting)
  fight.monsterIntervalMs = computeMonsterIntervalMs(monster, false)
  fight.playerProgressMs = 0
  fight.monsterProgressMs = 0
  fight.slowActive = false
  fight.pushDelayMs = 0
  fight.nextAttackAdvantage = false
  fight.monsterNextDisadvantage = false
  if (fight.signature.id === 'huntersMark') {
    fight.signature.markedType = monster.creatureType
  }

  const overflow = fight.pendingCleave + fight.cleaveOverflow
  fight.pendingCleave = 0
  fight.cleaveOverflow = 0
  if (overflow > 0) {
    const before = fight.monsterHp
    fight.monsterHp = Math.max(0, fight.monsterHp - overflow)
    const leftover = overflow - before
    pushLog(fight, `Cleave overflow ${overflow} → ${monster.name}.`, trace)
    if (fight.monsterHp === 0) {
      if (leftover > 0) fight.cleaveOverflow = leftover
      return { killedByCleave: true }
    }
  }
  pushLog(fight, `${monster.name} appears.`, trace)
  return { killedByCleave: false }
}

/**
 * After a dungeon kill or rest finishes: walk nodes until the next fight or timed rest.
 * Returns stop when the run ends (quest one-shot, missing entry item).
 */
function advanceDungeonNodes(input: {
  fight: CombatFight
  inventory: Inventory
  skills: Record<SkillId, SkillProgress>
  equipment: Equipment
  activeClassId: ClassId
  classXp: number
  classTier: number
  chaMod: number
  rng: Rng
  trace: boolean
  casting: boolean
}): {
  inventory: Inventory
  classXp: number
  skills: Record<SkillId, SkillProgress>
  stop: boolean
  questStepComplete: string | null
  monster: MonsterDef | null
} {
  const { fight, equipment, rng, trace, casting } = input
  let inventory = input.inventory
  let classXp = input.classXp
  let skills = input.skills
  const dungeon = getDungeon(fight.dungeonId ?? '')
  if (!dungeon) {
    return { inventory, classXp, skills, stop: true, questStepComplete: null, monster: null }
  }
  const order = buildRunOrder(dungeon)
  const restCtx = {
    classId: input.activeClassId,
    classTier: input.classTier,
    chaMod: input.chaMod,
  }

  const applyKillRewards = (monster: MonsterDef) => {
    const loot = rollLoot(monster.lootTable, rng, 1)
    inventory = addItems(inventory, loot)
    fight.lootGained = mergeLoot(fight.lootGained, loot)
    const gold = rollGold(monster.gold, rng, 1)
    fight.goldGained += gold
    fight.classXpGained += monster.xp
    classXp = addXp(classXp, monster.xp)
    fight.kills += 1
    pushLog(fight, `${monster.name} defeated. +${monster.xp} class XP.`, trace)
  }

  // Guard against infinite cleave chains.
  for (let guard = 0; guard < 64; guard++) {
    if (fight.nodeIndex >= order.length) {
      fight.nodeIndex = 0
    }
    const node: DungeonNode = order[fight.nodeIndex]

    if (node.kind === 'shortRest') {
      shortRest(fight, restCtx)
      fight.phase = 'rest'
      fight.restKind = 'short'
      fight.restProgressMs = 0
      fight.playerProgressMs = 0
      fight.monsterProgressMs = 0
      pushLog(fight, 'Short rest.', trace)
      return { inventory, classXp, skills, stop: false, questStepComplete: null, monster: getMonster(fight.monsterId) ?? null }
    }

    if (node.kind === 'longRest') {
      fight.runsCompleted += 1
      if (fight.questId) {
        pushLog(fight, 'Quest dungeon complete. Returning to town.', trace)
        return {
          inventory,
          classXp,
          skills,
          stop: true,
          questStepComplete: fight.questId,
          monster: null,
        }
      }
      const entry = consumeEntryItem(inventory, dungeon)
      inventory = entry.inventory
      if (!entry.ok) {
        pushLog(fight, 'No entry item for another loop. Returning to town.', trace)
        return { inventory, classXp, skills, stop: true, questStepComplete: null, monster: null }
      }
      longRest(fight, restCtx)
      fight.phase = 'rest'
      fight.restKind = 'long'
      fight.restProgressMs = 0
      fight.playerProgressMs = 0
      fight.monsterProgressMs = 0
      fight.cleaveOverflow = 0
      fight.pendingCleave = 0
      pushLog(fight, 'Long rest between loops.', trace)
      return { inventory, classXp, skills, stop: false, questStepComplete: null, monster: getMonster(fight.monsterId) ?? null }
    }

    if (node.kind === 'trap') {
      const result = resolveTrap(node.room, skills, rng)
      pushRoomLog(fight, result.line)
      pushLog(fight, result.line, trace)
      if (result.damage > 0) {
        fight.playerHp = Math.max(0, fight.playerHp - result.damage)
        if (fight.playerHp <= 0) {
          fight.defeated = true
          pushLog(fight, 'You fall. Returning to town.', trace)
          return { inventory, classXp, skills, stop: true, questStepComplete: null, monster: null }
        }
      }
      fight.nodeIndex += 1
      continue
    }

    if (node.kind === 'secret') {
      const result = resolveSecret(node.room, skills, rng)
      pushRoomLog(fight, result.line)
      pushLog(fight, result.line, trace)
      if (result.found && result.loot.length) {
        inventory = applyLootToInventory(inventory, result.loot)
        fight.lootGained = mergeLoot(fight.lootGained, result.loot)
      }
      fight.nodeIndex += 1
      continue
    }

    if (node.kind === 'chest') {
      const loot = rollLoot(dungeon.chest, rng, 1)
      inventory = applyLootToInventory(inventory, loot)
      fight.lootGained = mergeLoot(fight.lootGained, loot)
      const line = loot.length
        ? `Chest: ${loot.map((s) => `${s.itemId}×${s.quantity}`).join(', ')}.`
        : 'Chest: empty.'
      pushRoomLog(fight, line)
      pushLog(fight, line, trace)
      fight.nodeIndex += 1
      continue
    }

    if (node.kind === 'monster' || node.kind === 'boss') {
      const nextMonster = getMonster(node.monsterId)
      if (!nextMonster) {
        return { inventory, classXp, skills, stop: true, questStepComplete: null, monster: null }
      }
      const spawned = spawnDungeonMonster(fight, nextMonster, skills, equipment, casting, trace)
      if (spawned.killedByCleave) {
        applyKillRewards(nextMonster)
        fight.pendingCleave = fight.cleaveOverflow
        fight.nodeIndex += 1
        continue
      }
      return { inventory, classXp, skills, stop: false, questStepComplete: null, monster: nextMonster }
    }
  }

  return { inventory, classXp, skills, stop: true, questStepComplete: null, monster: null }
}

function onKill(input: {
  fight: CombatFight
  monster: MonsterDef
  inventory: Inventory
  equipment: Equipment
  classXp: number
  skills: Record<SkillId, SkillProgress>
  rng: Rng
  trace: boolean
  modifiers: Partial<Record<AbilityAbbr, number>>
  chaMod: number
  classTier: number
  activeClassId: ClassId
  casting: boolean
}): {
  inventory: Inventory
  classXp: number
  skills: Record<SkillId, SkillProgress>
  stop: boolean
  questStepComplete: string | null
  monster: MonsterDef | null
} {
  const { fight, monster, equipment, rng, trace } = input
  let inventory = recoverAmmo(input.inventory, equipment, fight.ammoSpent)
  fight.ammoSpent = 0

  const loot = rollLoot(monster.lootTable, rng, 1)
  inventory = addItems(inventory, loot)
  fight.lootGained = mergeLoot(fight.lootGained, loot)
  const gold = rollGold(monster.gold, rng, 1)
  fight.goldGained += gold
  fight.classXpGained += monster.xp
  const classXp = addXp(input.classXp, monster.xp)
  fight.kills += 1
  fight.slowActive = false
  fight.pushDelayMs = 0
  fight.nextAttackAdvantage = false
  fight.monsterNextDisadvantage = false

  pushLog(fight, `${monster.name} defeated. +${monster.xp} class XP.`, trace)

  const inDungeon = fight.dungeonId != null
  if (!inDungeon) {
    fight.cleaveOverflow = 0
    // Quest combat steps are one kill, then return to town.
    if (fight.questId) {
      return {
        inventory,
        classXp,
        skills: input.skills,
        stop: true,
        questStepComplete: fight.questId,
        monster,
      }
    }
    fight.phase = 'rest'
    fight.restProgressMs = 0
    fight.playerProgressMs = 0
    fight.monsterProgressMs = 0
    fight.pushDelayMs = 0
    longRest(fight, {
      classId: input.activeClassId,
      classTier: input.classTier,
      chaMod: input.chaMod,
    })
    fight.restKind = 'long'
    return {
      inventory,
      classXp,
      skills: input.skills,
      stop: false,
      questStepComplete: null,
      monster,
    }
  }

  // Carry cleave to the next dungeon monster.
  fight.pendingCleave = fight.cleaveOverflow
  fight.cleaveOverflow = 0
  fight.nodeIndex += 1
  return advanceDungeonNodes({
    fight,
    inventory,
    skills: input.skills,
    equipment,
    activeClassId: input.activeClassId,
    classXp,
    classTier: input.classTier,
    chaMod: input.chaMod,
    rng,
    trace,
    casting: input.casting,
  })
}

function respawnMonster(
  fight: CombatFight,
  monster: MonsterDef,
  skills: Record<SkillId, SkillProgress>,
  equipment: Equipment,
  casting: boolean,
) {
  fight.phase = 'fight'
  fight.restProgressMs = 0
  fight.monsterHp = monster.hp
  fight.monsterMaxHp = monster.hp
  fight.openingDone = false
  fight.playerIntervalMs = computePlayerIntervalMs(skills, equipment, casting)
  fight.monsterIntervalMs = computeMonsterIntervalMs(monster, false)
  fight.playerProgressMs = 0
  fight.monsterProgressMs = 0
}

function tryAutoEat(input: {
  fight: CombatFight
  inventory: Inventory
  equipment: Equipment
  skills: Record<SkillId, SkillProgress>
  modifiers: Partial<Record<AbilityAbbr, number>>
  trace: boolean
}): { inventory: Inventory; skills: Record<SkillId, SkillProgress>; ate: boolean; defeated: boolean } {
  const { fight, equipment, trace } = input
  let inventory = input.inventory
  let skills = input.skills
  if (fight.playerHp >= fight.playerMaxHp * AUTO_EAT_THRESHOLD) {
    return { inventory, skills, ate: false, defeated: false }
  }
  const foodId = equipment.food
  const item = foodId ? getItem(foodId) : undefined
  const heal = item?.heal
  if (!foodId || heal == null || (inventory[foodId] ?? 0) <= 0) {
    fight.defeated = true
    pushLog(fight, 'No food left. Returning to town.', trace)
    return { inventory, skills, ate: false, defeated: true }
  }
  inventory = removeItems(inventory, [{ itemId: foodId, quantity: 1 }])
  const before = fight.playerHp
  fight.playerHp = Math.min(fight.playerMaxHp, fight.playerHp + heal)
  const healed = fight.playerHp - before
  if (healed > 0) {
    const vitalityXp = applyXpModifiers(healed, 'CON', input.modifiers)
    skills = { ...skills, vitality: { xp: addXp(skills.vitality.xp, vitalityXp) } }
  }
  pushLog(fight, `Eat ${item?.name ?? foodId}: +${heal} HP.`, trace)
  return { inventory, skills, ate: true, defeated: false }
}

function doOpeningAttacks(input: {
  fight: CombatFight
  monster: MonsterDef
  skills: Record<SkillId, SkillProgress>
  equipment: Equipment
  inventory: Inventory
  activeClassId: ClassId
  classXp: number
  rng: Rng
  trace: boolean
}): ReturnType<typeof resolvePlayerAttack> {
  const { fight, monster, equipment } = input
  fight.openingDone = true
  if (usesSpellLoop(input.activeClassId)) {
    return {
      inventory: input.inventory,
      classXp: input.classXp,
      skills: input.skills,
      killed: false,
      stopped: false,
    }
  }
  const weapon = playerWeapon(equipment)
  const ranged = weapon?.range === 'ranged'
  const reach = weapon?.properties.includes('reach') && !monster.reach
  if (!ranged && !reach) {
    return {
      inventory: input.inventory,
      classXp: input.classXp,
      skills: input.skills,
      killed: false,
      stopped: false,
    }
  }
  return resolvePlayerAttack({
    ...input,
    labelPrefix: ranged ? 'Opening volley: ' : 'Reach opening: ',
  })
}

export interface CombatAdvanceInput {
  fight: CombatFight
  skills: Record<SkillId, SkillProgress>
  inventory: Inventory
  gold: number
  equipment: Equipment
  activeClassId: ClassId
  classXp: number
  elapsedMs: number
  rng: Rng
  trace: boolean
  modifiers?: Partial<Record<AbilityAbbr, number>>
}

export interface CombatAdvanceResult {
  fight: CombatFight | null
  skills: Record<SkillId, SkillProgress>
  inventory: Inventory
  gold: number
  classXp: number
  stop: boolean
  /** Last fight snapshot for log lines when the hunt ends. */
  lastLog: string[]
  kills: number
  defeated: boolean
  /** Quest id when a quest dungeon/combat step finished this tick. */
  questStepComplete?: string | null
  /** True when a dungeon run ended (defeat, stop, missing key, or quest one-shot). */
  leftDungeonOrQuest?: boolean
}

export function advanceCombat(input: CombatAdvanceInput): CombatAdvanceResult {
  let monster = getMonster(input.fight.monsterId)
  if (!monster && !input.fight.dungeonId) {
    return {
      fight: null,
      skills: input.skills,
      inventory: input.inventory,
      gold: input.gold,
      classXp: input.classXp,
      stop: true,
      lastLog: input.fight.log,
      kills: input.fight.kills,
      defeated: false,
    }
  }

  const fight = {
    ...input.fight,
    log: [...input.fight.log],
    lootGained: [...input.fight.lootGained],
    roomLog: [...(input.fight.roomLog ?? [])],
    signature: { ...input.fight.signature },
  }
  let skills = input.skills
  let inventory = input.inventory
  let gold = input.gold
  let classXp = input.classXp
  let remaining = input.elapsedMs
  const modifiers = input.modifiers ?? {}
  const equipment = input.equipment ?? emptyEquipment()
  const mods = () => abilityModMap(skills)
  const classTier = () => tier(levelForXp(classXp))
  const casting = usesSpellLoop(input.activeClassId)
  const trace = input.trace

  const flushGold = () => {
    if (fight.goldGained > 0) {
      gold += fight.goldGained
      fight.goldGained = 0
    }
  }

  const finishDefeat = (): CombatAdvanceResult => {
    inventory = recoverAmmo(inventory, equipment, fight.ammoSpent)
    fight.ammoSpent = 0
    flushGold()
    return {
      fight: null,
      skills,
      inventory,
      gold,
      classXp,
      stop: true,
      lastLog: fight.log,
      kills: fight.kills,
      defeated: fight.defeated,
      leftDungeonOrQuest: fight.dungeonId != null || fight.questId != null,
      questStepComplete: null,
    }
  }

  const finishStop = (questId: string | null = null): CombatAdvanceResult => {
    inventory = recoverAmmo(inventory, equipment, fight.ammoSpent)
    fight.ammoSpent = 0
    flushGold()
    return {
      fight: null,
      skills,
      inventory,
      gold,
      classXp,
      stop: true,
      lastLog: fight.log,
      kills: fight.kills,
      defeated: false,
      leftDungeonOrQuest: true,
      questStepComplete: questId,
    }
  }

  while (remaining > 0 && !fight.defeated && !fight.outOfAmmo) {
    if (fight.phase === 'rest') {
      // Attack timers do not advance while waiting for the next spawn.
      fight.playerProgressMs = 0
      fight.monsterProgressMs = 0
      fight.pushDelayMs = 0
      const need = Math.max(0, RESPAWN_MS - fight.restProgressMs)
      if (remaining < need) {
        fight.restProgressMs += remaining
        fight.sessionMs += remaining
        remaining = 0
        break
      }
      remaining -= need
      fight.sessionMs += need
      fight.restProgressMs = 0

      if (fight.dungeonId) {
        const wasLong = fight.restKind === 'long'
        if (wasLong) fight.nodeIndex = 0
        else fight.nodeIndex += 1
        const next = advanceDungeonNodes({
          fight,
          inventory,
          skills,
          equipment,
          activeClassId: input.activeClassId,
          classXp,
          classTier: classTier(),
          chaMod: mods().CHA,
          rng: input.rng,
          trace,
          casting,
        })
        inventory = next.inventory
        classXp = next.classXp
        skills = next.skills
        monster = next.monster
        flushGold()
        if (next.stop) return finishStop(next.questStepComplete)
        if (fight.defeated) return finishDefeat()
        continue
      }

      if (!monster) {
        return finishStop(null)
      }
      respawnMonster(fight, monster, skills, equipment, casting)
      fight.restKind = null
      pushLog(fight, `${monster.name} appears.`, trace)
      continue
    }

    if (!monster) {
      return finishStop(null)
    }

    // Opening attacks once per spawn
    if (!fight.openingDone) {
      const opened = doOpeningAttacks({
        fight,
        monster,
        skills,
        equipment,
        inventory,
        activeClassId: input.activeClassId,
        classXp,
        rng: input.rng,
        trace,
      })
      inventory = opened.inventory
      classXp = opened.classXp
      skills = opened.skills
        if (opened.stopped) {
        flushGold()
        return { fight: null, skills, inventory, gold, classXp, stop: true, lastLog: fight.log, kills: fight.kills, defeated: fight.defeated }
      }
      if (opened.killed) {
        const killed = onKill({
          fight,
          monster,
          inventory,
          equipment,
          classXp,
          skills,
          rng: input.rng,
          trace,
          modifiers,
          chaMod: mods().CHA,
          classTier: classTier(),
          activeClassId: input.activeClassId,
        casting,
        })
        inventory = killed.inventory
        classXp = killed.classXp
        skills = killed.skills
        if (killed.monster) monster = killed.monster
        flushGold()
        if (killed.stop) return finishStop(killed.questStepComplete)
        if (fight.defeated) return finishDefeat()
        continue
      }
      // Action Surge: one extra attack at fight start
      if (fight.signature.actionSurgeAvailable) {
        fight.signature.actionSurgeAvailable = false
        const surged = resolvePlayerAttack({
          fight,
          monster,
          skills,
          equipment,
          inventory,
          activeClassId: input.activeClassId,
          classXp,
          rng: input.rng,
          trace,
          labelPrefix: 'Action Surge: ',
        })
        inventory = surged.inventory
        classXp = surged.classXp
        skills = surged.skills
        if (surged.stopped) {
          flushGold()
          return { fight: null, skills, inventory, gold, classXp, stop: true, lastLog: fight.log, kills: fight.kills, defeated: fight.defeated }
        }
        if (surged.killed) {
          const killed = onKill({
            fight,
            monster,
            inventory,
            equipment,
            classXp,
            skills,
            rng: input.rng,
            trace,
            modifiers,
            chaMod: mods().CHA,
            classTier: classTier(),
            activeClassId: input.activeClassId,
          casting,
          })
          inventory = killed.inventory
          classXp = killed.classXp
          skills = killed.skills
          if (killed.monster) monster = killed.monster
          flushGold()
          if (killed.stop) return finishStop(killed.questStepComplete)
          if (fight.defeated) return finishDefeat()
          continue
        }
      }
    }

    if (fight.playerProgressMs <= 0) {
      let nextInterval = computePlayerIntervalMs(skills, equipment, casting)
      if (casting && fight.signature.quickenedReady) {
        nextInterval *= QUICKENED_INTERVAL_FACTOR
        fight.signature.quickenedReady = false
        pushLog(fight, 'Quickened Spell: interval halved.', trace)
      }
      fight.playerIntervalMs = nextInterval
    }
    fight.monsterIntervalMs = computeMonsterIntervalMs(monster, fight.slowActive)

    let playerReady = fight.playerProgressMs >= fight.playerIntervalMs - 1e-6
    let monsterReady = fight.pushDelayMs <= 0 && fight.monsterProgressMs >= fight.monsterIntervalMs - 1e-6

    if (!playerReady && !monsterReady) {
      if (remaining <= 0) break

      // Burn push delay first; the player timer still advances.
      if (fight.pushDelayMs > 0) {
        const burn = Math.min(fight.pushDelayMs, remaining)
        fight.pushDelayMs -= burn
        remaining -= burn
        fight.sessionMs += burn
        fight.playerProgressMs += burn
        playerReady = fight.playerProgressMs >= fight.playerIntervalMs - 1e-6
        monsterReady = fight.pushDelayMs <= 0 && fight.monsterProgressMs >= fight.monsterIntervalMs - 1e-6
        if (!playerReady && !monsterReady) continue
      } else {
        const playerNeed = Math.max(0, fight.playerIntervalMs - fight.playerProgressMs)
        const monsterNeed = Math.max(0, fight.monsterIntervalMs - fight.monsterProgressMs)
        const step = Math.min(playerNeed, monsterNeed, remaining)
        if (step <= 0) break
        fight.playerProgressMs += step
        fight.monsterProgressMs += step
        remaining -= step
        fight.sessionMs += step
        playerReady = fight.playerProgressMs >= fight.playerIntervalMs - 1e-6
        monsterReady = fight.monsterProgressMs >= fight.monsterIntervalMs - 1e-6
      }
    }

    // Resolve player first when simultaneous
    if (playerReady) {
      fight.playerProgressMs = 0
      fight.playerIntervalCount += 1

      const eaten = tryAutoEat({ fight, inventory, equipment, skills, modifiers, trace })
      inventory = eaten.inventory
      skills = eaten.skills
      if (eaten.defeated) return finishDefeat()
      if (!eaten.ate) {
        const attack = casting
          ? resolveSpellCast({
              fight,
              monster,
              skills,
              inventory,
              activeClassId: input.activeClassId,
              classXp,
              rng: input.rng,
              trace,
            })
          : resolvePlayerAttack({
              fight,
              monster,
              skills,
              equipment,
              inventory,
              activeClassId: input.activeClassId,
              classXp,
              rng: input.rng,
              trace,
              labelPrefix: `Int${fight.playerIntervalCount}: `,
            })
        inventory = attack.inventory
        classXp = attack.classXp
        skills = attack.skills
        if (casting && fight.signature.id === 'metamagicPactMagic') {
          tryQuicken(fight.signature)
        }
        if (attack.stopped) {
          flushGold()
          return { fight: null, skills, inventory, gold, classXp, stop: true, lastLog: fight.log, kills: fight.kills, defeated: fight.defeated }
        }
        if (attack.killed) {
          const killed = onKill({
            fight,
            monster,
            inventory,
            equipment,
            classXp,
            skills,
            rng: input.rng,
            trace,
            modifiers,
            chaMod: mods().CHA,
            classTier: classTier(),
            activeClassId: input.activeClassId,
          casting,
          })
          inventory = killed.inventory
          classXp = killed.classXp
          skills = killed.skills
          if (killed.monster) monster = killed.monster
          flushGold()
          if (killed.stop) return finishStop(killed.questStepComplete)
          if (fight.defeated) return finishDefeat()
          continue
        }

        // Flurry of Blows every 3rd interval
        if (!casting && fight.signature.id === 'flurryOfBlows' && shouldFlurry(fight.playerIntervalCount)) {
          const sides = flurryDieSides(classTier())
          const flurry = resolvePlayerAttack({
            fight,
            monster,
            skills,
            equipment,
            inventory,
            activeClassId: input.activeClassId,
            classXp,
            rng: input.rng,
            trace,
            labelPrefix: 'Flurry: ',
            unarmedOverride: { dice: `1d${sides}`, damageType: 'bludgeoning', mastery: null },
          })
          inventory = flurry.inventory
          classXp = flurry.classXp
          skills = flurry.skills
          if (flurry.stopped) {
            flushGold()
            return { fight: null, skills, inventory, gold, classXp, stop: true, lastLog: fight.log, kills: fight.kills, defeated: fight.defeated }
          }
          if (flurry.killed) {
            const killed = onKill({
              fight,
              monster,
              inventory,
              equipment,
              classXp,
              skills,
              rng: input.rng,
              trace,
              modifiers,
              chaMod: mods().CHA,
              classTier: classTier(),
              activeClassId: input.activeClassId,
            casting,
            })
            inventory = killed.inventory
            classXp = killed.classXp
            skills = killed.skills
            if (killed.monster) monster = killed.monster
            flushGold()
            if (killed.stop) return finishStop(killed.questStepComplete)
            if (fight.defeated) return finishDefeat()
            continue
          }
        }
      }
    }

    if (monsterReady && fight.phase === 'fight' && fight.monsterHp > 0) {
      fight.monsterProgressMs = 0
      const playerAc = playerArmorClass(fight, equipment, mods().DEX)
      const disadvSources: Array<'advantage' | 'disadvantage'> = []
      if (fight.monsterNextDisadvantage) disadvSources.push('disadvantage')
      if (fight.concentration === 'blur') disadvSources.push('disadvantage')
      const mode = resolveRollMode(disadvSources)
      fight.monsterNextDisadvantage = false

      for (const attack of monster.attacks) {
        const natural = rollD20(input.rng, mode)
        const total = natural + attack.toHit
        const autoMiss = natural === 1
        const crit = natural === 20
        const hit = !autoMiss && (crit || total >= playerAc)
        let line = `${monster.name} ${attack.name}: to hit ${total} - ${hit ? 'hits' : 'misses'}.`
        if (hit) {
          const parts = rollDamageParts(attack.damage, input.rng, crit)
          const dealt = parts.total
          line += ` ${dealt} ${attack.damageType}.`
          pushLog(fight, line, trace)
          const result = applyPlayerDamage({
            fight,
            amount: dealt,
            damageType: attack.damageType,
            skills,
            activeClassId: input.activeClassId,
            classXp,
            rng: input.rng,
            trace,
            modifiers,
          })
          skills = result.skills
          if (result.defeated) return finishDefeat()
        } else {
          pushLog(fight, line, trace)
        }
      }
    }
  }

  flushGold()
  if (fight.defeated || fight.outOfAmmo) {
    return {
      fight: null,
      skills,
      inventory,
      gold,
      classXp,
      stop: true,
      lastLog: fight.log,
      kills: fight.kills,
      defeated: fight.defeated,
      leftDungeonOrQuest: fight.dungeonId != null || fight.questId != null,
    }
  }
  return {
    fight,
    skills,
    inventory,
    gold,
    classXp,
    stop: false,
    lastLog: fight.log,
    kills: fight.kills,
    defeated: fight.defeated,
  }
}

export function difficultyHint(input: {
  playerToHitBonus: number
  monsterAc: number
  playerHp: number
  monsterAvgDamagePerInterval: number
}): 'Easy' | 'Even' | 'Hard' {
  const hitChance = Math.min(0.95, Math.max(0.05, (21 - (input.monsterAc - input.playerToHitBonus)) / 20))
  const avg = Math.max(0, input.monsterAvgDamagePerInterval)
  if (hitChance >= 0.65 && input.playerHp >= 4 * avg) return 'Easy'
  if (hitChance < 0.4 || 3 * avg >= input.playerHp) return 'Hard'
  return 'Even'
}

export function averageDamage(notation: string): number {
  const compact = notation.replace(/\s+/g, '')
  if (/^\d+$/.test(compact)) return Number(compact)
  let total = 0
  for (const match of compact.matchAll(/([+-]?)(\d+)d(\d+)|([+-])(\d+)/g)) {
    if (match[2]) {
      const sign = match[1] === '-' ? -1 : 1
      const count = Number(match[2])
      const sides = Number(match[3])
      total += sign * count * ((sides + 1) / 2)
    } else {
      total += (match[4] === '-' ? -1 : 1) * Number(match[5])
    }
  }
  return total
}

export function playerToHitBonus(
  skills: Record<SkillId, SkillProgress>,
  equipment: Equipment,
  classXp: number,
): number {
  const mods = abilityModMap(skills)
  const weapon = playerWeapon(equipment)
  const { mod } = attackAbilityMod(weapon, mods)
  return mod + proficiency(tier(levelForXp(classXp))) + playerMagicBonus(equipment)
}

/** Exported for tests: nick check uses 1d10, proc on 1–2. */
export function nickProc(rng: Rng): boolean {
  return 1 + Math.floor(rng() * 10) <= 2
}
