import { initialSkillProgress, isSkillId, type SkillId } from '../data/skills'
import type { InventoryItem, SkillProgress } from '../types/game'

export const SAVE_KEY = 'idle_game_save'
export const SAVE_VERSION = 1

export interface SaveData {
  characterName: string
  skills: Record<SkillId, SkillProgress>
  inventory: InventoryItem[]
  lastSaved: string
}

export function createInitialSave(): SaveData {
  return {
    characterName: 'bob',
    skills: initialSkillProgress(),
    inventory: [],
    lastSaved: new Date().toISOString(),
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
    inventory: Array.isArray(source.inventory) ? source.inventory.filter(isInventoryItem) : [],
    lastSaved: typeof source.lastSaved === 'string' ? source.lastSaved : new Date().toISOString(),
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

function isInventoryItem(value: unknown): value is InventoryItem {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.quantity === 'number' &&
    Number.isFinite(value.quantity) &&
    typeof value.description === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
