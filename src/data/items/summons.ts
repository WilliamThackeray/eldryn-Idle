import type { ItemDef } from './types'

function summon(
  id: string,
  name: string,
  description: string,
  sellValue: number,
  stats: { hp: number; ac: number; toHit: number; damage: string; intervalMs: number },
  tags: string[],
): ItemDef {
  return {
    id,
    name,
    description,
    category: 'gear',
    rarity: 'uncommon',
    stackable: true,
    sellValue,
    tags: ['summon', ...tags],
    gear: {
      slot: 'summon',
      magicBonus: 0,
      summon: stats,
    },
  }
}

export const SUMMONS = [
  summon(
    'familiar-spark',
    'Familiar Spark',
    'A weak spark bound as a familiar. Fills a summon slot.',
    8,
    { hp: 4, ac: 10, toHit: 2, damage: '1d4', intervalMs: 6000 },
    [],
  ),
  summon(
    'bound-wolf',
    'Bound Wolf',
    'A wolf bound by pact. Fills a summon slot.',
    20,
    { hp: 10, ac: 12, toHit: 3, damage: '1d4+1', intervalMs: 6000 },
    [],
  ),
  summon(
    'bound-hawk',
    'Bound Hawk',
    'A hawk bound by pact. Fills a summon slot.',
    18,
    { hp: 6, ac: 13, toHit: 4, damage: '1d4', intervalMs: 4000 },
    ['piercing'],
  ),
  summon(
    'bound-boar',
    'Bound Boar',
    'A boar bound by pact. Fills a summon slot.',
    28,
    { hp: 16, ac: 11, toHit: 3, damage: '1d6+1', intervalMs: 8000 },
    [],
  ),
  summon(
    'minor-fire-elemental',
    'Minor Fire Elemental',
    'A conjured spark of fire. Fills a summon slot.',
    35,
    { hp: 12, ac: 12, toHit: 4, damage: '1d6', intervalMs: 6000 },
    ['fire'],
  ),
  summon(
    'minor-earth-elemental',
    'Minor Earth Elemental',
    'A conjured mote of earth. Fills a summon slot.',
    35,
    { hp: 18, ac: 14, toHit: 3, damage: '1d6', intervalMs: 7000 },
    ['earth'],
  ),
  summon(
    'skeleton-servitor',
    'Skeleton Servitor',
    'Bones and ichor bound into a servitor. Fills a summon slot.',
    40,
    { hp: 14, ac: 13, toHit: 4, damage: '1d6', intervalMs: 6000 },
    ['undead', 'piercing'],
  ),
  summon(
    'shade',
    'Shade',
    'A bound shadow. Fills a summon slot.',
    50,
    { hp: 12, ac: 14, toHit: 5, damage: '1d6', intervalMs: 5500 },
    ['shadow'],
  ),
] as const satisfies readonly ItemDef[]
