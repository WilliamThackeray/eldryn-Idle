import { create } from 'zustand'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import type { SkillId } from '../data/skills'
import { addXp } from '../engine/experience'
import { SAVE_KEY, SAVE_VERSION, createInitialSave, migrateSave, normalizeSave, type SaveData } from './migrate'

interface GameStore extends SaveData {
  addSkillXp: (skillId: SkillId, amount: number) => void
  saveGame: () => void
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
    localStorage.setItem(name, JSON.stringify(value))
  },
  removeItem: (name) => {
    localStorage.removeItem(name)
  },
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      ...createInitialSave(),
      addSkillXp: (skillId, amount) =>
        set((state) => {
          const current = state.skills[skillId]
          if (!current) return state
          const xp = addXp(current.xp, amount)
          if (xp === current.xp) return state
          return { skills: { ...state.skills, [skillId]: { xp } } }
        }),
      saveGame: () => set({ lastSaved: new Date().toISOString() }),
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
