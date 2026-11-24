import {
  ARMOR_QUALITY_AC,
  EXCEPTIONAL_ARMOR_RESIST,
  EXCEPTIONAL_SWIFT_SPEED_PCT,
  FOOD_QUALITY_MULT,
  JEWELRY_QUALITY_MULT,
  PIERCING_SHOT_AC,
  POTION_QUALITY_MULT,
  QUALITY_SELL_MULTIPLIER,
  REAGENT_SAVE_CHANCE,
  SKILLING_QUALITY_MULT,
  WEAPON_QUALITY_BONUS,
} from '../../engine/config'
import type { ItemDef, ItemStats, QualityKind, WeaponGear } from './types'

export const ITEM_QUALITIES = ['standard', 'fine', 'masterwork', 'exceptional'] as const
export type ItemQuality = (typeof ITEM_QUALITIES)[number]

const QUALITY_LABEL: Record<Exclude<ItemQuality, 'standard'>, string> = {
  fine: 'Fine',
  masterwork: 'Masterwork',
  exceptional: 'Exceptional',
}

let catalogHas: (id: string) => boolean = () => false

/** Called once the item catalog map exists. Avoids a cycle with getItem. */
export function bindItemCatalog(has: (id: string) => boolean) {
  catalogHas = has
}

export interface ParsedItemId {
  stem: string
  quality: ItemQuality
  enchant: number
}

/** `@quality` and `+N` in either order. `longsword+1` is stem longsword, enchant 1. */
export function parseItemId(id: string): ParsedItemId {
  const both = /^(.*)@(fine|masterwork|exceptional)\+(\d+)$/.exec(id)
  if (both) return { stem: both[1], quality: both[2] as ItemQuality, enchant: Number(both[3]) }
  const flipped = /^(.*)\+(\d+)@(fine|masterwork|exceptional)$/.exec(id)
  if (flipped) return { stem: flipped[1], quality: flipped[3] as ItemQuality, enchant: Number(flipped[2]) }
  const qualityOnly = /^(.*)@(fine|masterwork|exceptional)$/.exec(id)
  if (qualityOnly) return { stem: qualityOnly[1], quality: qualityOnly[2] as ItemQuality, enchant: 0 }
  const enchantOnly = /^(.*)\+(\d+)$/.exec(id)
  if (enchantOnly) return { stem: enchantOnly[1], quality: 'standard', enchant: Number(enchantOnly[2]) }
  return { stem: id, quality: 'standard', enchant: 0 }
}

/** Catalog id, including an authored `+N` such as `longsword+1`. */
export function baseItemId(id: string): string {
  if (catalogHas(id)) return id
  const parsed = parseItemId(id)
  if (parsed.enchant > 0 && catalogHas(`${parsed.stem}+${parsed.enchant}`)) {
    return `${parsed.stem}+${parsed.enchant}`
  }
  return parsed.stem
}

export function qualityOf(id: string): ItemQuality {
  if (catalogHas(id)) return 'standard'
  return parseItemId(id).quality
}

export function withQuality(id: string, quality: ItemQuality): string {
  const base = baseItemId(id)
  const enchant = /\+(\d+)$/.exec(base)
  if (!enchant) return quality === 'standard' ? base : `${base}@${quality}`
  const stem = base.slice(0, -enchant[0].length)
  if (quality === 'standard') return base
  return `${stem}@${quality}${enchant[0]}`
}

export function qualityLabel(quality: ItemQuality): string | null {
  if (quality === 'standard') return null
  return QUALITY_LABEL[quality]
}

export function qualityKindOf(def: ItemDef | undefined): QualityKind {
  if (!def) return 'none'
  if (def.qualityKind) return def.qualityKind
  if (def.tags?.includes('skilling')) return 'skilling-gear'
  if (def.tags?.includes('jewelry') || def.gear?.slot === 'ring' || def.gear?.slot === 'necklace') {
    return 'jewelry'
  }
  if (def.gear?.weapon) return 'gear-weapon'
  if (def.gear?.armor || def.gear?.shield) return 'gear-armor'
  if (def.category === 'potion') return 'potion'
  if (def.category === 'food' && def.heal != null) return 'food'
  if (def.tags?.includes('reagent') || def.category === 'component') return 'reagent'
  return 'none'
}

/** Crafted outputs become a quality item. Gathered goods and materials only multiply yield. */
export function stampsQualityItem(hasInputs: boolean, def: ItemDef | undefined): boolean {
  if (!hasInputs) return false
  return qualityKindOf(def) !== 'none'
}

/** Ranged, then light, then blunt, else blade. A light club is Swift, not Brutal. */
export function weaponFamily(weapon: WeaponGear): 'ranged' | 'light' | 'blunt' | 'blade' {
  if (weapon.range === 'ranged' || weapon.properties.includes('ammunition')) return 'ranged'
  if (weapon.properties.includes('light')) return 'light'
  if (weapon.damageType === 'bludgeoning') return 'blunt'
  return 'blade'
}

function scaleMap(
  map: Partial<Record<string, number>> | undefined,
  mult: number,
): Partial<Record<string, number>> | undefined {
  if (!map) return map
  const next: Partial<Record<string, number>> = {}
  for (const [key, value] of Object.entries(map)) {
    if (value == null) continue
    if (mult === 1) next[key] = value
    else next[key] = Math.max(1, Math.floor(value * mult))
  }
  return next
}

