import { getClass, type ClassId } from '../data/classes'
import { getItem, type DamageType, type WeaponMastery } from '../data/items'
import { getMonster, type BiomeId, type CreatureSize, type MonsterDef } from '../data/monsters'
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
  RESPAWN_MS,
  SLOW_INTERVAL_FACTOR,
} from './config'
import { applyDamageModifiers } from './damage'
import { resolveRollMode, roll, rollD20, rollDamageParts, type RollMode } from './dice'
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
  tryWildShape,
  type SignatureRuntime,
} from './signatures'
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
}

export interface CombatAction {
  kind: 'combat'
  label: string
  monsterId: string
  biome: BiomeId
  baseIntervalMs: number
  progressMs: number
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
): number {
  const weapon = playerWeapon(equipment)
  const baseSec = weaponIntervalBase(weapon)
  const mods = abilityModMap(skills)
  const scores = abilityScoreMap(skills)
  const base = intervalMs(baseSec * 1000, mods.DEX, 0, true)
  return base * heavyArmorIntervalMultiplier(equipment, scores.STR)
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
}): CombatFight | null {
  const monster = getMonster(input.monsterId)
  if (!monster) return null
  const cls = getClass(input.activeClassId)
  const mods = abilityModMap(input.skills)
  const classLevel = levelForXp(input.classXp)
  const classTier = tier(classLevel)
  const playerMax = maxHp(cls.hitDie, classTier, mods.CON)
  const playerInterval = computePlayerIntervalMs(input.skills, input.equipment)
  const signature = emptySignatureRuntime(cls.signatureAbility.id)
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

function longRestAbilities(fight: CombatFight, classTier: number, chaMod: number) {
  const hooks = getSignatureHooks(fight.signature.id)
  const runtime = emptySignatureRuntime(fight.signature.id)
  fight.signature = runtime
  // Re-init via onFightStart
  hooks.onFightStart?.({
    runtime,
    tier: classTier,
    abilityMod: (abbr) => (abbr === 'CHA' ? chaMod : 0),
    rng: () => 0,
    trace: false,
    log: () => undefined,
  })
  if (runtime.id === 'huntersMark') {
    const monster = getMonster(fight.monsterId)
    runtime.markedType = monster?.creatureType ?? null
  }
  // Bardic uses need real CHA; re-set after stub init
  if (runtime.id === 'bardicInspiration') {
    runtime.bardicUses = Math.max(1, chaMod)
  }
  if (runtime.id === 'rage') {
    runtime.rageUses = 2 + Math.floor((classTier - 1) / 4)
  }
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
  }
  hooks.onHit?.(hitCtx)

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
    fight.playerHp = Math.max(0, fight.playerHp - taken)
    const vitalityXp = applyXpModifiers(taken, 'CON', input.modifiers)
    skills = {
      ...skills,
      vitality: { xp: addXp(skills.vitality.xp, vitalityXp) },
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
}): { inventory: Inventory; classXp: number; skills: Record<SkillId, SkillProgress> } {
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
  fight.cleaveOverflow = 0
  fight.slowActive = false
  fight.pushDelayMs = 0
  fight.nextAttackAdvantage = false
  fight.monsterNextDisadvantage = false

  pushLog(fight, `${monster.name} defeated. +${monster.xp} class XP.`, trace)

  // Long rest during respawn — attack intervals stay frozen until the next spawn.
  fight.phase = 'rest'
  fight.restProgressMs = 0
  fight.playerProgressMs = 0
  fight.monsterProgressMs = 0
  fight.pushDelayMs = 0
  fight.playerHp = fight.playerMaxHp
  longRestAbilities(fight, input.classTier, input.chaMod)

  return { inventory, classXp, skills: input.skills }
}

function respawnMonster(fight: CombatFight, monster: MonsterDef, skills: Record<SkillId, SkillProgress>, equipment: Equipment) {
  fight.phase = 'fight'
  fight.restProgressMs = 0
  fight.monsterHp = monster.hp
  fight.monsterMaxHp = monster.hp
  fight.openingDone = false
  fight.playerIntervalMs = computePlayerIntervalMs(skills, equipment)
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
}

export function advanceCombat(input: CombatAdvanceInput): CombatAdvanceResult {
  const monster = getMonster(input.fight.monsterId)
  if (!monster) {
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

  const fight = { ...input.fight, log: [...input.fight.log], lootGained: [...input.fight.lootGained], signature: { ...input.fight.signature } }
  let skills = input.skills
  let inventory = input.inventory
  let gold = input.gold
  let classXp = input.classXp
  let remaining = input.elapsedMs
  const modifiers = input.modifiers ?? {}
  const equipment = input.equipment ?? emptyEquipment()
  const mods = () => abilityModMap(skills)
  const classTier = () => tier(levelForXp(classXp))
  const trace = input.trace

  const finishDefeat = (): CombatAdvanceResult => {
    inventory = recoverAmmo(inventory, equipment, fight.ammoSpent)
    fight.ammoSpent = 0
    return {
      fight: null,
      skills,
      inventory,
      gold: gold + fight.goldGained,
      classXp,
      stop: true,
      lastLog: fight.log,
      kills: fight.kills,
      defeated: fight.defeated,
    }
  }

  // Apply pending gold from prior kills stored on fight into gold only when hunt ends;
  // during hunt goldGained accumulates and is flushed on stop/defeat/out-of-ammo.
  // Actually plan: loot goes to inventory immediately; gold should too for inventory consistency.
  // Flush gold as we earn it:
  const flushGold = () => {
    if (fight.goldGained > 0) {
      gold += fight.goldGained
      fight.goldGained = 0
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
      respawnMonster(fight, monster, skills, equipment)
      pushLog(fight, `${monster.name} appears.`, trace)
      continue
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
        })
        inventory = killed.inventory
        classXp = killed.classXp
        skills = killed.skills
        flushGold()
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
          })
          inventory = killed.inventory
          classXp = killed.classXp
          skills = killed.skills
          flushGold()
          continue
        }
      }
    }

    fight.playerIntervalMs = computePlayerIntervalMs(skills, equipment)
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
        const attack = resolvePlayerAttack({
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
          })
          inventory = killed.inventory
          classXp = killed.classXp
          skills = killed.skills
          flushGold()
          continue
        }

        // Flurry of Blows every 3rd interval
        if (fight.signature.id === 'flurryOfBlows' && shouldFlurry(fight.playerIntervalCount)) {
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
            })
            inventory = killed.inventory
            classXp = killed.classXp
            skills = killed.skills
            flushGold()
            continue
          }
        }
      }
    }

    if (monsterReady && fight.phase === 'fight' && fight.monsterHp > 0) {
      fight.monsterProgressMs = 0
      const playerAc = armorClass(equipment, mods().DEX)
      const mode = resolveRollMode(fight.monsterNextDisadvantage ? ['disadvantage'] : [])
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
    return { fight: null, skills, inventory, gold, classXp, stop: true, lastLog: fight.log, kills: fight.kills, defeated: fight.defeated }
  }
  return { fight, skills, inventory, gold, classXp, stop: false, lastLog: fight.log, kills: fight.kills, defeated: fight.defeated }
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
