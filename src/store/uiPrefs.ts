import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

/** Separate from the game save so UI choices never enter save migrations. */
export const UI_PREFS_KEY = 'eldryn_ui_prefs'

interface UiPrefsData {
  sidebarExpanded: boolean
  lastTab: Record<string, string>
  hideLocked: boolean
}

interface UiPrefs extends UiPrefsData {
  setSidebarExpanded: (value: boolean) => void
  toggleSidebar: () => void
  setLastTab: (page: string, tab: string) => void
  setHideLocked: (value: boolean) => void
}

const initial: UiPrefsData = {
  sidebarExpanded: false,
  lastTab: {},
  hideLocked: false,
}

export function createUiPrefsStore(storage: StateStorage) {
  return create<UiPrefs>()(
    persist(
      (set) => ({
        ...initial,
        setSidebarExpanded: (sidebarExpanded) => set({ sidebarExpanded }),
        toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
        setLastTab: (page, tab) =>
          set((state) => ({ lastTab: { ...state.lastTab, [page]: tab } })),
        setHideLocked: (hideLocked) => set({ hideLocked }),
      }),
      {
        name: UI_PREFS_KEY,
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({
          sidebarExpanded: state.sidebarExpanded,
          lastTab: state.lastTab,
          hideLocked: state.hideLocked,
        }),
      },
    ),
  )
}

const memory = new Map<string, string>()
const fallback: StateStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, value)
  },
  removeItem: (key) => {
    memory.delete(key)
  },
}

export const useUiPrefs = createUiPrefsStore(
  typeof localStorage === 'undefined' ? fallback : localStorage,
)

export function usePageTab<T extends string>(
  page: string,
  fallbackTab: T,
  allowed: readonly T[],
): [T, (tab: T) => void] {
  const saved = useUiPrefs((state) => state.lastTab[page])
  const setLastTab = useUiPrefs((state) => state.setLastTab)
  const value = saved != null && (allowed as readonly string[]).includes(saved) ? (saved as T) : fallbackTab
  return [value, (tab) => setLastTab(page, tab)]
}
