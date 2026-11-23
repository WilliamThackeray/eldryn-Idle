import {
  CLASSES,
  isClassId,
  type ClassId,
  type ClericFocus,
} from '../data/classes'
import { isDungeonId } from '../data/dungeons'
import { isItemId } from '../data/items'
import { NOTE_GROUPS, type NoteGroupId } from '../data/historyContent'
import { CREATURE_TYPES, getMonster, isBiomeId, type CreatureType } from '../data/monsters'
import { isQuestId } from '../data/quests'
import { isSpellId } from '../data/spells'
import { initialSkillProgress, isSkillId, SKILLS, type TradeSkillId } from '../data/skills'
import type { ActiveAction, CombatFight } from '../engine/advance'
import type { ActiveBuff, BuffEffect } from '../engine/history'
import { emptyNoticeBoard, type NoticeBoard } from '../engine/noticeBoard'
import type { Bounty } from '../engine/social'
import { emptyQuestProgress, emptyQuestRun, type QuestProgress, type QuestRun } from '../engine/quest'
import { emptySignatureRuntime } from '../engine/signatures'
import { emptyEquipment, type Equipment, type EquipmentSet, type EquipmentSlot } from '../engine/equipment'
import type { Inventory } from '../engine/inventory'
import {
  defaultInventoryTabs,
  normalizeInventoryTabs,
  type InventoryTab,
} from '../engine/inventoryTabs'
import {
  initialSpellLoadouts,
  type SpellLoadout,
  type SpellSlot,
} from '../engine/spells'
import type { SkillProgress } from '../types/game'

export const SAVE_KEY = 'idle_game_save'
/** v18: secondary class + Echo rebirth prestige. */
export const SAVE_VERSION = 19

/** Old sell values for bags removed in the specific-components rework. */
const LEGACY_BAG_SELL: Record<string, number> = {
  'component-bag-basic': 12,
  'component-bag-fine': 50,
  'component-bag-rare': 200,
  'component-bag-exotic': 800,
  'component-bag-legendary': 3200,
}

export interface SaveData {
  characterName: string
  skills: Record<TradeSkillId, SkillProgress>
  inventory: Inventory
  inventoryTabs: InventoryTab[]
  gold: number
  lastSaved: string
  lastTick: number
  activeAction: ActiveAction | null
  /** Null until character creation. Locked after that. */
  classId: ClassId | null
  classXp: number
  /** Multiclass secondary. Null when none. */
  secondaryClassId: ClassId | null
  secondaryClassXp: number
  /** Permanent rebirth Echo count (+ECHO_XP_PCT% all XP each). */
  echoes: number
  clericFocus: ClericFocus
  isInDungeonOrQuest: boolean
  equipment: Equipment
  equipmentSets: EquipmentSet[]
  combat: CombatFight | null
  spellLoadouts: Record<ClassId, SpellLoadout>
  questProgress: QuestProgress
  pinnedQuestId: string | null
  noticeBoard: NoticeBoard
  /** Owned shop upgrade tier index per upgrade id. */
  upgrades: Record<string, number>
  /** End hunt/dungeon after a rest when food runs out and HP is still below max. Default on. */
  stopWhenOutOfFood: boolean
  /** Highest History tome volume read per skill. */
  tomes: Record<TradeSkillId, number>
  /** Highest bestiary volume read per creature type. */
  bestiaries: Record<CreatureType, number>
  /** Timed buffs (Study Notes and CHA consumables). Tick during active actions, including offline. */
  activeBuffs: ActiveBuff[]
  /** Guild Favor currency. */
  favor: number
  /** Performance renown. */
  renown: number
  /** Active bounty, if any. */
  bounty: Bounty | null
}

