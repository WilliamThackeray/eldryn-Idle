import {
  initialClassProgress,
  isClassId,
  type ClassId,
  type ClericFocus,
} from '../data/classes'
import { isItemId } from '../data/items'
import { getMonster, isBiomeId } from '../data/monsters'
import { isSpellId } from '../data/spells'
import { initialSkillProgress, isSkillId, type SkillId } from '../data/skills'
import type { ActiveAction, CombatFight } from '../engine/advance'
import { emptySignatureRuntime } from '../engine/signatures'
import { emptyEquipment, type Equipment, type EquipmentSet, type EquipmentSlot } from '../engine/equipment'
import type { Inventory } from '../engine/inventory'
import {
  initialSpellLoadouts,
  type SpellLoadout,
  type SpellSlot,
} from '../engine/spells'
import type { SkillProgress } from '../types/game'

export const SAVE_KEY = 'idle_game_save'
/** v8: spell loadouts and combat spell state. */
export const SAVE_VERSION = 8

export interface SaveData {
  characterName: string
  skills: Record<SkillId, SkillProgress>
  inventory: Inventory
  gold: number
  lastSaved: string
  lastTick: number
  activeAction: ActiveAction | null
  activeClassId: ClassId | null
  classes: Record<ClassId, { xp: number }>
  clericFocus: ClericFocus
  isInDungeonOrQuest: boolean
  equipment: Equipment
  equipmentSets: EquipmentSet[]
  combat: CombatFight | null
  spellLoadouts: Record<ClassId, SpellLoadout>
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
    activeClassId: null,
    classes: initialClassProgress(),
    clericFocus: 'INT',
    isInDungeonOrQuest: false,
    equipment: emptyEquipment(),
    equipmentSets: [],
    combat: null,
    spellLoadouts: initialSpellLoadouts(),
  }
}

export function migrateSave(persisted: unknown, version: number): SaveData {
  const source = version < SAVE_VERSION ? fromLegacy(persisted) : persisted
  const save = normalizeSave(source)
  // Old saves skip the picker and start as Fighter.
  if (version < 5) return { ...save, activeClassId: 'fighter' }
  return save
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

  const combat = readCombat(source.combat)
  let activeAction = parseActiveAction(source.activeAction)
  // Drop a combat action if the fight state is missing or invalid.
  if (activeAction?.kind === 'combat' && !combat) activeAction = null

  return {
    characterName,
    skills,
    inventory: readInventory(source.inventory),
    gold: readGold(source.gold),
    lastSaved: typeof source.lastSaved === 'string' ? source.lastSaved : new Date().toISOString(),
    lastTick: typeof source.lastTick === 'number' && Number.isFinite(source.lastTick) ? source.lastTick : Date.now(),
    activeAction,
    activeClassId: readActiveClassId(source.activeClassId),
    classes: readClasses(source.classes),
    clericFocus: source.clericFocus === 'STR' ? 'STR' : 'INT',
    isInDungeonOrQuest: source.isInDungeonOrQuest === true,
    equipment: readEquipment(source.equipment),
    equipmentSets: readEquipmentSets(source.equipmentSets),
    combat,
    spellLoadouts: readSpellLoadouts(source.spellLoadouts),
  }
}

function readSpellLoadouts(value: unknown): Record<ClassId, SpellLoadout> {
  const loadouts = initialSpellLoadouts()
  if (!isRecord(value)) return loadouts
  for (const id of Object.keys(loadouts) as ClassId[]) {
    const entry = value[id]
    if (!isRecord(entry) || !Array.isArray(entry.slots)) continue
    loadouts[id] = {
      slots: entry.slots.map((slot) => (typeof slot === 'string' && isSpellId(slot) ? slot : null)),
    }
  }
  return loadouts
}

/** Returns the next activeClassId, or null when the switch is blocked / invalid. */
export function nextActiveClassId(
  isInDungeonOrQuest: boolean,
  classId: string,
): ClassId | null {
  if (isInDungeonOrQuest || !isClassId(classId)) return null
  return classId
}

function readActiveClassId(value: unknown): ClassId | null {
  if (typeof value !== 'string' || !isClassId(value)) return null
  return value
}

function readClasses(value: unknown): Record<ClassId, { xp: number }> {
  const classes = initialClassProgress()
  if (!isRecord(value)) return classes
  for (const id of Object.keys(classes) as ClassId[]) {
    const entry = value[id]
    if (!isRecord(entry) || typeof entry.xp !== 'number' || !Number.isFinite(entry.xp) || entry.xp < 0) continue
    classes[id] = { xp: entry.xp }
  }
  return classes
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

  if (value.kind === 'combat') {
    if (typeof value.monsterId !== 'string' || !getMonster(value.monsterId)) return null
    if (typeof value.biome !== 'string' || !isBiomeId(value.biome)) return null
    return {
      kind: 'combat',
      label: value.label,
      monsterId: value.monsterId,
      biome: value.biome,
      baseIntervalMs,
      progressMs,
    }
  }
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

const EQUIPMENT_SLOTS = Object.keys(emptyEquipment()) as EquipmentSlot[]

function readEquipment(value: unknown): Equipment {
  const equipment = emptyEquipment()
  if (!isRecord(value)) return equipment
  for (const slot of EQUIPMENT_SLOTS) {
    const id = value[slot]
    if (typeof id === 'string' && isItemId(id)) equipment[slot] = id
  }
  return equipment
}

function readEquipmentSets(value: unknown): EquipmentSet[] {
  if (!Array.isArray(value)) return []
  const sets: EquipmentSet[] = []
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.name !== 'string' || !entry.name.trim()) continue
    sets.push({ name: entry.name.trim(), slots: readEquipment(entry.slots) })
  }
  return sets
}

