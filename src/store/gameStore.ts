import { create } from 'zustand'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import { modifiersFor, type ClassId, type ClericFocus } from '../data/classes'
import { getDungeon } from '../data/dungeons'
import type { ItemId } from '../data/items'
import { getMonster, type BiomeId } from '../data/monsters'
import { getQuest } from '../data/quests'
import { isSpellId, type SpellId } from '../data/spells'
import { buyItem as buyShopItem } from '../data/shop'
import { advance, type GameEvent, type OfflineReport, type SkillAction } from '../engine/advance'
import { beginDungeonFight, createFight } from '../engine/combat'
import { SPELL_INTERVAL_SEC } from '../engine/config'
import { consumeEntryItem } from '../engine/dungeon'
import {
  chooseDialogue,
  currentStep,
  deliverQuestStep,
  tryQuestSkillCheck,
} from '../engine/quest'
import { effectiveCasterType, usesSpellLoop } from '../engine/spells'
import {
  applyLoadout,
  canEquip,
  emptyEquipment,
  equip,
  unequip,
  weaponIntervalBase,
  type EquipmentSlot,
} from '../engine/equipment'
import { getItem } from '../data/items'
import { sellItems } from '../engine/inventory'
import type { Rng } from '../engine/rng'
import {
  SAVE_KEY,
  SAVE_VERSION,
  createInitialSave,
  migrateSave,
  nextActiveClassId,
  normalizeSave,
  type SaveData,
} from './migrate'

const LOG_LIMIT = 40

interface GameStore extends SaveData {
  log: GameEvent[]
  offlineReport: OfflineReport | null
  /** Online ticks build combat log lines; offline catch-up skips them. */
  combatTrace: boolean
  /** Ephemeral: kills from hunts that ended since the last offline summary. */
  offlineKills: number
  /** Ephemeral: defeat since the last offline summary. */
  lastDefeat: boolean
  startActivity: (activity: Omit<SkillAction, 'kind' | 'progressMs'>) => void
  startHunt: (monsterId: string, biome: BiomeId, questId?: string) => void
  startDungeon: (dungeonId: string, questId?: string) => void
  stopActivity: () => void
  applyElapsed: (elapsedMs: number, lastTick: number) => void
  dismissOffline: () => void
  saveGame: () => void
  sellItem: (itemId: ItemId) => void
  buyItem: (itemId: ItemId) => void
  equipItem: (itemId: ItemId) => void
  unequipSlot: (slot: EquipmentSlot) => void
  saveEquipmentSet: (name: string) => void
  loadEquipmentSet: (name: string) => void
  deleteEquipmentSet: (name: string) => void
  setActiveClass: (classId: ClassId) => void
  setClericFocus: (focus: ClericFocus) => void
  setCombatTrace: (trace: boolean) => void
  clearOfflineCombatFlags: () => void
  setSpellSlot: (classId: ClassId, slotIndex: number, spellId: SpellId | null) => void
  chooseQuestChoice: (questId: string, choiceId: string) => string
  tryQuestCheck: (questId: string) => string
  deliverQuest: (questId: string) => string
  startQuestCombat: (questId: string) => void
  startQuestDungeon: (questId: string) => void
  questMessage: string | null
}

const liveRng: Rng = () => Math.random()

let pending: { name: string; raw: string } | null = null
let writesEnabled = false

export function enableSaveWrites() {
  writesEnabled = true
}

export function flushSave() {
  if (!writesEnabled || !pending) return
  localStorage.setItem(pending.name, pending.raw)
}