export function createInitialSave(): SaveData {
  return {
    characterName: 'bob',
    skills: initialSkillProgress(),
    inventory: {},
    inventoryTabs: defaultInventoryTabs(),
    gold: 0,
    lastSaved: new Date().toISOString(),
    lastTick: Date.now(),
    activeAction: null,
    classId: null,
    classXp: 0,
    secondaryClassId: null,
    secondaryClassXp: 0,
    echoes: 0,
    clericFocus: 'INT',
    isInDungeonOrQuest: false,
    equipment: emptyEquipment(),
    equipmentSets: [],
    combat: null,
    spellLoadouts: initialSpellLoadouts(),
    questProgress: emptyQuestProgress(),
    pinnedQuestId: null,
    noticeBoard: emptyNoticeBoard(),
    upgrades: {},
    stopWhenOutOfFood: true,
    tomes: emptyTomes(),
    bestiaries: emptyBestiaries(),
    activeBuffs: [],
    favor: 0,
    renown: 0,
    bounty: null,
  }
}

function emptyTomes(): Record<TradeSkillId, number> {
  const tomes = {} as Record<TradeSkillId, number>
  for (const skill of SKILLS) tomes[skill.id] = 0
  return tomes
}

function emptyBestiaries(): Record<CreatureType, number> {
  const bestiaries = {} as Record<CreatureType, number>
  for (const type of CREATURE_TYPES) bestiaries[type] = 0
  return bestiaries
}

export function migrateSave(persisted: unknown, version: number): SaveData {
  // Pre-v19 saves are wiped at the slot layer; never remap old skill ids.
  if (version < SAVE_VERSION) return createInitialSave()
  return normalizeSave(persisted)
}