function readCombat(value: unknown): CombatFight | null {
  if (!isRecord(value)) return null
  if (typeof value.monsterId !== 'string' || !getMonster(value.monsterId)) return null
  if (typeof value.biome !== 'string' || !isBiomeId(value.biome)) return null
  const playerHp = finite(value.playerHp)
  const playerMaxHp = finite(value.playerMaxHp)
  const monsterHp = finite(value.monsterHp)
  const monsterMaxHp = finite(value.monsterMaxHp)
  if (playerHp == null || playerMaxHp == null || playerMaxHp <= 0) return null
  if (monsterHp == null || monsterMaxHp == null || monsterMaxHp <= 0) return null
  const phase = value.phase === 'rest' ? 'rest' : 'fight'
  const signatureId = isRecord(value.signature) && typeof value.signature.id === 'string' ? value.signature.id : 'rage'
  return {
    monsterId: value.monsterId,
    biome: value.biome,
    playerHp: Math.max(0, playerHp),
    playerMaxHp,
    monsterHp: Math.max(0, monsterHp),
    monsterMaxHp,
    playerProgressMs: Math.max(0, finite(value.playerProgressMs) ?? 0),
    monsterProgressMs: Math.max(0, finite(value.monsterProgressMs) ?? 0),
    phase,
    restProgressMs: Math.max(0, finite(value.restProgressMs) ?? 0),
    playerIntervalMs: Math.max(1, finite(value.playerIntervalMs) ?? 6000),
    monsterIntervalMs: Math.max(1, finite(value.monsterIntervalMs) ?? 6000),
    playerIntervalCount: Math.max(0, Math.floor(finite(value.playerIntervalCount) ?? 0)),
    nextAttackAdvantage: value.nextAttackAdvantage === true,
    monsterNextDisadvantage: value.monsterNextDisadvantage === true,
    slowActive: value.slowActive === true,
    pushDelayMs: Math.max(0, finite(value.pushDelayMs) ?? 0),
    cleaveOverflow: Math.max(0, finite(value.cleaveOverflow) ?? 0),
    ammoSpent: Math.max(0, Math.floor(finite(value.ammoSpent) ?? 0)),
    signature: {
      ...emptySignatureRuntime(signatureId),
      ...(isRecord(value.signature) ? (value.signature as object) : {}),
      id: signatureId,
    },
    kills: Math.max(0, Math.floor(finite(value.kills) ?? 0)),
    sessionMs: Math.max(0, finite(value.sessionMs) ?? 0),
    lootGained: Array.isArray(value.lootGained)
      ? value.lootGained.flatMap((entry) => {
          if (!isRecord(entry) || typeof entry.id !== 'string') return []
          const quantity = finite(entry.quantity)
          if (quantity == null || quantity <= 0) return []
          return [
            {
              id: entry.id,
              name: typeof entry.name === 'string' ? entry.name : entry.id,
              quantity: Math.floor(quantity),
            },
          ]
        })
      : [],
    goldGained: Math.max(0, Math.floor(finite(value.goldGained) ?? 0)),
    classXpGained: Math.max(0, Math.floor(finite(value.classXpGained) ?? 0)),
    openingDone: value.openingDone === true,
    outOfAmmo: value.outOfAmmo === true,
    defeated: value.defeated === true,
    log: Array.isArray(value.log) ? value.log.filter((line): line is string => typeof line === 'string').slice(-30) : [],
    spellSlots: readSpellSlots(value.spellSlots),
    rotationIndex: Math.max(0, Math.floor(finite(value.rotationIndex) ?? 0)),
    concentration: readConcentration(value.concentration),
    shieldBonus: Math.max(0, Math.floor(finite(value.shieldBonus) ?? 0)),
  }
}

function readSpellSlots(value: unknown): SpellSlot[] {
  if (!Array.isArray(value)) return []
  const slots: SpellSlot[] = []
  for (const entry of value) {
    if (!isRecord(entry)) continue
    const level = finite(entry.level)
    if (level == null || level < 0) continue
    const spellId =
      typeof entry.spellId === 'string' && isSpellId(entry.spellId) ? entry.spellId : null
    slots.push({ level: Math.floor(level), spellId, spent: entry.spent === true })
  }
  return slots
}

function readConcentration(value: unknown): CombatFight['concentration'] {
  const ids = [
    'blur',
    'shieldOfFaith',
    'faerieFire',
    'barkskin',
    'protectionFromEnergyFire',
    'huntersMark',
    'divineFavor',
    'shield',
  ] as const
  if (typeof value !== 'string') return null
  return (ids as readonly string[]).includes(value) ? (value as CombatFight['concentration']) : null
}
