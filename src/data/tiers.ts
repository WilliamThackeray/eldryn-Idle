export const TIERS = [1, 2, 3, 4, 5] as const
export type Tier = (typeof TIERS)[number]

export interface TierSource {
  id: string
  monsterId: string
  monster: string
  biome: string
  /** 1 means the boss always drops it. */
  chance: number
  boss?: boolean
}

export interface TierRow {
  tier: Tier
  /** Roman numeral. UI badge text. */
  name: string
  label: string
  /** Tailwind text color. Kept as a full class so the scanner keeps it. */
  color: string
  levelMin: number
  levelMax: number
  metal: { name: string; gear: string; ore?: string; bar: string }
  wood: { name: string; id: string }
  leather: { name: string; id: string }
  cloth: { name: string; id: string }
  gem: { name: string; raw: string; cut: string }
  zone: { biome: string; name: string; comingSoon: boolean }
  dungeon: { id: string; name: string; comingSoon: boolean }
  boss: { id: string; name: string }
  /** Best weapon, armor set, and robe set. Gates are null past tier III. */
  best: {
    weapon: string
    weaponName: string
    weaponSkill: string
    weaponGate: string | null
    armor: string
    armorName: string
    armorSkill: string
    armorGate: string | null
    robes: string
    robeName: string
    robeSkill: string
    robeGate: string | null
  }
  sources: TierSource[]
}

