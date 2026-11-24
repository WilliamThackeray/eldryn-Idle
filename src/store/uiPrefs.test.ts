import type { StateStorage } from 'zustand/middleware'
import { expect, test } from 'vitest'
import { UI_PREFS_KEY, createUiPrefsStore } from './uiPrefs'

function memory() {
  const mem = new Map<string, string>()
  const storage: StateStorage = {
    getItem: (key) => mem.get(key) ?? null,
    setItem: (key, value) => {
      mem.set(key, value)
    },
    removeItem: (key) => {
      mem.delete(key)
    },
  }
  return { mem, storage }
}

test('persists UI prefs under their own key, not the game save', () => {
  const { mem, storage } = memory()
  const usePrefs = createUiPrefsStore(storage)
  usePrefs.getState().toggleSidebar()
  usePrefs.getState().setLastTab('shop', 'combat')
  usePrefs.getState().setHideLocked(true)

  expect([...mem.keys()]).toEqual([UI_PREFS_KEY])
  const saved = JSON.parse(mem.get(UI_PREFS_KEY) ?? '{}') as {
    state: { sidebarExpanded: boolean; lastTab: Record<string, string>; hideLocked: boolean; unseenUnlocks: string[] }
  }
  expect(saved.state).toMatchObject({
    sidebarExpanded: true,
    lastTab: { shop: 'combat' },
    hideLocked: true,
    unseenUnlocks: [],
  })
  expect(JSON.stringify(saved)).not.toContain('gold')
})

test('rehydrates a previous UI prefs blob', async () => {
  const { mem, storage } = memory()
  mem.set(
    UI_PREFS_KEY,
    JSON.stringify({
      state: { sidebarExpanded: true, lastTab: { character: 'spellbook' }, hideLocked: false },
      version: 0,
    }),
  )
  const usePrefs = createUiPrefsStore(storage)
  await usePrefs.persist.rehydrate()
  expect(usePrefs.getState().sidebarExpanded).toBe(true)
  expect(usePrefs.getState().lastTab.character).toBe('spellbook')
})