export function normalizeSave(raw: unknown): SaveData {
  const skills = initialSkillProgress()
  const source = isRecord(raw) ? raw : {}

  if (isRecord(source.skills)) {
    for (const id of Object.keys(skills) as TradeSkillId[]) {
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

  const { inventory: bagFreeInventory, goldBonus } = convertLegacyComponentBags(source.inventory)
  const inventory = migrateForgedWrit(readInventory(bagFreeInventory))
  const upgrades = readUpgrades(source.upgrades)
  const tabTiers = upgrades['inventory-tabs']
  const tabCount = 5 + (tabTiers == null ? 0 : tabTiers + 1)
  return {
    characterName,
    skills,
    inventory,
    inventoryTabs: normalizeInventoryTabs(source.inventoryTabs, inventory, tabCount),
    gold: readGold(source.gold) + goldBonus,
    lastSaved: typeof source.lastSaved === 'string' ? source.lastSaved : new Date().toISOString(),
    lastTick: typeof source.lastTick === 'number' && Number.isFinite(source.lastTick) ? source.lastTick : Date.now(),
    activeAction,
    ...readLockedClass(source),
    ...readSecondaryClass(source),
    echoes: readEchoes(source.echoes),
    clericFocus: source.clericFocus === 'STR' ? 'STR' : 'INT',
    isInDungeonOrQuest: source.isInDungeonOrQuest === true,
    equipment: readEquipment(source.equipment),
    equipmentSets: readEquipmentSets(source.equipmentSets),
    combat,
    spellLoadouts: readSpellLoadouts(source.spellLoadouts),
    questProgress: readQuestProgress(source.questProgress),
    pinnedQuestId: readPinnedQuestId(source.pinnedQuestId),
    noticeBoard: readNoticeBoard(source.noticeBoard, typeof source.lastTick === 'number' ? source.lastTick : Date.now()),
    upgrades,
    stopWhenOutOfFood: source.stopWhenOutOfFood !== false,
    tomes: readTomes(source.tomes),
    bestiaries: readBestiaries(source.bestiaries),
    activeBuffs: readActiveBuffs(source.activeBuffs),
    favor: readGold(source.favor),
    renown: readGold(source.renown),
    bounty: readBounty(source.bounty),
  }
}

function migrateForgedWrit(inventory: Inventory): Inventory {
  const legacy = (inventory as Record<string, number>)['guild-writ']
  if (!(legacy > 0)) return inventory
  const next: Inventory = { ...inventory }
  delete (next as Record<string, number>)['guild-writ']
  next['forged-writ'] = (next['forged-writ'] ?? 0) + Math.floor(legacy)
  return next
}

function readBounty(value: unknown): Bounty | null {
  if (!isRecord(value)) return null
  if (typeof value.monsterId !== 'string' || !getMonster(value.monsterId)) return null
  const need = finite(value.need)
  const have = finite(value.have)
  if (need == null || need <= 0 || have == null || have < 0) return null
  return { monsterId: value.monsterId, need: Math.floor(need), have: Math.floor(have) }
}

function readTomes(value: unknown): Record<TradeSkillId, number> {
  const tomes = emptyTomes()
  if (!isRecord(value)) return tomes
  for (const skill of SKILLS) {
    const raw = finite(value[skill.id])
    if (raw == null || raw < 0) continue
    tomes[skill.id] = Math.min(10, Math.floor(raw))
  }
  return tomes
}

function readBestiaries(value: unknown): Record<CreatureType, number> {
  const bestiaries = emptyBestiaries()
  if (!isRecord(value)) return bestiaries
  for (const type of CREATURE_TYPES) {
    const raw = finite(value[type])
    if (raw == null || raw < 0) continue
    bestiaries[type] = Math.min(3, Math.floor(raw))
  }
  return bestiaries
}

function isNoteGroupId(value: string): value is NoteGroupId {
  return NOTE_GROUPS.some((group) => group.id === value)
}

function readActiveBuffs(value: unknown): ActiveBuff[] {
  if (!Array.isArray(value)) return []
  const buffs: ActiveBuff[] = []
  for (const entry of value) {
    if (!isRecord(entry)) continue
    if (typeof entry.id !== 'string' || entry.id.length === 0) continue
    const remainingMs = finite(entry.remainingMs)
    if (remainingMs == null || remainingMs <= 0) continue
    const effect = readBuffEffect(entry.effect)
    if (!effect) continue
    buffs.push({ id: entry.id, effect, remainingMs })
  }
  return buffs
}

function readBuffEffect(value: unknown): BuffEffect | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null
  if (value.type === 'noteYield') {
    if (typeof value.groupId !== 'string' || !isNoteGroupId(value.groupId)) return null
    const amount = finite(value.value)
    if (amount == null || amount <= 0) return null
    return { type: 'noteYield', groupId: value.groupId, value: amount }
  }
  if (value.type === 'sellPricePct') {
    const amount = finite(value.value)
    if (amount == null || amount <= 0) return null
    return { type: 'sellPricePct', value: amount }
  }
  if (value.type === 'activityAdvantage') {
    if (!Array.isArray(value.skills)) return null
    const skills = value.skills.filter((id): id is TradeSkillId => typeof id === 'string' && isSkillId(id))
    if (!skills.length) return null
    return { type: 'activityAdvantage', skills }
  }
  if (value.type === 'frighten') {
    const chance = finite(value.chance)
    if (chance == null || chance <= 0) return null
    return { type: 'frighten', chance }
  }
  if (value.type === 'rareSpawn') {
    if (typeof value.biome !== 'string' || !isBiomeId(value.biome)) return null
    const chance = finite(value.chance)
    if (chance == null || chance <= 0) return null
    return { type: 'rareSpawn', biome: value.biome, chance }
  }
  if (value.type === 'damageVsType') {
    if (typeof value.creatureType !== 'string') return null
    if (!(CREATURE_TYPES as readonly string[]).includes(value.creatureType)) return null
    const amount = finite(value.value)
    if (amount == null || amount <= 0) return null
    return { type: 'damageVsType', creatureType: value.creatureType as CreatureType, value: amount }
  }
  return null
}

function readUpgrades(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {}
  const next: Record<string, number> = {}
  for (const [id, tier] of Object.entries(value)) {
    if (typeof id !== 'string' || id.length === 0) continue
    if (typeof tier !== 'number' || !Number.isFinite(tier) || tier < 0) continue
    next[id] = Math.floor(tier)
  }
  return next
}

function readPinnedQuestId(value: unknown): string | null {
  if (typeof value !== 'string' || !isQuestId(value)) return null
  return value
}

function readNoticeBoard(value: unknown, fallbackNow: number): NoticeBoard {
  if (!isRecord(value)) return emptyNoticeBoard(fallbackNow)
  const refreshedAt = finite(value.refreshedAt) ?? fallbackNow
  const offers: NoticeBoard['offers'] = []
  if (Array.isArray(value.offers)) {
    for (const raw of value.offers) {
      if (!isRecord(raw) || typeof raw.id !== 'string') continue
      const gold = finite(raw.gold)
      const favor = finite(raw.favor)
      const count = finite(raw.count)
      if (gold == null || favor == null || count == null || count < 0) continue
      const objective = readObjective(raw.objective)
      if (!objective) continue
      offers.push({
        id: raw.id,
        objective,
        gold: Math.floor(gold),
        favor: Math.floor(favor),
        count: Math.floor(count),
      })
    }
  }
  return { refreshedAt: Math.floor(refreshedAt), offers }
}

function readObjective(value: unknown): NoticeBoard['offers'][number]['objective'] | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null
  if (value.type === 'deliver' || value.type === 'have') {
    if (typeof value.itemId !== 'string' || !isItemId(value.itemId)) return null
    const qty = finite(value.qty)
    if (qty == null || qty <= 0) return null
    return { type: value.type, itemId: value.itemId, qty: Math.floor(qty) }
  }
  if (value.type === 'kill') {
    const qty = finite(value.qty)
    if (qty == null || qty <= 0) return null
    if (typeof value.monsterId === 'string' && getMonster(value.monsterId)) {
      return { type: 'kill', monsterId: value.monsterId, qty: Math.floor(qty) }
    }
    if (typeof value.creatureType === 'string' && (CREATURE_TYPES as readonly string[]).includes(value.creatureType)) {
      return { type: 'kill', creatureType: value.creatureType as CreatureType, qty: Math.floor(qty) }
    }
  }
  return null
}