function scaleStats(stats: ItemStats | undefined, mult: number): ItemStats | undefined {
  if (!stats || mult === 1) return stats
  const round = (value: number | undefined) => (value == null ? undefined : value * mult)
  return {
    ...stats,
    toHit: round(stats.toHit),
    damage: round(stats.damage),
    ac: round(stats.ac),
    saveBonus: round(stats.saveBonus),
    maxHp: round(stats.maxHp),
    spellAttack: round(stats.spellAttack),
    spellSaveDc: round(stats.spellSaveDc),
    skillXpPct: scaleMap(stats.skillXpPct, mult),
    skillSpeedPct: scaleMap(stats.skillSpeedPct, mult),
    skillCheck: scaleMap(stats.skillCheck, mult),
  }
}

function cloneDef(def: ItemDef): ItemDef {
  return {
    ...def,
    tags: def.tags ? [...def.tags] : undefined,
    gear: def.gear
      ? {
          ...def.gear,
          weapon: def.gear.weapon
            ? { ...def.gear.weapon, properties: [...def.gear.weapon.properties] }
            : undefined,
          armor: def.gear.armor ? { ...def.gear.armor } : undefined,
          stats: def.gear.stats
            ? {
                ...def.gear.stats,
                resistances: def.gear.stats.resistances ? [...def.gear.stats.resistances] : undefined,
                skillCheck: def.gear.stats.skillCheck ? { ...def.gear.stats.skillCheck } : undefined,
                skillXpPct: def.gear.stats.skillXpPct ? { ...def.gear.stats.skillXpPct } : undefined,
                skillSpeedPct: def.gear.stats.skillSpeedPct ? { ...def.gear.stats.skillSpeedPct } : undefined,
              }
            : undefined,
          rider: def.gear.rider ? { ...def.gear.rider } : undefined,
          summon: def.gear.summon ? { ...def.gear.summon } : undefined,
        }
      : undefined,
  }
}

export function applyQuality(def: ItemDef, id: string): ItemDef {
  const parsed = parseItemId(id)
  const quality = catalogHas(id) ? 'standard' : parsed.quality
  const catalogEnchanted = parsed.enchant > 0 && catalogHas(`${parsed.stem}+${parsed.enchant}`)
  const enchantExtra = catalogEnchanted ? 0 : parsed.enchant
  if (quality === 'standard' && enchantExtra === 0) return def

  const next = cloneDef(def)
  next.id = id
  if (quality !== 'standard') next.name = `${QUALITY_LABEL[quality]} ${next.name}`
  next.sellValue = Math.max(1, Math.floor(next.sellValue * QUALITY_SELL_MULTIPLIER[quality]))
  if (enchantExtra > 0 && next.gear) next.gear = { ...next.gear, magicBonus: next.gear.magicBonus + enchantExtra }

  const kind = qualityKindOf(def)
  if (kind === 'gear-weapon' && next.gear?.weapon) {
    const bonus = WEAPON_QUALITY_BONUS[quality]
    const stats: ItemStats = { ...next.gear.stats, toHit: (next.gear.stats?.toHit ?? 0) + bonus, damage: (next.gear.stats?.damage ?? 0) + bonus }
    if (quality === 'exceptional') {
      const family = weaponFamily(next.gear.weapon)
      if (family === 'blade') stats.critRange = (stats.critRange ?? 0) + 1
      if (family === 'blunt') stats.critDiceBonus = (stats.critDiceBonus ?? 0) + 1
      if (family === 'light') stats.attackSpeedPct = (stats.attackSpeedPct ?? 0) + EXCEPTIONAL_SWIFT_SPEED_PCT
      if (family === 'ranged') stats.ignoreAc = (stats.ignoreAc ?? 0) + PIERCING_SHOT_AC
    }
    next.gear = { ...next.gear, stats }
  }

  if (kind === 'gear-armor' && next.gear) {
    if (next.gear.shield && !next.gear.armor) {
      const stats = next.gear.stats ?? {}
      next.gear = { ...next.gear, stats: { ...stats, ac: (stats.ac ?? 0) + ARMOR_QUALITY_AC[quality] } }
    }
    if (quality === 'exceptional' && next.gear.armor) {
      const resist = EXCEPTIONAL_ARMOR_RESIST[next.gear.armor.weightClass]
      const stats = next.gear.stats ?? {}
      const have = stats.resistances ?? []
      next.gear = {
        ...next.gear,
        stats: { ...stats, resistances: have.includes(resist) ? have : [...have, resist] },
      }
    }
  }

  if (kind === 'jewelry' && next.gear) {
    next.gear = { ...next.gear, stats: scaleStats(next.gear.stats, JEWELRY_QUALITY_MULT[quality]) }
  }

  if (kind === 'food' && next.heal != null) {
    next.heal = Math.round(next.heal * FOOD_QUALITY_MULT[quality])
  }

  if (kind === 'potion') {
    next.potency = (next.potency ?? 1) * POTION_QUALITY_MULT[quality]
  }

  if (kind === 'skilling-gear' && next.gear) {
    next.gear = { ...next.gear, stats: scaleStats(next.gear.stats, SKILLING_QUALITY_MULT[quality]) }
  }

  return next
}

export function reagentSaveChance(id: string): number {
  const kind = qualityKindOf(catalogDef(id))
  if (kind !== 'reagent') return 0
  return REAGENT_SAVE_CHANCE[qualityOf(id)]
}

function catalogDef(id: string): ItemDef | undefined {
  return catalogLookup?.(baseItemId(id))
}

let catalogLookup: ((id: string) => ItemDef | undefined) | undefined

export function bindItemLookup(lookup: (id: string) => ItemDef | undefined) {
  catalogLookup = lookup
}
