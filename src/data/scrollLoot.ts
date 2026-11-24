import type { LootEntry } from './activities/types'
import type { ItemId } from './items'
import { spellScrollId } from './items/scrolls'
import { SPELLS } from './spells'
import { TIER_TABLE, tiersForSpellLevel, type Tier } from './tiers'

function entry(spellId: string, chance: number): LootEntry {
  return { itemId: spellScrollId(spellId) as ItemId, chance, min: 1, max: 1 }
}

/** Level 2+ scrolls that drop in this tier. Cantrips and 1st-level scrolls are scribed. */
export function scrollDropsForTier(tier: Tier): LootEntry[] {
  return SPELLS.filter((spell) => tiersForSpellLevel(spell.level).includes(tier)).map((spell) =>
    entry(spell.id, 0.2),
  )
}

/** Bosses always drop one scroll of the lowest spell level that tier can drop. */
export function bossScrollDrop(monsterId: string): LootEntry | null {
  const row = TIER_TABLE.find((entry) => entry.boss.id === monsterId)
  if (!row || row.zone.comingSoon) return null
  const spell = SPELLS.find((candidate) => candidate.level >= 2 && tiersForSpellLevel(candidate.level).includes(row.tier))
  return spell ? entry(spell.id, 1) : null
}

const SCROLL_CARRIERS = new Set([
  'dire-wolf',
  'owlbear',
  'ogre',
  'hobgoblin-captain',
  'swarm-of-bats',
  'ghoul',
  'green-hag',
  'goblin-warrior',
  'crocodile',
])

export function scrollLootForMonster(monsterId: string, tier: Tier | null): LootEntry[] {
  if (tier == null || !SCROLL_CARRIERS.has(monsterId)) return []
  const drops = scrollDropsForTier(tier)
  const boss = bossScrollDrop(monsterId)
  return boss ? [...drops.filter((drop) => drop.itemId !== boss.itemId), boss] : drops
}