export const TIER_TABLE: readonly TierRow[] = [
  {
    tier: 1,
    name: 'I',
    label: 'Tier I',
    color: 'text-sage',
    levelMin: 1,
    levelMax: 15,
    metal: { name: 'Iron', gear: 'iron', ore: 'iron-ore', bar: 'iron-bar' },
    wood: { name: 'Wood', id: 'logs' },
    leather: { name: 'Hide', id: 'hide' },
    cloth: { name: 'Linen', id: 'linen-cloth' },
    gem: { name: 'Quartz', raw: 'raw-quartz', cut: 'cut-quartz' },
    zone: { biome: 'forest', name: 'Forest', comingSoon: false },
    dungeon: { id: 'shifting-thicket', name: 'Shifting Thicket', comingSoon: false },
    boss: { id: 'owlbear', name: 'Owlbear' },
    best: {
      weapon: 'greataxe',
      weaponName: 'Greataxe',
      weaponSkill: 'Smithing',
      weaponGate: 'owlbear-feather',
      armor: 'studded-leather',
      armorName: 'Studded Leather',
      armorSkill: 'Leatherworking',
      armorGate: 'dire-wolf-pelt',
      robes: 'linen',
      robeName: 'Linen',
      robeSkill: 'Weaving',
      robeGate: 'dire-wolf-pelt',
    },
    sources: [
      { id: 'dire-wolf-pelt', monsterId: 'dire-wolf', monster: 'Dire Wolf', biome: 'Forest', chance: 0.5 },
      { id: 'owlbear-feather', monsterId: 'owlbear', monster: 'Owlbear', biome: 'Forest', chance: 1, boss: true },
    ],
  },
  {
    tier: 2,
    name: 'II',
    label: 'Tier II',
    color: 'text-ability-dex',
    levelMin: 15,
    levelMax: 30,
    metal: { name: 'Steel', gear: 'steel', bar: 'steel-bar' },
    wood: { name: 'Hardwood', id: 'hardwood' },
    leather: { name: 'Thick Hide', id: 'thick-hide' },
    cloth: { name: 'Wool', id: 'wool-cloth' },
    gem: { name: 'Amethyst', raw: 'raw-amethyst', cut: 'cut-amethyst' },
    zone: { biome: 'hills', name: 'Hills', comingSoon: false },
    dungeon: { id: 'goblin-warren', name: 'Goblin Warren', comingSoon: false },
    boss: { id: 'hobgoblin-captain', name: 'Hobgoblin Captain' },
    best: {
      weapon: 'steel-greataxe',
      weaponName: 'Steel Greataxe',
      weaponSkill: 'Smithing',
      weaponGate: 'captains-insignia',
      armor: 'steel-chain-mail',
      armorName: 'Steel Chain Mail',
      armorSkill: 'Smithing',
      armorGate: 'ogre-sinew',
      robes: 'wool',
      robeName: 'Wool',
      robeSkill: 'Weaving',
      robeGate: 'bat-guano',
    },
    sources: [
      { id: 'ogre-sinew', monsterId: 'ogre', monster: 'Ogre', biome: 'Hills', chance: 0.45 },
      { id: 'bat-guano', monsterId: 'swarm-of-bats', monster: 'Swarm of Bats', biome: 'Hills', chance: 0.75 },
      {
        id: 'captains-insignia',
        monsterId: 'hobgoblin-captain',
        monster: 'Hobgoblin Captain',
        biome: 'Hills',
        chance: 1,
        boss: true,
      },
    ],
  },
  {
    tier: 3,
    name: 'III',
    label: 'Tier III',
    color: 'text-ability-int',
    levelMin: 30,
    levelMax: 60,
    metal: { name: 'Silvered', gear: 'silvered', ore: 'silver-ore', bar: 'silver-bar' },
    wood: { name: 'Ironwood', id: 'ironwood' },
    leather: { name: 'Croc Leather', id: 'croc-leather' },
    cloth: { name: 'Spider Silk', id: 'silk-cloth' },
    gem: { name: 'Sapphire', raw: 'raw-sapphire', cut: 'cut-sapphire' },
    zone: { biome: 'swamp', name: 'Swamp', comingSoon: false },
    dungeon: { id: 'hag-hollow', name: 'Hag Hollow', comingSoon: false },
    boss: { id: 'green-hag', name: 'Green Hag' },
    best: {
      weapon: 'silvered-greataxe',
      weaponName: 'Silvered Greataxe',
      weaponSkill: 'Smithing',
      weaponGate: 'ghoul-ichor',
      armor: 'silvered-chain-mail',
      armorName: 'Silvered Chain Mail',
      armorSkill: 'Smithing',
      armorGate: 'ghoul-ichor',
      robes: 'silk',
      robeName: 'Silk',
      robeSkill: 'Weaving',
      robeGate: 'hags-eye',
    },
    sources: [
      { id: 'ghoul-ichor', monsterId: 'ghoul', monster: 'Ghoul', biome: 'Swamp', chance: 0.75 },
      { id: 'hags-eye', monsterId: 'green-hag', monster: 'Green Hag', biome: 'Swamp', chance: 1, boss: true },
    ],
  },
  {
    tier: 4,
    name: 'IV',
    label: 'Tier IV',
    color: 'text-rarity-very-rare',
    levelMin: 60,
    levelMax: 80,
    metal: { name: 'Mithral', gear: 'mithral', ore: 'mithral-ore', bar: 'mithral-bar' },
    wood: { name: 'Shadowtimber', id: 'shadowtimber' },
    leather: { name: 'Rothé Hide', id: 'rothe-hide' },
    cloth: { name: 'Shadowsilk', id: 'shadowsilk' },
    gem: { name: 'Emerald', raw: 'raw-emerald', cut: 'cut-emerald' },
    zone: { biome: 'underdark', name: 'Underdark', comingSoon: true },
    dungeon: { id: 'deepvault', name: 'Deepvault', comingSoon: true },
    boss: { id: 'roper', name: 'Roper' },
    best: {
      weapon: 'mithral-greataxe',
      weaponName: 'Mithral Greataxe',
      weaponSkill: 'Smithing',
      weaponGate: null,
      armor: 'mithral-chain-mail',
      armorName: 'Mithral Chain Mail',
      armorSkill: 'Smithing',
      armorGate: null,
      robes: 'shadowsilk',
      robeName: 'Shadowsilk',
      robeSkill: 'Weaving',
      robeGate: null,
    },
    sources: [
      { id: 'phase-spider-silk', monsterId: 'phase-spider', monster: 'Phase Spider', biome: 'Underdark', chance: 0.4 },
      { id: 'hook-horror-plate', monsterId: 'hook-horror', monster: 'Hook Horror', biome: 'Underdark', chance: 1, boss: true },
    ],
  },
  {
    tier: 5,
    name: 'V',
    label: 'Tier V',
    color: 'text-gold',
    levelMin: 80,
    levelMax: 99,
    metal: { name: 'Adamantine', gear: 'adamantine', ore: 'adamantine-ore', bar: 'adamantine-bar' },
    wood: { name: 'Elderwood', id: 'elderwood' },
    leather: { name: 'Dragonhide', id: 'dragonhide' },
    cloth: { name: 'Starweave', id: 'starweave' },
    gem: { name: 'Diamond', raw: 'raw-diamond', cut: 'cut-diamond' },
    zone: { biome: 'mountains', name: 'Mountains', comingSoon: true },
    dungeon: { id: 'dragons-roost', name: "Dragon's Roost", comingSoon: true },
    boss: { id: 'adult-red-dragon', name: 'Adult Red Dragon' },
    best: {
      weapon: 'adamantine-greataxe',
      weaponName: 'Adamantine Greataxe',
      weaponSkill: 'Smithing',
      weaponGate: null,
      armor: 'adamantine-chain-mail',
      armorName: 'Adamantine Chain Mail',
      armorSkill: 'Smithing',
      armorGate: null,
      robes: 'starweave',
      robeName: 'Starweave',
      robeSkill: 'Weaving',
      robeGate: null,
    },
    sources: [
      { id: 'dragon-scale', monsterId: 'adult-red-dragon', monster: 'Adult Red Dragon', biome: 'Mountains', chance: 1, boss: true },
      { id: 'wyvern-stinger', monsterId: 'wyvern', monster: 'Wyvern', biome: 'Mountains', chance: 0.4 },
    ],
  },
]

const GEAR_TIER: Record<string, Tier> = {
  iron: 1,
  steel: 2,
  silvered: 3,
  mithral: 4,
  adamantine: 5,
}

