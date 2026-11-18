import { expect, test } from 'vitest'
import { SAVE_KEY, createInitialSave } from './migrate'
import {
  adoptLegacySave,
  deleteSlot,
  readSlotSave,
  slotStorageKey,
  writeSlotSave,
  type KeyValueStore,
} from './slots'

function memory(): KeyValueStore {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

test('a legacy save becomes slot 1 and keeps the highest-XP class', () => {
  const storage = memory()
  storage.setItem(
    SAVE_KEY,
    JSON.stringify({
      state: {
        characterName: 'Ada',
        activeClassId: 'wizard',
        classes: { barbarian: { xp: 500 }, wizard: { xp: 80 } },
      },
      version: 9,
    }),
  )

  adoptLegacySave(storage)

  expect(storage.getItem(SAVE_KEY)).toBeNull()
  expect(readSlotSave(storage, 1)?.characterName).toBe('Ada')
  expect(readSlotSave(storage, 1)?.classId).toBe('barbarian')
  expect(readSlotSave(storage, 1)?.classXp).toBe(500)
  expect(readSlotSave(storage, 2)).toBeNull()
})

test('slots save and load independently', () => {
  const storage = memory()
  writeSlotSave(storage, 1, { ...createInitialSave(), characterName: 'Ada', classId: 'wizard', classXp: 10 })
  writeSlotSave(storage, 2, { ...createInitialSave(), characterName: 'Bea', classId: 'rogue', classXp: 40 })

  expect(readSlotSave(storage, 1)?.characterName).toBe('Ada')
  expect(readSlotSave(storage, 1)?.classId).toBe('wizard')
  expect(readSlotSave(storage, 1)?.classXp).toBe(10)
  expect(readSlotSave(storage, 2)?.characterName).toBe('Bea')
  expect(readSlotSave(storage, 2)?.classId).toBe('rogue')
  expect(readSlotSave(storage, 2)?.classXp).toBe(40)
  expect(readSlotSave(storage, 3)).toBeNull()
})

test('deleting a slot does not touch the others', () => {
  const storage = memory()
  writeSlotSave(storage, 1, { ...createInitialSave(), characterName: 'Ada', classId: 'wizard', classXp: 10 })
  writeSlotSave(storage, 2, { ...createInitialSave(), characterName: 'Bea', classId: 'rogue', classXp: 40 })
  writeSlotSave(storage, 3, { ...createInitialSave(), characterName: 'Cal', classId: 'fighter', classXp: 3 })
  const slot1 = storage.getItem(slotStorageKey(1))
  const slot3 = storage.getItem(slotStorageKey(3))

  deleteSlot(storage, 2)

  expect(storage.getItem(slotStorageKey(1))).toBe(slot1)
  expect(storage.getItem(slotStorageKey(3))).toBe(slot3)
  expect(readSlotSave(storage, 1)?.characterName).toBe('Ada')
  expect(readSlotSave(storage, 2)).toBeNull()
  expect(readSlotSave(storage, 3)?.classId).toBe('fighter')
})
