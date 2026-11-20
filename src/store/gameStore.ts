import { create } from 'zustand'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import { getClass, modifiersFor, type ClassId, type ClericFocus } from '../data/classes'
import { getDungeon } from '../data/dungeons'
import type { ItemId } from '../data/items'
import { getMonster, type BiomeId, type CreatureType } from '../data/monsters'
import { isSpellId, type SpellId } from '../data/spells'
import {
  buyGood as buyShopGood,
  buyUpgrade as buyShopUpgrade,
  shopDiscountFromUpgrades,
} from '../data/shop'
import { advance, type GameEvent, type OfflineReport, type SkillAction } from '../engine/advance'
import { beginDungeonFight, createFight } from '../engine/combat'
import { maybeRareSwap } from '../engine/combat/dungeonRun'
import { SPELL_INTERVAL_SEC } from '../engine/config'
import { consumeEntryItem } from '../engine/dungeon'
import { refreshIfDue, rerollBoard, turnInNotice } from '../engine/noticeBoard'
import {
  acceptQuest,
  resolvePendingCheck,
  rollCheck,
  turnInQuest,
} from '../engine/quest'
import { effectiveCasterType, usesSpellLoop } from '../engine/spells'
import { levelForXp } from '../engine/xp'
import {
  applyLoadout,
  applyStartingKit,
  canEquip,
  emptyEquipment,
  equip,
  unequip,
  weaponIntervalBase,
  type EquipmentSlot,
} from '../engine/equipment'
import { getItem } from '../data/items'
import { activePerks } from '../engine/abilities'
import {
  readBestiary as applyReadBestiary,
  readTome as applyReadTome,
  useNotes as applyUseNotes,
} from '../engine/history'
import { sellItems, type Inventory } from '../engine/inventory'
import {
  applyDisguiseKit,
  applyIntel,
  applyMenaceTrophy,
  applyRumor,
  applyTradeContract,
  sellPriceMultiplier,
  shopDiscountTotal,
  startBounty,
} from '../engine/social'
import {
  appendInventoryTab,
  moveItemToTab,
  placeIncoming,
  renameTab,
  reorderItem,
  type InventoryTab,
} from '../engine/inventoryTabs'
import type { Rng } from '../engine/rng'
import {
  SAVE_VERSION,
  createInitialSave,
  migrateSave,
  normalizeSave,
  type SaveData,
} from './migrate'
import {
  adoptLegacySave,
  bindSlot,
  currentSlot,
  resumableSlot,
  slotStorageKey,
  writeSlotIndex,
  type SlotId,
} from './slots'

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
  startHunt: (monsterId: string, biome: BiomeId) => void
  startDungeon: (dungeonId: string) => void
  stopActivity: () => void
  applyElapsed: (elapsedMs: number, lastTick: number) => void
  dismissOffline: () => void
  saveGame: () => void
  sellItem: (itemId: ItemId, quantity?: number) => void
  buyGood: (itemId: ItemId) => void
  buyUpgrade: (upgradeId: string) => void
  equipItem: (itemId: ItemId) => void
  unequipSlot: (slot: EquipmentSlot) => void
  saveEquipmentSet: (name: string) => void
  loadEquipmentSet: (name: string) => void
  deleteEquipmentSet: (name: string) => void
  renameInventoryTab: (tabId: string, name: string) => void
  moveInventoryItem: (itemId: ItemId, toTabId: string) => void
  reorderInventoryItem: (tabId: string, itemId: ItemId, beforeItemId: ItemId) => void
  beginCharacter: (input: { slot: SlotId; name: string; classId: ClassId; clericFocus: ClericFocus }) => void
  setCombatTrace: (trace: boolean) => void
  setStopWhenOutOfFood: (value: boolean) => void
  clearOfflineCombatFlags: () => void
  setSpellSlot: (classId: ClassId, slotIndex: number, spellId: SpellId | null) => void
  acceptQuest: (questId: string) => string
  turnInQuest: (questId: string) => string
  rollQuestCheck: (questId: string, approachId: string, prepOn: boolean) => string
  resolveQuestCheck: (questId: string, useInspiration: boolean) => string
  pinQuest: (questId: string | null) => void
  turnInNotice: (offerId: string) => void
  rerollNotice: () => void
  refreshNoticeBoard: (now?: number) => void
  questMessage: string | null
  readTome: (itemId: ItemId) => void
  readBestiary: (itemId: ItemId) => void
  useNotes: (itemId: ItemId) => void
  activateSocialItem: (itemId: ItemId, options?: { biome?: BiomeId; creatureType?: CreatureType }) => void
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

