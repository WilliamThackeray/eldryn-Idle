import { getClass, type ClassId } from '../data/classes'
import { SKILLS } from '../data/skills'
import { levelForXp } from '../engine/xp'
import { SAVE_KEY, SAVE_VERSION, migrateSave, type SaveData } from './migrate'

export const SLOT_COUNT = 3
export const SLOT_INDEX_KEY = 'idle_game_slots'
export const REALM_NOTICE_KEY = 'idle_game_realm_notice'
export type SlotId = 1 | 2 | 3

const ALL_SLOTS: SlotId[] = [1, 2, 3]

function saveVersion(raw: string | null): number | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return 0
    if (typeof parsed.version === 'number') return parsed.version
    return 0
  } catch {
    return 0
  }
}

/** Wipe pre-trade-skill saves. Returns true when the realm notice should show. */
export function wipePreTradeSkillSaves(storage: KeyValueStore): boolean {
  const versions = [
    saveVersion(storage.getItem(SAVE_KEY)),
    ...ALL_SLOTS.map((slot) => saveVersion(storage.getItem(slotStorageKey(slot)))),
  ].filter((v): v is number => v != null)
  if (!versions.length || versions.every((v) => v >= SAVE_VERSION)) return false

  for (const slot of ALL_SLOTS) storage.removeItem(slotStorageKey(slot))
  storage.removeItem(SAVE_KEY)
  storage.removeItem(SLOT_INDEX_KEY)
  storage.setItem(REALM_NOTICE_KEY, '1')
  bindSlot(null)
  return true
}

export function consumeRealmNotice(storage: KeyValueStore): boolean {
  if (!storage.getItem(REALM_NOTICE_KEY)) return false
  storage.removeItem(REALM_NOTICE_KEY)
  return true
}

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface SlotIndex {
  active: SlotId | null
}

export interface SlotSummary {
  slot: SlotId
  characterName: string
  classId: ClassId
  className: string
  classLevel: number
  totalLevel: number
  lastPlayed: string
}

let bound: SlotId | null = null

export function slotStorageKey(slot: SlotId): string {
  return `idle_game_save_${slot}`
}

export function currentSlot(): SlotId | null {
  return bound
}

export function bindSlot(slot: SlotId | null): void {
  bound = slot
}

export function isSlotId(value: number): value is SlotId {
  return value === 1 || value === 2 || value === 3
}

export function readSlotIndex(storage: KeyValueStore): SlotIndex {
  const raw = storage.getItem(SLOT_INDEX_KEY)
  if (!raw) return { active: null }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || typeof parsed.active !== 'number' || !isSlotId(parsed.active)) {
      return { active: null }
    }
    return { active: parsed.active }
  } catch {
    return { active: null }
  }
}

export function writeSlotIndex(storage: KeyValueStore, index: SlotIndex): void {
  storage.setItem(SLOT_INDEX_KEY, JSON.stringify(index))
}

export function readSlotSave(storage: KeyValueStore, slot: SlotId): SaveData | null {
  wipePreTradeSkillSaves(storage)
  const raw = storage.getItem(slotStorageKey(slot))
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    if ('state' in parsed && typeof parsed.version === 'number') {
      return migrateSave(parsed.state, parsed.version)
    }
    return migrateSave(parsed, 0)
  } catch {
    return null
  }
}

export function writeSlotSave(storage: KeyValueStore, slot: SlotId, save: SaveData): void {
  storage.setItem(slotStorageKey(slot), JSON.stringify({ state: save, version: SAVE_VERSION }))
}

export function deleteSlot(storage: KeyValueStore, slot: SlotId): void {
  storage.removeItem(slotStorageKey(slot))
  if (readSlotIndex(storage).active === slot) writeSlotIndex(storage, { active: null })
  if (bound === slot) bound = null
}

export function slotSummary(slot: SlotId, save: SaveData): SlotSummary | null {
  if (!save.classId) return null
  const totalLevel = SKILLS.reduce((sum, skill) => sum + levelForXp(save.skills[skill.id]?.xp ?? 0), 0)
  const savedAt = Date.parse(save.lastSaved)
  const playedMs = Math.max(save.lastTick || 0, Number.isFinite(savedAt) ? savedAt : 0)
  return {
    slot,
    characterName: save.characterName,
    classId: save.classId,
    className: getClass(save.classId).name,
    classLevel: levelForXp(save.classXp),
    totalLevel,
    lastPlayed: new Date(playedMs).toISOString(),
  }
}

/** Copy a pre-slot save into slot 1. Leaves an existing slot 1 alone. */
export function adoptLegacySave(storage: KeyValueStore): void {
  const legacy = storage.getItem(SAVE_KEY)
  if (!legacy) return
  if (!storage.getItem(slotStorageKey(1))) {
    storage.setItem(slotStorageKey(1), legacy)
    if (readSlotIndex(storage).active == null) writeSlotIndex(storage, { active: 1 })
  }
  storage.removeItem(SAVE_KEY)
}

export function resumableSlot(storage: KeyValueStore): SlotId | null {
  const { active } = readSlotIndex(storage)
  if (!active) return null
  const save = readSlotSave(storage, active)
  if (!save?.classId) return null
  return active
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
