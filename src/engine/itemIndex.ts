import { ACTIVITIES } from '../data/activities'
import { DUNGEONS } from '../data/dungeons'
import type { ItemId } from '../data/items'
import { MONSTERS } from '../data/monsters'
import { QUESTS } from '../data/quests'
import { GENERAL_GOODS } from '../data/shop'
import { SPELLS } from '../data/spells'
import type { SkillId } from '../data/skills'
import { componentBagId } from './spells'

export type ItemLink =
  | { kind: 'activity'; skillId: SkillId; activityId: string; label: string }
  | { kind: 'monster'; monsterId: string; label: string }
  | { kind: 'dungeon'; dungeonId: string; label: string }
  | { kind: 'quest'; questId: string; label: string }
  | { kind: 'shop'; itemId: ItemId; label: string }
  | { kind: 'spell'; spellId: string; label: string }

interface ItemIndex {
  sources: Map<ItemId, ItemLink[]>
  uses: Map<ItemId, ItemLink[]>
}

let cached: ItemIndex | null = null

function push(map: Map<ItemId, ItemLink[]>, itemId: ItemId, link: ItemLink) {
  const list = map.get(itemId) ?? []
  if (
    list.some(
      (entry) =>
        entry.kind === link.kind &&
        JSON.stringify(entry) === JSON.stringify(link),
    )
  ) {
    return
  }
  list.push(link)
  map.set(itemId, list)
}

function buildIndex(): ItemIndex {
  const sources = new Map<ItemId, ItemLink[]>()
  const uses = new Map<ItemId, ItemLink[]>()

  for (const activity of ACTIVITIES) {
    const link: ItemLink = {
      kind: 'activity',
      skillId: activity.skillId,
      activityId: activity.id,
      label: activity.name,
    }
    for (const stack of activity.inputs ?? []) push(uses, stack.itemId, link)
    for (const table of [activity.outputs, activity.rareTable, activity.byproducts]) {
      for (const entry of table ?? []) push(sources, entry.itemId, link)
    }
  }

  for (const monster of MONSTERS) {
    const link: ItemLink = { kind: 'monster', monsterId: monster.id, label: monster.name }
    for (const entry of monster.lootTable) push(sources, entry.itemId, link)
  }

  for (const dungeon of DUNGEONS) {
    const link: ItemLink = { kind: 'dungeon', dungeonId: dungeon.id, label: dungeon.name }
    for (const entry of dungeon.chest) push(sources, entry.itemId, link)
    if (dungeon.entryItemId) push(uses, dungeon.entryItemId, link)
    for (const room of dungeon.rooms ?? []) {
      if (room.kind === 'secret') {
        for (const entry of room.lootTable) push(sources, entry.itemId, link)
      }
    }
  }

  for (const quest of QUESTS) {
    const link: ItemLink = { kind: 'quest', questId: quest.id, label: quest.title }
    if (quest.unlock.type === 'item') push(uses, quest.unlock.itemId, link)
    for (const step of quest.steps) {
      if (step.type === 'deliver') push(uses, step.itemId, link)
    }
  }

  for (const listing of GENERAL_GOODS) {
    push(sources, listing.itemId, {
      kind: 'shop',
      itemId: listing.itemId,
      label: 'Shop',
    })
  }

  for (const spell of SPELLS) {
    if (spell.level === 0 || spell.componentTier == null) continue
    const bagId = componentBagId(spell.componentTier)
    push(uses, bagId as ItemId, {
      kind: 'spell',
      spellId: spell.id,
      label: spell.name,
    })
  }

  return { sources, uses }
}

function index(): ItemIndex {
  if (!cached) cached = buildIndex()
  return cached
}

export function sourcesOf(itemId: ItemId): ItemLink[] {
  return index().sources.get(itemId) ?? []
}

export function usesOf(itemId: ItemId): ItemLink[] {
  return index().uses.get(itemId) ?? []
}