const browserStorage = typeof localStorage === 'undefined' ? null : localStorage
if (browserStorage) {
  adoptLegacySave(browserStorage)
  bindSlot(resumableSlot(browserStorage))
}

const storage: PersistStorage<SaveData> = {
  getItem: () => {
    const slot = currentSlot()
    if (!slot || !browserStorage) return null
    const raw = browserStorage.getItem(slotStorageKey(slot))
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
  setItem: (_name, value: StorageValue<SaveData>) => {
    const slot = currentSlot()
    if (!slot) return
    // Ticks rewrite state ~10 times a second. Flush writes on the autosave interval, on leave, and on Save.
    pending = { name: slotStorageKey(slot), raw: JSON.stringify(value) }
  },
  removeItem: () => {
    const slot = currentSlot()
    if (!slot || !browserStorage) return
    browserStorage.removeItem(slotStorageKey(slot))
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
      startHunt: (monsterId, biome) =>
        set((state) => {
          if (!state.classId) return state
          const swappedId = maybeRareSwap(monsterId, biome, state.activeBuffs, liveRng)
          const monster = getMonster(swappedId)
          if (!monster) return state
          const fight = createFight({
            monsterId: swappedId,
            biome,
            skills: state.skills,
            equipment: state.equipment,
            activeClassId: state.classId,
            classXp: state.classXp,
            rng: liveRng,
            trace: true,
            spellLoadout: state.spellLoadouts[state.classId],
            activeBuffs: state.activeBuffs,
          })
          if (!fight) return state
          const weapon = state.equipment.mainHand ? getItem(state.equipment.mainHand)?.gear?.weapon : undefined
          const baseSec = usesSpellLoop(state.classId)
            ? SPELL_INTERVAL_SEC
            : weaponIntervalBase(weapon)
          return {
            combat: fight,
            isInDungeonOrQuest: false,
            activeAction: {
              kind: 'combat' as const,
              label: `Hunting ${monster.name}`,
              monsterId: swappedId,
              biome,
              baseIntervalMs: baseSec * 1000,
              progressMs: 0,
              mode: 'hunt' as const,
            },
            log: [],
          }
        }),
      startDungeon: (dungeonId) =>
        set((state) => {
          if (!state.classId) return state
          const dungeon = getDungeon(dungeonId)
          if (!dungeon) return state
          const entry = consumeEntryItem(state.inventory, dungeon)
          if (!entry.ok) return state
          const fight = beginDungeonFight({
            dungeonId,
            skills: state.skills,
            equipment: state.equipment,
            activeClassId: state.classId,
            classXp: state.classXp,
            rng: liveRng,
            trace: true,
            spellLoadout: state.spellLoadouts[state.classId],
            questId: null,
            activeBuffs: state.activeBuffs,
          })
          if (!fight) return state
          const weapon = state.equipment.mainHand ? getItem(state.equipment.mainHand)?.gear?.weapon : undefined
          const baseSec = usesSpellLoop(state.classId)
            ? SPELL_INTERVAL_SEC
            : weaponIntervalBase(weapon)
          const monster = getMonster(fight.monsterId)
          return {
            ...withPlacedInventory(state, entry.inventory),
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
            },
            log: [],
          }
        }),
      stopActivity: () => set({ activeAction: null, combat: null, isInDungeonOrQuest: false }),
      setCombatTrace: (trace) => set({ combatTrace: trace }),
      setStopWhenOutOfFood: (value) => set({ stopWhenOutOfFood: value }),
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
              favor: state.favor,
              renown: state.renown,
              bounty: state.bounty,
              activeAction: state.activeAction,
              equipment: state.equipment,
              upgrades: state.upgrades,
              classId: state.classId,
              classXp: state.classXp,
              combat: state.combat,
              questProgress: state.questProgress,
              noticeBoard: state.noticeBoard,
              isInDungeonOrQuest: state.isInDungeonOrQuest,
              stopWhenOutOfFood: state.stopWhenOutOfFood,
              tomes: state.tomes,
              bestiaries: state.bestiaries,
              activeBuffs: state.activeBuffs,
            },
            elapsedMs,
            liveRng,
            modifiersFor(state.classId, state.clericFocus),
            { trace: state.combatTrace },
          )
          const killsAfter = result.state.combat?.kills ?? result.state.endedHuntKills ?? killsBefore
          const gainedKills = Math.max(0, killsAfter - killsBefore)
          const tracking = !state.combatTrace
          const noticeBoard = refreshIfDue(
            result.state.noticeBoard ?? state.noticeBoard,
            lastTick,
            liveRng,
            result.state.skills,
            result.state.questProgress ?? state.questProgress,
          )
          return {
            skills: result.state.skills,
            ...withPlacedInventory(state, result.state.inventory),
            gold: result.state.gold,
            favor: result.state.favor ?? state.favor,
            renown: result.state.renown ?? state.renown,
            bounty: result.state.bounty !== undefined ? result.state.bounty : state.bounty,
            activeAction: result.state.activeAction,
            classXp: result.state.classXp ?? state.classXp,
            combat: result.state.combat ?? null,
            questProgress: result.state.questProgress ?? state.questProgress,
            noticeBoard,
            isInDungeonOrQuest:
              result.state.isInDungeonOrQuest !== undefined
                ? result.state.isInDungeonOrQuest
                : state.isInDungeonOrQuest,
            activeBuffs: result.state.activeBuffs ?? state.activeBuffs,
            log: [...state.log, ...result.log].slice(-LOG_LIMIT),
            offlineKills: tracking ? state.offlineKills + gainedKills : state.offlineKills,
            lastDefeat: tracking ? state.lastDefeat || Boolean(result.state.lastDefeat) : state.lastDefeat,
            lastTick,
          }
        }),
      readTome: (itemId) =>
        set((state) => {
          const next = applyReadTome(state.inventory, state.tomes, itemId)
          if (!next) return state
          return { ...withPlacedInventory(state, next.inventory), tomes: { ...state.tomes, ...next.tomes } }
        }),
      readBestiary: (itemId) =>
        set((state) => {
          const next = applyReadBestiary(state.inventory, state.bestiaries, itemId)
          if (!next) return state
          return {
            ...withPlacedInventory(state, next.inventory),
            bestiaries: { ...state.bestiaries, ...next.bestiaries },
          }
        }),
      useNotes: (itemId) =>
        set((state) => {
          const next = applyUseNotes(state.inventory, state.activeBuffs, itemId)
          if (!next) return state
          return { ...withPlacedInventory(state, next.inventory), activeBuffs: next.activeBuffs }
        }),
      activateSocialItem: (itemId, options) =>
        set((state) => {
          if (itemId === 'trade-contract') {
            const next = applyTradeContract(state.inventory, state.activeBuffs)
            if (!next) return state
            return { ...withPlacedInventory(state, next.inventory), activeBuffs: next.activeBuffs }
          }
          if (itemId === 'disguise-kit') {
            const next = applyDisguiseKit(state.inventory, state.activeBuffs)
            if (!next) return state
            return { ...withPlacedInventory(state, next.inventory), activeBuffs: next.activeBuffs }
          }
          if (itemId === 'menace-trophy') {
            const next = applyMenaceTrophy(state.inventory, state.activeBuffs)
            if (!next) return state
            return { ...withPlacedInventory(state, next.inventory), activeBuffs: next.activeBuffs }
          }
          if (itemId === 'rumor') {
            if (!options?.biome) return state
            const next = applyRumor(state.inventory, state.activeBuffs, options.biome)
            if (!next) return state
            return { ...withPlacedInventory(state, next.inventory), activeBuffs: next.activeBuffs }
          }
          if (itemId === 'intel') {
            if (!options?.creatureType) return state
            const next = applyIntel(state.inventory, state.activeBuffs, options.creatureType)
            if (!next) return state
            return { ...withPlacedInventory(state, next.inventory), activeBuffs: next.activeBuffs }
          }
          if (itemId === 'bounty-contract') {
            const next = startBounty(state.inventory, state.bounty, liveRng)
            if (!next) return state
            return { ...withPlacedInventory(state, next.inventory), bounty: next.bounty }
          }
          return state
        }),
      dismissOffline: () => set({ offlineReport: null }),
      saveGame: () => {
        set({ lastSaved: new Date().toISOString() })
        flushSave()
      },
      sellItem: (itemId, quantity) =>
        set((state) => {
          const sold = sellItems(
            state.inventory,
            state.gold,
            itemId,
            quantity,
            sellPriceMultiplier(activePerks(state), state.activeBuffs),
          )
          return { ...withPlacedInventory(state, sold.inventory), gold: sold.gold }
        }),
      buyGood: (itemId) =>
        set((state) => {
          const discount = shopDiscountTotal(activePerks(state), state.upgrades, shopDiscountFromUpgrades)
          const bought = buyShopGood(state.inventory, state.gold, itemId, discount)
          return { ...withPlacedInventory(state, bought.inventory), gold: bought.gold }
        }),
      buyUpgrade: (upgradeId) =>
        set((state) => {
          const before = state.upgrades[upgradeId]
          const discount = shopDiscountTotal(activePerks(state), state.upgrades, shopDiscountFromUpgrades)
          const bought = buyShopUpgrade(
            {
              gold: state.gold,
              favor: state.favor,
              inventory: state.inventory,
              upgrades: state.upgrades,
              skills: state.skills,
            },
            upgradeId,
            discount,
          )
          if (
            bought.upgrades === state.upgrades &&
            bought.gold === state.gold &&
            bought.favor === state.favor
          ) {
            return state
          }
          let inventoryTabs = state.inventoryTabs
          if (
            upgradeId === 'inventory-tabs' &&
            bought.upgrades[upgradeId] !== before &&
            bought.upgrades[upgradeId] != null
          ) {
            inventoryTabs = appendInventoryTab(inventoryTabs)
          }
          return {
            ...withPlacedInventory(state, bought.inventory),
            gold: bought.gold,
            favor: bought.favor,
            upgrades: bought.upgrades,
            inventoryTabs,
          }
        }),
      equipItem: (itemId) =>
        set((state) => {
          const classLevel = levelForXp(state.classXp)
          if (state.isInDungeonOrQuest || canEquip(state.equipment, itemId, classLevel) != null) {
            return state
          }
          const next = equip(state.equipment, state.inventory, itemId, classLevel)
          if (!next) return state
          return { equipment: next.equipment, ...withPlacedInventory(state, next.inventory) }
        }),
      unequipSlot: (slot) =>
        set((state) => {
          if (state.isInDungeonOrQuest) return state
          const next = unequip(state.equipment, state.inventory, slot)
          return { equipment: next.equipment, ...withPlacedInventory(state, next.inventory) }
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
          return { equipment: next.equipment, ...withPlacedInventory(state, next.inventory) }
        }),
      deleteEquipmentSet: (name) =>
        set((state) => ({
          equipmentSets: state.equipmentSets.filter((entry) => entry.name !== name),
        })),
      renameInventoryTab: (tabId, name) =>
        set((state) => ({ inventoryTabs: renameTab(state.inventoryTabs, tabId, name) })),
      moveInventoryItem: (itemId, toTabId) =>
        set((state) => ({ inventoryTabs: moveItemToTab(state.inventoryTabs, itemId, toTabId) })),
      reorderInventoryItem: (tabId, itemId, beforeItemId) =>
        set((state) => ({
          inventoryTabs: reorderItem(state.inventoryTabs, tabId, itemId, beforeItemId),
        })),
      beginCharacter: ({ slot, name, classId, clericFocus }) => {
        const trimmed = name.trim().slice(0, 20)
        if (!trimmed || !browserStorage) return
        const kit = applyStartingKit(getClass(classId).startingKit)
        bindSlot(slot)
        writeSlotIndex(browserStorage, { active: slot })
        enableSaveWrites()
        const blank = createInitialSave()
        set({
          ...blank,
          characterName: trimmed,
          classId,
          classXp: 0,
          clericFocus: classId === 'cleric' && clericFocus === 'STR' ? 'STR' : 'INT',
          ...withPlacedInventory(blank, kit.inventory),
          equipment: kit.equipment,
          lastTick: Date.now(),
          lastSaved: new Date().toISOString(),
          log: [],
          offlineReport: null,
          questMessage: null,
          offlineKills: 0,
          lastDefeat: false,
        })
        flushSave()
      },
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
      acceptQuest: (questId) => {
        let line = ''
        set((state) => {
          const result = acceptQuest(state.questProgress, questId, {
            skills: state.skills,
            classXp: state.classXp,
            inventory: state.inventory,
          })
          line = result.line
          if (!result.ok) return { questMessage: result.line }
          return {
            questProgress: result.progress,
            pinnedQuestId: questId,
            questMessage: result.line,
          }
        })
        return line
      },
      turnInQuest: (questId) => {
        let line = ''
        set((state) => {
          const result = turnInQuest(
            questId,
            state.questProgress,
            state.inventory,
            state.skills,
            state.classXp,
            state.gold,
            state.favor,
          )
          line = result.line
          if (!result.ok) return { questMessage: result.line }
          return {
            questProgress: result.progress,
            ...withPlacedInventory(state, result.inventory),
            gold: result.gold,
            favor: result.favor,
            pinnedQuestId:
              result.completed && state.pinnedQuestId === questId ? null : state.pinnedQuestId,
            questMessage: result.line,
          }
        })
        return line
      },
      rollQuestCheck: (questId, approachId, prepOn) => {
        let line = ''
        set((state) => {
          const result = rollCheck(
            questId,
            approachId,
            state.questProgress,
            state.skills,
            state.inventory,
            state.gold,
            state.favor,
            liveRng,
            state.tomes,
            prepOn,
          )
          line = result.line
          if (!result.ok) return { questMessage: result.line }
          return {
            questProgress: result.progress,
            ...withPlacedInventory(state, result.inventory),
            gold: result.gold,
            favor: result.favor,
            pinnedQuestId:
              result.progress[questId]?.done && state.pinnedQuestId === questId
                ? null
                : state.pinnedQuestId,
            questMessage: result.line,
          }
        })
        return line
      },
      resolveQuestCheck: (questId, useInspiration) => {
        let line = ''
        set((state) => {
          const result = resolvePendingCheck(
            questId,
            state.questProgress,
            state.skills,
            state.inventory,
            state.gold,
            state.favor,
            liveRng,
            useInspiration,
            state.tomes,
          )
          line = result.line
          if (!result.ok) return { questMessage: result.line }
          return {
            questProgress: result.progress,
            ...withPlacedInventory(state, result.inventory),
            gold: result.gold,
            favor: result.favor,
            pinnedQuestId:
              result.progress[questId]?.done && state.pinnedQuestId === questId
                ? null
                : state.pinnedQuestId,
            questMessage: result.line,
          }
        })
        return line
      },
      pinQuest: (questId) => set({ pinnedQuestId: questId }),
      turnInNotice: (offerId) =>
        set((state) => {
          const result = turnInNotice(
            state.noticeBoard,
            offerId,
            state.inventory,
            state.gold,
            state.favor,
          )
          if (!result.ok) return state
          return {
            noticeBoard: result.board,
            ...withPlacedInventory(state, result.inventory),
            gold: result.gold,
            favor: result.favor,
          }
        }),
      rerollNotice: () =>
        set((state) => {
          const result = rerollBoard(
            state.noticeBoard,
            state.favor,
            liveRng,
            state.skills,
            state.questProgress,
          )
          if (!result.ok) return state
          return { noticeBoard: result.board, favor: result.favor }
        }),
      refreshNoticeBoard: (now = Date.now()) =>
        set((state) => ({
          noticeBoard: refreshIfDue(
            state.noticeBoard,
            now,
            liveRng,
            state.skills,
            state.questProgress,
          ),
        })),
    }),
    {
      name: 'idle_game_slot',
      version: SAVE_VERSION,
      storage,
      partialize: (state) => ({
        characterName: state.characterName,
        skills: state.skills,
        inventory: state.inventory,
        inventoryTabs: state.inventoryTabs,
        gold: state.gold,
        lastSaved: state.lastSaved,
        lastTick: state.lastTick,
        activeAction: state.activeAction,
        classId: state.classId,
        classXp: state.classXp,
        clericFocus: state.clericFocus,
        isInDungeonOrQuest: state.isInDungeonOrQuest,
        equipment: state.equipment ?? emptyEquipment(),
        equipmentSets: state.equipmentSets ?? [],
        combat: state.combat ?? null,
        spellLoadouts: state.spellLoadouts,
        questProgress: state.questProgress,
        pinnedQuestId: state.pinnedQuestId,
        noticeBoard: state.noticeBoard,
        upgrades: state.upgrades ?? {},
        stopWhenOutOfFood: state.stopWhenOutOfFood !== false,
        tomes: state.tomes,
        bestiaries: state.bestiaries,
        activeBuffs: state.activeBuffs,
        favor: state.favor,
        renown: state.renown,
        bounty: state.bounty,
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

function withPlacedInventory(
  state: { inventory: Inventory; inventoryTabs: InventoryTab[] },
  nextInventory: Inventory,
): { inventory: Inventory; inventoryTabs: InventoryTab[] } {
  return {
    inventory: nextInventory,
    inventoryTabs: placeIncoming(state.inventoryTabs, state.inventory, nextInventory),
  }
}