const SET_TIER: Record<string, Tier> = {
  padded: 1,
  linen: 1,
  leather: 1,
  'studded-leather': 1,
  minstrel: 1,
  wildweave: 1,
  wool: 2,
  hide: 2,
  arcane: 2,
  silk: 3,
  vestment: 3,
  croc: 3,
  shadowsilk: 4,
  rothe: 4,
  starweave: 5,
  dragonhide: 5,
}

const PIECE = /-(helmet|chest|chaps|gauntlets|boots)$/

function materialTierMap(): Map<string, Tier> {
  const map = new Map<string, Tier>()
  for (const row of TIER_TABLE) {
    if (row.metal.ore) map.set(row.metal.ore, row.tier)
    map.set(row.metal.bar, row.tier)
    map.set(row.wood.id, row.tier)
    map.set(row.leather.id, row.tier)
    map.set(row.cloth.id, row.tier)
    map.set(row.gem.raw, row.tier)
    map.set(row.gem.cut, row.tier)
    for (const source of row.sources) map.set(source.id, row.tier)
  }
  const fibers: [string, Tier][] = [
    ['flax', 1],
    ['linen-thread', 1],
    ['wool', 2],
    ['wool-yarn', 2],
    ['spider-silk', 3],
    ['silk-thread', 3],
  ]
  for (const [id, tier] of fibers) map.set(id, tier)
  return map
}

const MATERIAL_TIER = materialTierMap()

const EXTRA_TIER: Record<string, Tier> = {
  'croc-cloak': 3,
  'rothe-cloak': 4,
  'dragonhide-cloak': 5,
}

export function tierRow(tier: Tier): TierRow {
  const row = TIER_TABLE.find((entry) => entry.tier === tier)
  if (!row) throw new Error(`missing tier ${tier}`)
  return row
}

export function tierForBiome(biome: string): TierRow | undefined {
  return TIER_TABLE.find((row) => row.zone.biome === biome)
}

export function tierForDungeon(dungeonId: string): TierRow | undefined {
  return TIER_TABLE.find((row) => row.dungeon.id === dungeonId)
}

/** Tier of an item. Gear uses its metal when it has one; other ids use the spine table. */
export function itemTier(item: { id: string; tier?: Tier; gear?: { material?: string } } | undefined): Tier | null {
  if (!item) return null
  if (item.tier) return item.tier
  const metal = item.gear?.material
  if (metal && GEAR_TIER[metal]) return GEAR_TIER[metal]
  const listed = MATERIAL_TIER.get(item.id)
  if (listed) return listed
  if (EXTRA_TIER[item.id]) return EXTRA_TIER[item.id]
  const set = item.id.replace(PIECE, '')
  if (set !== item.id && SET_TIER[set]) return SET_TIER[set]
  return null
}

export function monsterTier(monster: { tier?: Tier; biomes: readonly string[] }): Tier | null {
  if (monster.tier) return monster.tier
  for (const biome of monster.biomes) {
    const row = tierForBiome(biome)
    if (row) return row.tier
  }
  return null
}

/** Combat material the best recipe for this output consumes, if it is a gated piece. */
export function combatGateFor(itemId: string): string | null {
  for (const row of TIER_TABLE) {
    if (row.tier > 3) continue
    if (itemId === row.best.weapon) return row.best.weaponGate
    const set = itemId.replace(PIECE, '')
    if (set === itemId) continue
    if (set === row.best.armor) return row.best.armorGate
    if (set === row.best.robes) return row.best.robeGate
  }
  return null
}

export function dropsFor(materialId: string): { name: string; skill: string }[] {
  const out: { name: string; skill: string }[] = []
  for (const row of TIER_TABLE) {
    if (row.tier > 3) continue
    if (row.best.armorGate === materialId) out.push({ name: row.best.armorName, skill: row.best.armorSkill })
    if (row.best.robeGate === materialId) out.push({ name: row.best.robeName, skill: row.best.robeSkill })
    if (row.best.weaponGate === materialId) out.push({ name: row.best.weaponName, skill: row.best.weaponSkill })
  }
  return out
}

export function obtainedFrom(materialId: string): { monster: string; biome: string } | null {
  for (const row of TIER_TABLE) {
    const source = row.sources.find((entry) => entry.id === materialId)
    if (source) return { monster: source.monster, biome: source.biome }
  }
  return null
}

export function bestPieceIds(row: TierRow): string[] {
  const slots = ['helmet', 'chest', 'chaps', 'gauntlets', 'boots']
  return [row.best.weapon, ...slots.map((slot) => `${row.best.armor}-${slot}`), ...slots.map((slot) => `${row.best.robes}-${slot}`)]
}

/** Spell level 2 drops in tiers I–II, level 3 in II–III, and so on, clamped to I–V. */
export function tiersForSpellLevel(level: number): Tier[] {
  if (level < 2) return []
  const low = Math.min(5, Math.max(1, level - 1)) as Tier
  const high = Math.min(5, level) as Tier
  return low === high ? [low] : [low, high]
}