function readQuestProgress(value: unknown): QuestProgress {
  if (!isRecord(value)) return emptyQuestProgress()
  const next: QuestProgress = {}
  for (const [id, entry] of Object.entries(value)) {
    if (!isQuestId(id) || !isRecord(entry)) continue
    // Drop legacy { step, done } shape without counts/inserts.
    if (!('counts' in entry) && 'step' in entry) continue
    const stage = finite(entry.stage)
    if (stage == null || stage < 0) continue
    const run = emptyQuestRun()
    run.stage = Math.floor(stage)
    run.done = entry.done === true
    run.rewardMod = finite(entry.rewardMod) ?? 1
    if (Array.isArray(entry.counts)) {
      run.counts = entry.counts.map((n) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0))
    }
    if (Array.isArray(entry.history)) {
      run.history = entry.history.flatMap((h) => {
        if (!isRecord(h) || typeof h.text !== 'string') return []
        return [{ text: h.text, success: typeof h.success === 'boolean' ? h.success : undefined }]
      })
    }
    if (Array.isArray(entry.resolvedStages)) {
      run.resolvedStages = entry.resolvedStages.flatMap((n) =>
        typeof n === 'number' && Number.isFinite(n) ? [Math.floor(n)] : [],
      )
    }
    if (Array.isArray(entry.inserts)) {
      run.inserts = entry.inserts.flatMap((ins) => {
        if (!isRecord(ins)) return []
        const at = finite(ins.at)
        if (at == null || at < 0 || !Array.isArray(ins.stages)) return []
        return [{ at: Math.floor(at), stages: ins.stages as QuestRun['inserts'][number]['stages'] }]
      })
    }
    next[id] = run
  }
  return next
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

function readClassId(value: unknown): ClassId | null {
  if (typeof value !== 'string' || !isClassId(value)) return null
  return value
}

