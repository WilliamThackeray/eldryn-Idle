import { getItem, type ItemId } from './items'
import {
  BESTIARY_TROPHY_COSTS,
  BESTIARY_TYPES,
  BESTIARY_VOLUME_LEVELS,
  NOTE_GROUPS,
  TOME_SKILLS,
  TOME_VOLUME_LEVELS,
  bestiaryItemId,
  noteItemId,
  tomeItemId,
  trophyItemId,
  type BestiaryType,
  type NoteGroupId,
} from './items/knowledge'

export { BESTIARY_TYPES, NOTE_GROUPS, TOME_SKILLS, type BestiaryType, type NoteGroupId }
import { SKILLS, type SkillId } from './skills'
import { acrobaticsActivities } from './activities/acrobatics'
import { animalHandlingActivities } from './activities/animalHandling'
import { arcanaActivities } from './activities/arcana'
import { athleticsActivities } from './activities/athletics'
import { deceptionActivities } from './activities/deception'
import { insightActivities } from './activities/insight'
import { intimidationActivities } from './activities/intimidation'
import { investigationActivities } from './activities/investigation'
import { medicineActivities } from './activities/medicine'
import { natureActivities } from './activities/nature'
import { perceptionActivities } from './activities/perception'
import { performanceActivities } from './activities/performance'
import { persuasionActivities } from './activities/persuasion'
import { religionActivities } from './activities/religion'
import { sleightOfHandActivities } from './activities/sleightOfHand'
import { stealthActivities } from './activities/stealth'
import { survivalActivities } from './activities/survival'
import { vitalityActivities } from './activities/vitality'
import { activity, drop, stack } from './activities/define'
import type { ActivityDef, ItemStack } from './activities/types'

const SKILL_ACTIVITIES: Record<Exclude<SkillId, 'history'>, ActivityDef[]> = {
  athletics: athleticsActivities,
  vitality: vitalityActivities,
  acrobatics: acrobaticsActivities,
  sleightOfHand: sleightOfHandActivities,
  stealth: stealthActivities,
  arcana: arcanaActivities,
  investigation: investigationActivities,
  nature: natureActivities,
  religion: religionActivities,
  animalHandling: animalHandlingActivities,
  insight: insightActivities,
  medicine: medicineActivities,
  perception: perceptionActivities,
  survival: survivalActivities,
  deception: deceptionActivities,
  intimidation: intimidationActivities,
  performance: performanceActivities,
  persuasion: persuasionActivities,
}

const FALLBACK_TOKEN: Partial<Record<SkillId, ItemId>> = {
  vitality: 'bandages',
  acrobatics: 'practice-ribbon',
  stealth: 'black-cloth',
  intimidation: 'menace-token',
  persuasion: 'silver-tongue',
  investigation: 'field-notes',
  perception: 'watch-mark',
  deception: 'marked-cards',
}

function isThemedCandidate(itemId: string): boolean {
  const item = getItem(itemId)
  if (!item || item.gear) return false
  if (item.tags?.includes('arrowhead')) return false
  return true
}

/** Highest-level non-gear (non-arrowhead) output at or below historyLevel. Ties: later activity. */
export function themedItemFor(skillId: Exclude<SkillId, 'history'>, historyLevel: number): ItemId {
  const activities = SKILL_ACTIVITIES[skillId]
  let bestLevel = -1
  let bestIndex = -1
  let bestItem: ItemId | null = null
  for (let index = 0; index < activities.length; index++) {
    const entry = activities[index]!
    if (entry.requiredLevel > historyLevel) continue
    const output = entry.outputs.find((loot) => isThemedCandidate(loot.itemId))
    if (!output) continue
    if (entry.requiredLevel > bestLevel || (entry.requiredLevel === bestLevel && index > bestIndex)) {
      bestLevel = entry.requiredLevel
      bestIndex = index
      bestItem = output.itemId
    }
  }
  if (bestItem) return bestItem
  const fallback = FALLBACK_TOKEN[skillId]
  if (fallback) return fallback
  throw new Error(`No themed item for ${skillId} at History ${historyLevel}`)
}

export function tomeCraftInputs(skillId: Exclude<SkillId, 'history'>, volume: number): ItemStack[] {
  const pages = volume
  const themed = themedItemFor(skillId, TOME_VOLUME_LEVELS[volume - 1])
  return [stack('ancient-page', pages), stack('ink'), stack(themed)]
}

