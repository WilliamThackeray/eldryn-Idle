import { create } from 'zustand'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import { advance, type GameEvent, type OfflineReport, type SkillAction } from '../engine/advance'
import type { Rng } from '../engine/rng'
import { SAVE_KEY, SAVE_VERSION, createInitialSave, migrateSave, normalizeSave, type SaveData } from './migrate'

const LOG_LIMIT = 10

interface GameStore extends SaveData {
  log: GameEvent[]
  offlineReport: OfflineReport | null
  startActivity: (activity: Omit<SkillAction, 'kind' | 'progressMs'>) => void
  stopActivity: () => void
  applyElapsed: (elapsedMs: number, lastTick: number) => void
  dismissOffline: () => void
  saveGame: () => void
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
            { skills: state.skills, inventory: state.inventory, activeAction: state.activeAction },
            elapsedMs,
            liveRng,
          )
          return {
            skills: result.state.skills,
            inventory: result.state.inventory,
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
    }),
    {
      name: SAVE_KEY,
      version: SAVE_VERSION,
      storage,
      partialize: (state) => ({
        characterName: state.characterName,
        skills: state.skills,
        inventory: state.inventory,
        lastSaved: state.lastSaved,
        lastTick: state.lastTick,
        activeAction: state.activeAction,
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