const storage: PersistStorage<SaveData> = {
  getItem: (name) => {
    const raw = localStorage.getItem(name)
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      // JSON boundary. migrateSave checks the shape. Old saves have no envelope.
      if (isRecord(parsed) && 'state' in parsed && typeof parsed.version === 'number') {
        return { state: parsed.state as SaveData, version: parsed.version }
      }
      return { state: parsed as SaveData, version: 0 }
    } catch {
      return null
    }
  },
  setItem: (name, value: StorageValue<SaveData>) => {
    // Ticks rewrite state ~10 times a second. Flush writes on the autosave interval, on leave, and on Save.
    pending = { name, raw: JSON.stringify(value) }
  },
  removeItem: (name) => {
    localStorage.removeItem(name)
  },
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      ...createInitialSave(),
      log: [],
      offlineReport: null,
      combatTrace: true,
      offlineKills: 0,
      lastDefeat: false,
      questMessage: null,
      startActivity: (activity) =>
        set({
          activeAction: { kind: 'skill', ...activity, progressMs: 0 },
          combat: null,
          isInDungeonOrQuest: false,
          log: [],
        }),
      startHunt: (monsterId, biome, questId) =>
        set((state) => {
          if (!state.activeClassId) return state
          const monster = getMonster(monsterId)
          if (!monster) return state
          const fight = createFight({
            monsterId,
            biome,
            skills: state.skills,
            equipment: state.equipment,
            activeClassId: state.activeClassId,
            classXp: state.classes[state.activeClassId].xp,
            rng: liveRng,
            trace: true,
            spellLoadout: state.spellLoadouts[state.activeClassId],
          })
          if (!fight) return state
          if (questId) fight.questId = questId
          const weapon = state.equipment.mainHand ? getItem(state.equipment.mainHand)?.gear?.weapon : undefined
          const baseSec = usesSpellLoop(state.activeClassId)
            ? SPELL_INTERVAL_SEC
            : weaponIntervalBase(weapon)
          return {
            combat: fight,
            isInDungeonOrQuest: Boolean(questId),
            activeAction: {
              kind: 'combat' as const,
              label: `Hunting ${monster.name}`,
              monsterId,
              biome,
              baseIntervalMs: baseSec * 1000,
              progressMs: 0,
              mode: 'hunt' as const,
              questId,
            },
            log: [],
          }
        }),
      startDungeon: (dungeonId, questId) =>
        set((state) => {
          if (!state.activeClassId) return state
          const dungeon = getDungeon(dungeonId)
          if (!dungeon) return state
          const entry = consumeEntryItem(state.inventory, dungeon)
          if (!entry.ok) return state
          const fight = beginDungeonFight({
            dungeonId,
            skills: state.skills,
            equipment: state.equipment,
            activeClassId: state.activeClassId,
            classXp: state.classes[state.activeClassId].xp,
            rng: liveRng,
            trace: true,
            spellLoadout: state.spellLoadouts[state.activeClassId],
            questId: questId ?? null,
          })
          if (!fight) return state
          const weapon = state.equipment.mainHand ? getItem(state.equipment.mainHand)?.gear?.weapon : undefined
          const baseSec = usesSpellLoop(state.activeClassId)
            ? SPELL_INTERVAL_SEC
            : weaponIntervalBase(weapon)
          const monster = getMonster(fight.monsterId)
          return {
            inventory: entry.inventory,
            combat: fight,
            isInDungeonOrQuest: true,
            activeAction: {
              kind: 'combat' as const,
              label: `Dungeon · ${monster?.name ?? dungeon.name}`,
              monsterId: fight.monsterId,
              biome: dungeon.biome,
              baseIntervalMs: baseSec * 1000,
              progressMs: 0,
              mode: 'dungeon' as const,
              dungeonId,
              questId,
            },
            log: [],
          }
        }),
      stopActivity: () => set({ activeAction: null, combat: null, isInDungeonOrQuest: false }),
      setCombatTrace: (trace) => set({ combatTrace: trace }),
      clearOfflineCombatFlags: () => set({ offlineKills: 0, lastDefeat: false }),
      applyElapsed: (elapsedMs, lastTick) =>
        set((state) => {
          if (!(elapsedMs > 0)) return { lastTick }
          const killsBefore = state.combat?.kills ?? 0
          const result = advance(
            {
              skills: state.skills,
              inventory: state.inventory,
              gold: state.gold,
              activeAction: state.activeAction,
              equipment: state.equipment,
              classes: state.classes,
              activeClassId: state.activeClassId,
              combat: state.combat,
              questProgress: state.questProgress,
              isInDungeonOrQuest: state.isInDungeonOrQuest,
            },
            elapsedMs,
            liveRng,
            modifiersFor(state.activeClassId, state.clericFocus),
            { trace: state.combatTrace },
          )
          const killsAfter = result.state.combat?.kills ?? result.state.endedHuntKills ?? killsBefore
          const gainedKills = Math.max(0, killsAfter - killsBefore)
          const tracking = !state.combatTrace
          return {
            skills: result.state.skills,
            inventory: result.state.inventory,
            gold: result.state.gold,
            activeAction: result.state.activeAction,
            classes: result.state.classes ?? state.classes,
            combat: result.state.combat ?? null,
            questProgress: result.state.questProgress ?? state.questProgress,
            isInDungeonOrQuest:
              result.state.isInDungeonOrQuest !== undefined
                ? result.state.isInDungeonOrQuest
                : state.isInDungeonOrQuest,
            log: [...state.log, ...result.log].slice(-LOG_LIMIT),
            offlineKills: tracking ? state.offlineKills + gainedKills : state.offlineKills,
            lastDefeat: tracking ? state.lastDefeat || Boolean(result.state.lastDefeat) : state.lastDefeat,
            lastTick,
          }
        }),
      dismissOffline: () => set({ offlineReport: null }),
      saveGame: () => {
        set({ lastSaved: new Date().toISOString() })
        flushSave()
      },
      sellItem: (itemId) => set((state) => sellItems(state.inventory, state.gold, itemId)),
      buyItem: (itemId) => set((state) => buyShopItem(state.inventory, state.gold, itemId)),
      equipItem: (itemId) =>
        set((state) => {
          if (state.isInDungeonOrQuest || !canEquip(state.equipment, itemId)) return state
          const next = equip(state.equipment, state.inventory, itemId)
          if (!next) return state
          return { equipment: next.equipment, inventory: next.inventory }
        }),
      unequipSlot: (slot) =>
        set((state) => {
          if (state.isInDungeonOrQuest) return state
          const next = unequip(state.equipment, state.inventory, slot)
          return { equipment: next.equipment, inventory: next.inventory }
        }),
      saveEquipmentSet: (name) =>
        set((state) => {
          const trimmed = name.trim()
          if (!trimmed) return state
          const slots = { ...state.equipment }
          const rest = state.equipmentSets.filter((entry) => entry.name !== trimmed)
          return { equipmentSets: [...rest, { name: trimmed, slots }] }
        }),
      loadEquipmentSet: (name) =>
        set((state) => {
          if (state.isInDungeonOrQuest) return state
          const found = state.equipmentSets.find((entry) => entry.name === name)
          if (!found) return state
          const next = applyLoadout(state.equipment, state.inventory, found.slots)
          return { equipment: next.equipment, inventory: next.inventory }
        }),
      deleteEquipmentSet: (name) =>
        set((state) => ({
          equipmentSets: state.equipmentSets.filter((entry) => entry.name !== name),
        })),
      setActiveClass: (classId) =>
        set((state) => {
          const next = nextActiveClassId(state.isInDungeonOrQuest, classId)
          if (!next) return state
          return { activeClassId: next }
        }),
      setClericFocus: (focus) => set({ clericFocus: focus === 'STR' ? 'STR' : 'INT' }),
      setSpellSlot: (classId, slotIndex, spellId) =>
        set((state) => {
          if (spellId != null && !isSpellId(spellId)) return state
          const casterType = effectiveCasterType(classId)
          if (casterType == null) return state
          const current = state.spellLoadouts[classId] ?? { slots: [] }
          const slots = [...current.slots]
          while (slots.length <= slotIndex) slots.push(null)
          slots[slotIndex] = spellId
          return {
            spellLoadouts: {
              ...state.spellLoadouts,
              [classId]: { slots },
            },
          }
        }),
      chooseQuestChoice: (questId, choiceId) => {
        let line = ''
        set((state) => {
          const result = chooseDialogue(questId, choiceId, state.questProgress, state.skills, liveRng)
          line = result.line
          return { questProgress: result.progress, questMessage: result.line }
        })
        return line
      },
      tryQuestCheck: (questId) => {
        let line = ''
        set((state) => {
          const result = tryQuestSkillCheck(questId, state.questProgress, state.skills, liveRng)
          line = result.line
          return { questProgress: result.progress, questMessage: result.line }
        })
        return line
      },
      deliverQuest: (questId) => {
        let line = ''
        set((state) => {
          const result = deliverQuestStep(questId, state.questProgress, state.inventory)
          line = result.line
          return {
            questProgress: result.progress,
            inventory: result.inventory,
            questMessage: result.line,
          }
        })
        return line
      },
      startQuestCombat: (questId) =>
        set((state) => {
          const quest = getQuest(questId)
          const step = quest ? currentStep(quest, state.questProgress) : null
          if (!step || step.type !== 'combat' || !state.activeClassId) return state
          const monster = getMonster(step.monsterId)
          if (!monster) return state
          const fight = createFight({
            monsterId: step.monsterId,
            biome: step.biome,
            skills: state.skills,
            equipment: state.equipment,
            activeClassId: state.activeClassId,
            classXp: state.classes[state.activeClassId].xp,
            rng: liveRng,
            trace: true,
            spellLoadout: state.spellLoadouts[state.activeClassId],
          })
          if (!fight) return state
          fight.questId = questId
          const weapon = state.equipment.mainHand ? getItem(state.equipment.mainHand)?.gear?.weapon : undefined
          const baseSec = usesSpellLoop(state.activeClassId)
            ? SPELL_INTERVAL_SEC
            : weaponIntervalBase(weapon)
          return {
            combat: fight,
            isInDungeonOrQuest: true,
            activeAction: {
              kind: 'combat' as const,
              label: `Quest · ${monster.name}`,
              monsterId: step.monsterId,
              biome: step.biome,
              baseIntervalMs: baseSec * 1000,
              progressMs: 0,
              mode: 'hunt' as const,
              questId,
            },
            log: [],
            questMessage: null,
          }
        }),
      startQuestDungeon: (questId) =>
        set((state) => {
          const quest = getQuest(questId)
          const step = quest ? currentStep(quest, state.questProgress) : null
          if (!step || step.type !== 'dungeon') return state
          // Reuse startDungeon path via a nested call pattern — inline the same body.
          const dungeon = getDungeon(step.dungeonId)
          if (!dungeon || !state.activeClassId) return state
          const entry = consumeEntryItem(state.inventory, dungeon)
          if (!entry.ok) return { ...state, questMessage: 'Missing dungeon entry item.' }
          const fight = beginDungeonFight({
            dungeonId: step.dungeonId,
            skills: state.skills,
            equipment: state.equipment,
            activeClassId: state.activeClassId,
            classXp: state.classes[state.activeClassId].xp,
            rng: liveRng,
            trace: true,
            spellLoadout: state.spellLoadouts[state.activeClassId],
            questId,
          })
          if (!fight) return state
          const weapon = state.equipment.mainHand ? getItem(state.equipment.mainHand)?.gear?.weapon : undefined
          const baseSec = usesSpellLoop(state.activeClassId)
            ? SPELL_INTERVAL_SEC
            : weaponIntervalBase(weapon)
          const monster = getMonster(fight.monsterId)
          return {
            inventory: entry.inventory,
            combat: fight,
            isInDungeonOrQuest: true,
            activeAction: {
              kind: 'combat' as const,
              label: `Quest dungeon · ${monster?.name ?? dungeon.name}`,
              monsterId: fight.monsterId,
              biome: dungeon.biome,
              baseIntervalMs: baseSec * 1000,
              progressMs: 0,
              mode: 'dungeon' as const,
              dungeonId: step.dungeonId,
              questId,
            },
            log: [],
            questMessage: null,
          }
        }),
    }),
    {
      name: SAVE_KEY,
      version: SAVE_VERSION,
      storage,
      partialize: (state) => ({
        characterName: state.characterName,
        skills: state.skills,
        inventory: state.inventory,
        gold: state.gold,
        lastSaved: state.lastSaved,
        lastTick: state.lastTick,
        activeAction: state.activeAction,
        activeClassId: state.activeClassId,
        classes: state.classes,
        clericFocus: state.clericFocus,
        isInDungeonOrQuest: state.isInDungeonOrQuest,
        equipment: state.equipment ?? emptyEquipment(),
        equipmentSets: state.equipmentSets ?? [],
        combat: state.combat ?? null,
        spellLoadouts: state.spellLoadouts,
        questProgress: state.questProgress,
      }),
      migrate: migrateSave,
      merge: (persistedState, currentState) => {
        if (persistedState == null) return currentState
        return { ...currentState, ...normalizeSave(persistedState) }
      },
    },
  ),
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