function buildTomeActivities(): ActivityDef[] {
  return TOME_SKILLS.flatMap((skillId) => {
    const skill = SKILLS.find((entry) => entry.id === skillId)!
    return TOME_VOLUME_LEVELS.map((level, index) => {
      const volume = index + 1
      const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][index]
      return activity({
        skillId: 'history',
        id: `craft-tome-${skillId}-${volume}`,
        name: `The Art of ${skill.name}, Vol. ${roman}`,
        description: `Bind a permanent tome for ${skill.name}.`,
        requiredLevel: level,
        inputs: tomeCraftInputs(skillId, volume),
        outputs: [drop(tomeItemId(skillId, volume) as ItemId)],
        category: 'Tomes',
        group: skillId,
        sortOrder: volume,
      })
    })
  })
}

function buildNoteActivities(): ActivityDef[] {
  return NOTE_GROUPS.map((group) =>
    activity({
      skillId: 'history',
      id: `craft-notes-${group.id}`,
      name: `Notes on ${group.name}`,
      description: `Cheap study notes. +10% ${group.name.toLowerCase()} yield for 1 hour.`,
      requiredLevel: 1,
      inputs: [stack('ink'), ...group.inputs.map((entry) => stack(entry.itemId, entry.quantity))],
      outputs: [drop(noteItemId(group.id) as ItemId)],
      category: 'Study Notes',
    }),
  )
}

function buildBestiaryActivities(): ActivityDef[] {
  return BESTIARY_TYPES.flatMap((type) =>
    BESTIARY_VOLUME_LEVELS.map((level, index) => {
      const volume = index + 1
      const roman = ['I', 'II', 'III'][index]
      const trophy = trophyItemId(type) as ItemId
      return activity({
        skillId: 'history',
        id: `craft-bestiary-${type}-${volume}`,
        name: `${type.charAt(0).toUpperCase()}${type.slice(1)} Bestiary, Vol. ${roman}`,
        description: `Compile notes on fighting ${type}s.`,
        requiredLevel: level,
        inputs: [stack(trophy, BESTIARY_TROPHY_COSTS[index]), stack('ink')],
        outputs: [drop(bestiaryItemId(type, volume) as ItemId)],
        category: 'Bestiaries',
        group: `${type.charAt(0).toUpperCase()}${type.slice(1)}`,
        sortOrder: volume,
      })
    }),
  )
}

export const historyCraftActivities: ActivityDef[] = [
  ...buildTomeActivities(),
  ...buildNoteActivities(),
  ...buildBestiaryActivities(),
]

export function parseTomeActivityId(
  activityId: string,
): { skillId: Exclude<SkillId, 'history'>; volume: number } | null {
  const match = /^craft-tome-(.+)-(\d+)$/.exec(activityId)
  if (!match) return null
  const skillId = match[1]
  const volume = Number(match[2])
  if (!TOME_SKILLS.includes(skillId as Exclude<SkillId, 'history'>)) return null
  if (!Number.isInteger(volume) || volume < 1 || volume > 10) return null
  return { skillId: skillId as Exclude<SkillId, 'history'>, volume }
}

export function parseNoteItemId(itemId: string): NoteGroupId | null {
  const match = /^notes-(.+)$/.exec(itemId)
  if (!match) return null
  const group = NOTE_GROUPS.find((entry) => entry.id === match[1])
  return group?.id ?? null
}

export function parseTomeItemId(
  itemId: string,
): { skillId: Exclude<SkillId, 'history'>; volume: number } | null {
  const match = /^tome-(.+)-vol-(\d+)$/.exec(itemId)
  if (!match) return null
  const skillId = match[1]
  const volume = Number(match[2])
  if (!TOME_SKILLS.includes(skillId as Exclude<SkillId, 'history'>)) return null
  if (!Number.isInteger(volume) || volume < 1 || volume > 10) return null
  return { skillId: skillId as Exclude<SkillId, 'history'>, volume }
}

export function parseBestiaryItemId(
  itemId: string,
): { type: BestiaryType; volume: number } | null {
  const match = /^bestiary-(.+)-vol-(\d+)$/.exec(itemId)
  if (!match) return null
  const type = match[1]
  const volume = Number(match[2])
  if (!(BESTIARY_TYPES as readonly string[]).includes(type)) return null
  if (!Number.isInteger(volume) || volume < 1 || volume > 3) return null
  return { type: type as BestiaryType, volume }
}
