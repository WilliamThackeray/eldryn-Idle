import { isItemId } from '../data/items'
import { initialSkillProgress, isSkillId, type SkillId } from '../data/skills'
import type { ActiveAction } from '../engine/advance'
import type { Inventory } from '../engine/inventory'
import type { SkillProgress } from '../types/game'

export const SAVE_KEY = 'idle_game_save'
/** v4: inventory is item counts, plus a gold counter. */
export const SAVE_VERSION = 4

export interface SaveData {
  characterName: string
  skills: Record<SkillId, SkillProgress>
  inventory: Inventory
  gold: number
  lastSaved: string
  lastTick: number
  activeAction: ActiveAction | null
}

export function createInitialSave(): SaveData {
  return {
    characterName: 'bob',
    skills: initialSkillProgress(),
    inventory: {},
    gold: 0,
    lastSaved: new Date().toISOString(),
    lastTick: Date.now(),
    activeAction: null,
  }
}

export function migrateSave(persisted: unknown, version: number): SaveData {
  const source = version < SAVE_VERSION ? fromLegacy(persisted) : persisted
  return normalizeSave(source)
}

export function normalizeSave(raw: unknown): SaveData {
  const skills = initialSkillProgress()
  const source = isRecord(raw) ? raw : {}

  if (isRecord(source.skills)) {
    for (const id of Object.keys(skills) as SkillId[]) {
      const entry = source.skills[id]
      if (!isRecord(entry) || typeof entry.xp !== 'number' || !Number.isFinite(entry.xp) || entry.xp < 0) continue
      skills[id] = { xp: entry.xp }
    }
  }

  const characterName =
    typeof source.characterName === 'string' && source.characterName.trim() ? source.characterName : 'bob'

  return {
    characterName,
    skills,
    inventory: readInventory(source.inventory),
    gold: readGold(source.gold),
    lastSaved: typeof source.lastSaved === 'string' ? source.lastSaved : new Date().toISOString(),
    lastTick: typeof source.lastTick === 'number' && Number.isFinite(source.lastTick) ? source.lastTick : Date.now(),
    activeAction: parseActiveAction(source.activeAction),
  }
}

function fromLegacy(raw: unknown): unknown {
  if (!isRecord(raw)) return raw
  if (isRecord(raw.skills)) return raw

  const character = isRecord(raw.character) ? raw.character : null
  if (!character) return raw

  const skills = initialSkillProgress()
  readLegacySkills(character.nonCombatSkills, skills)
  readLegacySkills(character.combatSkills, skills)
  readLegacySkills(character.passiveSkills, skills)

  return {
    characterName: character.name,
    skills,
    inventory: character.inventory,
    lastSaved: raw.lastSaved,
  }
}

function readLegacySkills(raw: unknown, skills: Record<SkillId, SkillProgress>) {
  if (!Array.isArray(raw)) return
  for (const entry of raw) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || !isSkillId(entry.id)) continue
    const xp = typeof entry.currentXP === 'number' ? entry.currentXP : entry.xp
    if (typeof xp !== 'number' || !Number.isFinite(xp) || xp < 0) continue
    skills[entry.id] = { xp }
  }
}

function parseActiveAction(value: unknown): ActiveAction | null {
  if (!isRecord(value)) return null
  const progressMs = finite(value.progressMs)
  const baseIntervalMs = finite(value.baseIntervalMs)
  if (progressMs == null || progressMs < 0 || baseIntervalMs == null || baseIntervalMs <= 0) return null
  if (typeof value.label !== 'string') return null

  if (value.kind === 'combat') return { kind: 'combat', label: value.label, baseIntervalMs, progressMs }
  if (value.kind !== 'skill' || typeof value.skillId !== 'string' || !isSkillId(value.skillId)) return null
  if (typeof value.activityId !== 'string') return null
  const requiredLevel = finite(value.requiredLevel)
  const baseXp = finite(value.baseXp)
  if (requiredLevel == null || requiredLevel < 1 || baseXp == null || baseXp < 0) return null

  return {
    kind: 'skill',
    skillId: value.skillId,
    activityId: value.activityId,
    label: value.label,
    baseIntervalMs,
    requiredLevel,
    baseXp,
    progressMs,
  }
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readInventory(value: unknown): Inventory {
  const inventory: Inventory = {}
  const add = (id: string, quantity: unknown) => {
    if (!isItemId(id)) return
    const qty = finite(quantity)
    if (qty == null || qty <= 0) return
    inventory[id] = (inventory[id] ?? 0) + Math.floor(qty)
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!isRecord(entry) || typeof entry.id !== 'string') continue
      add(entry.id, entry.quantity)
    }
    return inventory
  }
  if (isRecord(value)) {
    for (const [id, quantity] of Object.entries(value)) add(id, quantity)
  }
  return inventory
}

function readGold(value: unknown): number {
  const gold = finite(value)
  if (gold == null || gold <= 0) return 0
  return Math.floor(gold)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