/** Old saves stored XP per class. Keep the highest. The active class wins a tie. */
function readLockedClass(source: Record<string, unknown>): { classId: ClassId | null; classXp: number } {
  const locked = readClassId(source.classId)
  if (locked) {
    const xp = finite(source.classXp)
    return { classId: locked, classXp: xp != null && xp >= 0 ? Math.floor(xp) : 0 }
  }

  const active = readClassId(source.activeClassId)
  if (!isRecord(source.classes) && !active) return { classId: null, classXp: 0 }

  let bestId: ClassId | null = null
  let bestXp = -1
  for (const entry of CLASSES) {
    const raw = isRecord(source.classes) ? source.classes[entry.id] : undefined
    const xp = isRecord(raw) ? finite(raw.xp) : null
    const safe = xp != null && xp >= 0 ? xp : 0
    if (safe > bestXp) {
      bestXp = safe
      bestId = entry.id
    }
  }
  if (active) {
    const raw = isRecord(source.classes) ? source.classes[active] : undefined
    const xp = isRecord(raw) ? finite(raw.xp) : null
    const safe = xp != null && xp >= 0 ? xp : 0
    if (safe === bestXp) bestId = active
  }
  if (bestXp <= 0 && !active) return { classId: null, classXp: 0 }
  return { classId: bestId, classXp: Math.max(0, Math.floor(bestXp)) }
}

function readSecondaryClass(source: Record<string, unknown>): {
  secondaryClassId: ClassId | null
  secondaryClassXp: number
} {
  const id = readClassId(source.secondaryClassId)
  const xp = finite(source.secondaryClassXp)
  return {
    secondaryClassId: id,
    secondaryClassXp: id != null && xp != null && xp >= 0 ? Math.floor(xp) : 0,
  }
}

function readEchoes(value: unknown): number {
  const n = finite(value)
  if (n == null || n < 0) return 0
  return Math.floor(n)
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
    const mode = value.mode === 'dungeon' ? 'dungeon' : 'hunt'
    return {
      kind: 'combat',
      label: value.label,
      monsterId: value.monsterId,
      biome: value.biome,
      baseIntervalMs,
      progressMs,
      mode,
      dungeonId:
        typeof value.dungeonId === 'string' && isDungeonId(value.dungeonId) ? value.dungeonId : undefined,
      questId: typeof value.questId === 'string' && isQuestId(value.questId) ? value.questId : undefined,
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

/** Turn owned component bags into gold at their old sell value, then drop the keys. */
function convertLegacyComponentBags(value: unknown): { inventory: unknown; goldBonus: number } {
  let goldBonus = 0
  if (Array.isArray(value)) {
    const next: unknown[] = []
    for (const entry of value) {
      if (!isRecord(entry) || typeof entry.id !== 'string') {
        next.push(entry)
        continue
      }
      const sell = LEGACY_BAG_SELL[entry.id]
      const qty = finite(entry.quantity)
      if (sell != null && qty != null && qty > 0) {
        goldBonus += sell * Math.floor(qty)
        continue
      }
      next.push(entry)
    }
    return { inventory: next, goldBonus }
  }
  if (!isRecord(value)) return { inventory: value, goldBonus: 0 }
  const next: Record<string, unknown> = { ...value }
  for (const [id, quantity] of Object.entries(value)) {
    const sell = LEGACY_BAG_SELL[id]
    if (sell == null) continue
    const qty = finite(quantity)
    if (qty != null && qty > 0) goldBonus += sell * Math.floor(qty)
    delete next[id]
  }
  return { inventory: next, goldBonus }
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
    secondarySignatureId:
      typeof value.secondarySignatureId === 'string' && value.secondarySignatureId
        ? value.secondarySignatureId
        : null,
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
    dungeonId: typeof value.dungeonId === 'string' && isDungeonId(value.dungeonId) ? value.dungeonId : null,
    nodeIndex: Math.max(0, Math.floor(finite(value.nodeIndex) ?? 0)),
    runsCompleted: Math.max(0, Math.floor(finite(value.runsCompleted) ?? 0)),
    restKind: value.restKind === 'short' || value.restKind === 'long' ? value.restKind : null,
    roomLog: Array.isArray(value.roomLog)
      ? value.roomLog.filter((line): line is string => typeof line === 'string').slice(-30)
      : [],
    questId: null,
    pendingCleave: Math.max(0, finite(value.pendingCleave) ?? 0),
    relentlessUsed: value.relentlessUsed === true,
    frightenAttacksLeft: Math.max(0, Math.floor(finite(value.frightenAttacksLeft) ?? 0)),
    killsThisTick: [],
    dungeonClearedThisTick: null,
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
