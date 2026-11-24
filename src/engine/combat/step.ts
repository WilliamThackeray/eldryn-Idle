import { getMonster } from '../../data/monsters'
import { QUICKENED_INTERVAL_FACTOR } from '../config'
import { emptyEquipment } from '../equipment'
import { bestiaryBonus, tomeXpPct } from '../history'
import { damageVsTypePct } from '../social'
import { echoXpFraction } from '../multiclass'
import { flurryDieSides, hasSignature, shouldFlurry, tryQuicken } from '../signatures'
import { usesSpellLoop } from '../spells'
import { levelForXp, tier } from '../xp'
import { resolvePlayerAttack } from './attack'
import { tickRest } from './restTick'
import { onKill } from './dungeonRun'
import { tryAutoEat } from './food'
import { resolveMonsterAttacks } from './monsterTurn'
import { runOpening } from './opening'
import { resolveSpellCast } from './spellcasting'
import { resolveSummonAttack, summonOf } from './summons'
import {
  abilityModMap,
  type CombatAdvanceInput,
  type CombatAdvanceResult,
  computeMonsterIntervalMs,
  computePlayerIntervalMs,
  pushLog,
} from './state'
import { recoverAmmo } from './attack'

export type { CombatAdvanceInput, CombatAdvanceResult } from './state'

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
    killsThisTick: [] as string[],
    dungeonClearedThisTick: null as string | null,
  }
  let skills = input.skills
  let inventory = input.inventory
  const vitalityXpExtra = tomeXpPct(input.tomes, 'vitality') + echoXpFraction(input.echoes ?? 0)
  const monsterBestiary = () =>
    monster ? bestiaryBonus(input.bestiaries, monster.creatureType) : 0
  const monsterIntel = () =>
    monster ? damageVsTypePct(input.activeBuffs, monster.creatureType) : 0
  let gold = input.gold
  let favor = input.favor ?? 0
  let bounty = input.bounty ?? null
  let classXp = input.classXp
  let secondaryClassXp = input.secondaryClassXp ?? 0
  const echoes = input.echoes ?? 0
  const secondaryActive = input.hasSecondary === true
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

  const withSocial = <T extends CombatAdvanceResult>(result: T): T => ({
    ...result,
    favor,
    bounty,
    secondaryClassXp,
    killsThisTick: fight.killsThisTick,
    dungeonCleared: fight.dungeonClearedThisTick,
  })

  const finishDefeat = (): CombatAdvanceResult => {
    inventory = recoverAmmo(inventory, equipment, fight.ammoSpent)
    fight.ammoSpent = 0
    flushGold()
    return withSocial({
      fight: null,
      skills,
      inventory,
      gold,
      classXp,
      secondaryClassXp,
      stop: true,
      lastLog: fight.log,
      kills: fight.kills,
      defeated: fight.defeated,
      leftDungeonOrQuest: fight.dungeonId != null || fight.questId != null,
      questStepComplete: null,
    })
  }

  const finishStop = (questId: string | null = null): CombatAdvanceResult => {
    inventory = recoverAmmo(inventory, equipment, fight.ammoSpent)
    fight.ammoSpent = 0
    flushGold()
    return withSocial({
      fight: null,
      skills,
      inventory,
      gold,
      classXp,
      secondaryClassXp,
      stop: true,
      lastLog: fight.log,
      kills: fight.kills,
      defeated: false,
      leftDungeonOrQuest: true,
      questStepComplete: questId,
    })
  }

  while (remaining > 0 && !fight.defeated && !fight.outOfAmmo) {
    if (fight.phase === 'rest') {
      const rested = tickRest({
        fight,
        remaining,
        monster,
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
        modifiers,
        stopWhenOutOfFood: input.stopWhenOutOfFood,
        bounty,
        favor,
        activeBuffs: input.activeBuffs,
      })
      remaining = rested.remaining
      monster = rested.monster
      inventory = rested.inventory
      classXp = rested.classXp
      skills = rested.skills
      bounty = rested.bounty
      favor = rested.favor
      if (rested.flush) flushGold()
      if (rested.action === 'break') break
      if (rested.action === 'stop') return finishStop(rested.questStepComplete)
      if (rested.action === 'defeat') return finishDefeat()
      continue
    }

    if (!monster) {
      return finishStop(null)
    }

    if (!fight.openingDone) {
      const opened = runOpening({
        fight,
        monster,
        skills,
        equipment,
        inventory,
        activeClassId: input.activeClassId,
        classXp,
        rng: input.rng,
        trace,
        modifiers,
        chaMod: mods().CHA,
        classTier: classTier(),
        casting,
        stopWhenOutOfFood: input.stopWhenOutOfFood,
        bestiaryBonus: monsterBestiary(),
        intelDamagePct: monsterIntel(),
        bounty,
        favor,
        activeBuffs: input.activeBuffs,
      })
      inventory = opened.inventory
      classXp = opened.classXp
      skills = opened.skills
      monster = opened.monster
      bounty = opened.bounty
      favor = opened.favor
      if (opened.action === 'ammo') {
        flushGold()
        return withSocial({
          fight: null,
          skills,
          inventory,
          gold,
          classXp,
          stop: true,
          lastLog: fight.log,
          kills: fight.kills,
          defeated: fight.defeated,
        })
      }
      if (opened.action === 'quest') {
        flushGold()
        return finishStop(opened.questStepComplete)
      }
      if (opened.action === 'defeat') {
        flushGold()
        return finishDefeat()
      }
      if (opened.action === 'loop') {
        flushGold()
        continue
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
    fight.summon1IntervalMs = summonOf(equipment, 'summon1')?.intervalMs ?? 0
    fight.summon2IntervalMs = summonOf(equipment, 'summon2')?.intervalMs ?? 0

    let playerReady = fight.playerProgressMs >= fight.playerIntervalMs - 1e-6
    let monsterReady = fight.pushDelayMs <= 0 && fight.monsterProgressMs >= fight.monsterIntervalMs - 1e-6
    let summon1Ready =
      fight.summon1IntervalMs > 0 && fight.summon1ProgressMs >= fight.summon1IntervalMs - 1e-6
    let summon2Ready =
      fight.summon2IntervalMs > 0 && fight.summon2ProgressMs >= fight.summon2IntervalMs - 1e-6

    if (!playerReady && !monsterReady && !summon1Ready && !summon2Ready) {
      if (remaining <= 0) break

      // Burn push delay first; the player timer still advances.
      if (fight.pushDelayMs > 0) {
        const burn = Math.min(fight.pushDelayMs, remaining)
        fight.pushDelayMs -= burn
        remaining -= burn
        fight.sessionMs += burn
        fight.playerProgressMs += burn
        if (fight.summon1IntervalMs > 0) fight.summon1ProgressMs += burn
        if (fight.summon2IntervalMs > 0) fight.summon2ProgressMs += burn
        playerReady = fight.playerProgressMs >= fight.playerIntervalMs - 1e-6
        monsterReady = fight.pushDelayMs <= 0 && fight.monsterProgressMs >= fight.monsterIntervalMs - 1e-6
        summon1Ready =
          fight.summon1IntervalMs > 0 && fight.summon1ProgressMs >= fight.summon1IntervalMs - 1e-6
        summon2Ready =
          fight.summon2IntervalMs > 0 && fight.summon2ProgressMs >= fight.summon2IntervalMs - 1e-6
        if (!playerReady && !monsterReady && !summon1Ready && !summon2Ready) continue
      } else {
        const playerNeed = Math.max(0, fight.playerIntervalMs - fight.playerProgressMs)
        const monsterNeed = Math.max(0, fight.monsterIntervalMs - fight.monsterProgressMs)
        const s1Need =
          fight.summon1IntervalMs > 0
            ? Math.max(0, fight.summon1IntervalMs - fight.summon1ProgressMs)
            : Infinity
        const s2Need =
          fight.summon2IntervalMs > 0
            ? Math.max(0, fight.summon2IntervalMs - fight.summon2ProgressMs)
            : Infinity
        const step = Math.min(playerNeed, monsterNeed, s1Need, s2Need, remaining)
        if (step <= 0 || !Number.isFinite(step)) break
        fight.playerProgressMs += step
        fight.monsterProgressMs += step
        if (fight.summon1IntervalMs > 0) fight.summon1ProgressMs += step
        if (fight.summon2IntervalMs > 0) fight.summon2ProgressMs += step
        remaining -= step
        fight.sessionMs += step
        playerReady = fight.playerProgressMs >= fight.playerIntervalMs - 1e-6
        monsterReady = fight.monsterProgressMs >= fight.monsterIntervalMs - 1e-6
        summon1Ready =
          fight.summon1IntervalMs > 0 && fight.summon1ProgressMs >= fight.summon1IntervalMs - 1e-6
        summon2Ready =
          fight.summon2IntervalMs > 0 && fight.summon2ProgressMs >= fight.summon2IntervalMs - 1e-6
      }
    }

    // Resolve player first when simultaneous
    if (playerReady) {
      fight.playerProgressMs = 0
      fight.playerIntervalCount += 1

      const eaten = tryAutoEat({
        fight,
        inventory,
        equipment,
        skills,
        modifiers,
        trace,
        xpExtra: vitalityXpExtra,
      })
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
              equipment,
              activeClassId: input.activeClassId,
              classXp,
              rng: input.rng,
              trace,
              bestiaryBonus: monsterBestiary(),
              intelDamagePct: monsterIntel(),
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
              bestiaryBonus: monsterBestiary(),
              intelDamagePct: monsterIntel(),
            })
        inventory = attack.inventory
        classXp = attack.classXp
        skills = attack.skills
        if (casting && hasSignature(fight.signature.id, fight.secondarySignatureId, 'metamagicPactMagic')) {
          tryQuicken(fight.signature)
        }
        if (attack.stopped) {
          flushGold()
          return withSocial({
            fight: null,
            skills,
            inventory,
            gold,
            classXp,
            stop: true,
            lastLog: fight.log,
            kills: fight.kills,
            defeated: fight.defeated,
          })
        }
        if (attack.killed) {
          const killed = onKill({
            fight,
            monster,
            inventory,
            equipment,
            classXp,
            secondaryClassXp,
            echoes,
            hasSecondary: secondaryActive,
            skills,
            rng: input.rng,
            trace,
            modifiers,
            chaMod: mods().CHA,
            classTier: classTier(),
            activeClassId: input.activeClassId,
            casting,
            stopWhenOutOfFood: input.stopWhenOutOfFood,
            bounty,
            favor,
            activeBuffs: input.activeBuffs,
          })
          inventory = killed.inventory
          classXp = killed.classXp
          secondaryClassXp = killed.secondaryClassXp
          skills = killed.skills
          bounty = killed.bounty
          favor = killed.favor
          if (killed.monster) monster = killed.monster
          flushGold()
          if (killed.stop) return finishStop(killed.questStepComplete)
          if (fight.defeated) return finishDefeat()
          continue
        }

        // Flurry of Blows every 3rd interval
        if (
          !casting &&
          hasSignature(fight.signature.id, fight.secondarySignatureId, 'flurryOfBlows') &&
          shouldFlurry(fight.playerIntervalCount)
        ) {
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
            bestiaryBonus: monsterBestiary(),
            intelDamagePct: monsterIntel(),
          })
          inventory = flurry.inventory
          classXp = flurry.classXp
          skills = flurry.skills
          if (flurry.stopped) {
            flushGold()
            return withSocial({
              fight: null,
              skills,
              inventory,
              gold,
              classXp,
              stop: true,
              lastLog: fight.log,
              kills: fight.kills,
              defeated: fight.defeated,
            })
          }
          if (flurry.killed) {
            const killed = onKill({
              fight,
              monster,
              inventory,
              equipment,
              classXp,
              secondaryClassXp,
              echoes,
              hasSecondary: secondaryActive,
              skills,
              rng: input.rng,
              trace,
              modifiers,
              chaMod: mods().CHA,
              classTier: classTier(),
              activeClassId: input.activeClassId,
              casting,
              stopWhenOutOfFood: input.stopWhenOutOfFood,
              bounty,
              favor,
              activeBuffs: input.activeBuffs,
            })
            inventory = killed.inventory
            classXp = killed.classXp
            secondaryClassXp = killed.secondaryClassXp
            skills = killed.skills
            bounty = killed.bounty
            favor = killed.favor
            if (killed.monster) monster = killed.monster
            flushGold()
            if (killed.stop) return finishStop(killed.questStepComplete)
            if (fight.defeated) return finishDefeat()
            continue
          }
        }
      }
    }
    const resolveSummonKill = (killed: boolean) => {
      if (!killed) return null
      return onKill({
        fight,
        monster,
        inventory,
        equipment,
        classXp,
        secondaryClassXp,
        echoes,
        hasSecondary: secondaryActive,
        skills,
        rng: input.rng,
        trace,
        modifiers,
        chaMod: mods().CHA,
        classTier: classTier(),
        activeClassId: input.activeClassId,
        casting,
        stopWhenOutOfFood: input.stopWhenOutOfFood,
        bounty,
        favor,
        activeBuffs: input.activeBuffs,
      })
    }

    if (summon1Ready && fight.phase === 'fight' && fight.monsterHp > 0) {
      fight.summon1ProgressMs = 0
      const swing = resolveSummonAttack({
        fight,
        monster,
        equipment,
        slot: 'summon1',
        rng: input.rng,
        trace,
      })
      if (swing.killed) {
        const killed = resolveSummonKill(true)
        if (killed) {
          inventory = killed.inventory
          classXp = killed.classXp
          secondaryClassXp = killed.secondaryClassXp
          skills = killed.skills
          bounty = killed.bounty
          favor = killed.favor
          if (killed.monster) monster = killed.monster
          flushGold()
          if (killed.stop) return finishStop(killed.questStepComplete)
          if (fight.defeated) return finishDefeat()
          continue
        }
      }
    }

    if (summon2Ready && fight.phase === 'fight' && fight.monsterHp > 0) {
      fight.summon2ProgressMs = 0
      const swing = resolveSummonAttack({
        fight,
        monster,
        equipment,
        slot: 'summon2',
        rng: input.rng,
        trace,
      })
      if (swing.killed) {
        const killed = resolveSummonKill(true)
        if (killed) {
          inventory = killed.inventory
          classXp = killed.classXp
          secondaryClassXp = killed.secondaryClassXp
          skills = killed.skills
          bounty = killed.bounty
          favor = killed.favor
          if (killed.monster) monster = killed.monster
          flushGold()
          if (killed.stop) return finishStop(killed.questStepComplete)
          if (fight.defeated) return finishDefeat()
          continue
        }
      }
    }

    if (monsterReady && fight.phase === 'fight' && fight.monsterHp > 0) {
      const turn = resolveMonsterAttacks({
        fight,
        monster,
        equipment,
        dexMod: mods().DEX,
        skills,
        activeClassId: input.activeClassId,
        classXp,
        rng: input.rng,
        trace,
        modifiers,
        xpExtra: vitalityXpExtra,
      })
      skills = turn.skills
      if (turn.defeated) return finishDefeat()
    }
  }

  flushGold()
  if (fight.defeated || fight.outOfAmmo) {
    return withSocial({
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
    })
  }
  return withSocial({
    fight,
    skills,
    inventory,
    gold,
    classXp,
    stop: false,
    lastLog: fight.log,
    kills: fight.kills,
    defeated: fight.defeated,
  })
}
