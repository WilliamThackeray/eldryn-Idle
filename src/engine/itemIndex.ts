import { ACTIVITIES } from '../data/activities'
import { CLASSES, TRADITION_REAGENT } from '../data/classes'
import { DUNGEONS } from '../data/dungeons'
import type { ItemId } from '../data/items'
import { MONSTERS } from '../data/monsters'
import { QUESTS } from '../data/quests'
import { GENERAL_GOODS } from '../data/shop'
import { SPELLS } from '../data/spells'
import type { TradeSkillId } from '../data/skills'

export type ItemLink =
  | { kind: 'activity'; skillId: TradeSkillId; activityId: string; label: string }
  | { kind: 'monster'; monsterId: string; label: string }
  | { kind: 'dungeon'; dungeonId: string; label: string }
  | { kind: 'quest'; questId: string; label: string }
  | { kind: 'shop'; itemId: ItemId; label: string }
  | { kind: 'spell'; spellId: string; label: string }
  | { kind: 'combat'; label: string }

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
    if (dungeon.entry) push(uses, dungeon.entry.itemId, link)
    for (const room of dungeon.rooms ?? []) {
      if (room.kind === 'secret') {
        for (const entry of room.lootTable) push(sources, entry.itemId, link)
      }
      if (room.kind === 'trap' || room.kind === 'secret') {
        push(uses, 'inspiration', link)
      }
    }
  }

  for (const quest of QUESTS) {
    const link: ItemLink = { kind: 'quest', questId: quest.id, label: quest.title }
    for (const stack of quest.prerequisites.items ?? []) push(uses, stack.itemId, link)
    for (const stage of quest.stages) {
      if ('objectives' in stage) {
        for (const obj of stage.objectives) {
          if (obj.type === 'have' || obj.type === 'deliver') push(uses, obj.itemId, link)
        }
      } else {
        for (const approach of stage.check.approaches) {
          if (approach.prep) push(uses, approach.prep.itemId, link)
        }
      }
    }
  }

  for (const listing of GENERAL_GOODS) {
    push(sources, listing.itemId, {
      kind: 'shop',
      itemId: listing.itemId,
      label: 'Shop',
    })
  }

  push(uses, 'trade-contract', {
    kind: 'activity',
    skillId: 'commerce',
    activityId: 'haggle',
    label: 'Haggle at Market',
  })
  push(uses, 'letter-of-introduction', {
    kind: 'activity',
    skillId: 'commerce',
    activityId: 'petition-guilds',
    label: 'Petition the Guilds',
  })
  push(uses, 'rumor', {
    kind: 'activity',
    skillId: 'commerce',
    activityId: 'tavern-gossip',
    label: 'Tavern Gossip',
  })
  push(uses, 'disguise-kit', {
    kind: 'activity',
    skillId: 'thievery',
    activityId: 'merchant-warehouse',
    label: 'Merchant Warehouse',
  })
  push(uses, 'forged-writ', {
    kind: 'activity',
    skillId: 'thievery',
    activityId: 'forgery-papers',
    label: 'Forge Travel Papers',
  })
  push(uses, 'false-papers', {
    kind: 'activity',
    skillId: 'thievery',
    activityId: 'forgery-papers',
    label: 'Forge Travel Papers',
  })
  push(uses, 'inspiration', {
    kind: 'activity',
    skillId: 'performance',
    activityId: 'local-music',
    label: 'Local Music',
  })
  push(uses, 'bounty-contract', { kind: 'combat', label: 'Bounties' })
  push(uses, 'menace-trophy', { kind: 'combat', label: 'Frighten' })
  push(uses, 'intel', { kind: 'combat', label: 'Damage by creature type' })

  for (const spell of SPELLS) {
    const link: ItemLink = { kind: 'spell', spellId: spell.id, label: spell.name }
    if (spell.level === 0) {
      const traditions = new Set(
        CLASSES.filter(
          (cls) =>
            cls.spellcasting.casterType !== 'none' &&
            (spell.classes as readonly string[]).includes(cls.id),
        ).map((cls) =>
          cls.spellcasting.casterType === 'none' ? null : TRADITION_REAGENT[cls.spellcasting.tradition],
        ),
      )
      for (const reagent of traditions) {
        if (reagent) push(uses, reagent, link)
      }
      continue
    }
    for (const stack of spell.components) push(uses, stack.itemId, link)
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
