import { create } from 'zustand'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import { modifiersFor, type ClassId, type ClericFocus } from '../data/classes'
import type { ItemId } from '../data/items'
import { buyItem as buyShopItem } from '../data/shop'
import { advance, type GameEvent, type OfflineReport, type SkillAction } from '../engine/advance'
import {
  applyLoadout,
  canEquip,
  emptyEquipment,
  equip,
  unequip,
  type EquipmentSlot,
} from '../engine/equipment'
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

const LOG_LIMIT = 10

interface GameStore extends SaveData {
  log: GameEvent[]
  offlineReport: OfflineReport | null
  startActivity: (activity: Omit<SkillAction, 'kind' | 'progressMs'>) => void
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
      startActivity: (activity) =>
        set({
          activeAction: { kind: 'skill', ...activity, progressMs: 0 },
          log: [],
        }),
      stopActivity: () => set({ activeAction: null }),
      applyElapsed: (elapsedMs, lastTick) =>
        set((state) => {
          if (!(elapsedMs > 0)) return { lastTick }
          const result = advance(
            {
              skills: state.skills,
              inventory: state.inventory,
              gold: state.gold,
              activeAction: state.activeAction,
              equipment: state.equipment,
            },
            elapsedMs,
            liveRng,
            modifiersFor(state.activeClassId, state.clericFocus),
          )
          return {
            skills: result.state.skills,
            inventory: result.state.inventory,
            gold: result.state.gold,
            activeAction: result.state.activeAction,
            log: [...state.log, ...result.log].slice(-LOG_LIMIT),
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
