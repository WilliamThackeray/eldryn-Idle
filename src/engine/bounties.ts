import { BOUNTY_EPITHETS, BOUNTY_REWARD_TABLE, getTitle, LODGE_OFFERS, type LodgeOffer } from '../data/lodge'
import { HUNT_BIOMES, MONSTERS, type BiomeId } from '../data/monsters'
import { tierForBiome, type Tier } from '../data/tiers'
import { addItems, type Inventory } from './inventory'
import type { Rng } from './rng'
import {
  BOUNTY_ACTIVE_MAX,
  BOUNTY_BOARD_SLOTS,
  BOUNTY_CULL_MARKS,
  BOUNTY_CULL_MAX,
  BOUNTY_CULL_MIN,
  BOUNTY_HUNT_MARKS,
  BOUNTY_MARKS_PER_MOD,
  BOUNTY_REFRESH_MS,
  RENOWN_MARKS,
} from './config'
import { MONSTER_MOD_IDS, type MonsterModId } from './combat/monsterMods'

export type ContractKind = 'cull' | 'bounty'
export type FightKind = 'hunt' | 'lair' | 'bounty'

export type RewardRoll =
  | { kind: 'item'; itemId: string; qty: number }
  | { kind: 'title'; titleId: string }
  | { kind: 'bait' }
  | { kind: 'none' }

export interface ActiveContract {
  id: string
  kind: ContractKind
  monsterId: string
  biome: BiomeId
  tier: Tier
  marks: number
  need: number
  have: number
  name: string
  modifiers: MonsterModId[]
  reward: RewardRoll
}

export interface BountyBoard {
  refreshedAt: number
  offers: ActiveContract[]
  baitBiome: BiomeId | null
  baitCharges: number
}

export interface BountyPayout {
  marks: number
  titles: string[]
  bait: boolean
}

export function emptyBountyBoard(now = 0): BountyBoard {
  return { refreshedAt: now, offers: [], baitBiome: null, baitCharges: 0 }
}

export function emptyPayout(): BountyPayout {
  return { marks: 0, titles: [], bait: false }
}

/** Rank 0 until the first threshold. Spending Marks does not lower this. */
export function renownRank(marksLifetime: number): number {
  let rank = 0
  for (let i = 0; i < RENOWN_MARKS.length; i++) {
    if (marksLifetime >= RENOWN_MARKS[i]!) rank = i + 1
  }
  return rank
}

export function renownProgress(marksLifetime: number): {
  rank: number
  current: number
  next: number | null
  into: number
  span: number
} {
  const rank = renownRank(marksLifetime)
  const current = rank === 0 ? 0 : RENOWN_MARKS[rank - 1]!
  const next = rank >= RENOWN_MARKS.length ? null : RENOWN_MARKS[rank]!
  const into = Math.max(0, marksLifetime - current)
  const span = next == null ? 0 : next - current
  return { rank, current, next, into, span }
}

export function boardSlotCount(extraBoard: boolean): number {
  return BOUNTY_BOARD_SLOTS + (extraBoard ? 1 : 0)
}

export function activeContractMax(extraActive: boolean): number {
  return BOUNTY_ACTIVE_MAX + (extraActive ? 1 : 0)
}

/** Zones the player can hunt. Coming-soon biomes stay off the board. */
export function unlockedHuntBiomes(): BiomeId[] {
  return HUNT_BIOMES.filter((id) => !tierForBiome(id)?.zone.comingSoon)
}

function pool(biomes: readonly BiomeId[]) {
  const allowed = new Set(biomes)
  return MONSTERS.filter(
    (monster) =>
      !monster.lairOnly &&
      !monster.rare &&
      monster.biomes.some((biome) => allowed.has(biome) && biome !== 'quest'),
  )
}

function pick<T>(rng: Rng, list: readonly T[]): T | undefined {
  if (!list.length) return undefined
  return list[Math.floor(rng() * list.length)]
}

function rollInt(rng: Rng, min: number, max: number): number {
  const span = Math.max(0, max - min)
  return min + Math.floor(rng() * (span + 1))
}

function rollReward(rng: Rng): RewardRoll {
  const total = BOUNTY_REWARD_TABLE.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = rng() * total
  for (const entry of BOUNTY_REWARD_TABLE) {
    roll -= entry.weight
    if (roll < 0) {
      if (entry.kind === 'item') return { kind: 'item', itemId: entry.itemId, qty: entry.qty }
      if (entry.kind === 'title') return { kind: 'title', titleId: entry.titleId }
      return { kind: 'bait' }
    }
  }
  return { kind: 'none' }
}

function rollModifiers(rng: Rng): MonsterModId[] {
  const count = rng() < 0.5 ? 1 : 2
  const bag = [...MONSTER_MOD_IDS]
  const picked: MonsterModId[] = []
  for (let i = 0; i < count && bag.length; i++) {
    const index = Math.floor(rng() * bag.length)
    const mod = bag.splice(index, 1)[0]
    if (mod) picked.push(mod)
  }
  return picked
}

function makeOffer(
  rng: Rng,
  kind: ContractKind,
  biome: BiomeId,
  index: number,
): ActiveContract | null {
  const monsters = pool([biome]).filter((monster) => monster.biomes.includes(biome))
  const monster = pick(rng, monsters)
  const tier = tierForBiome(biome)?.tier
  if (!monster || !tier) return null
  if (kind === 'cull') {
    return {
      id: `cull-${monster.id}-${index}-${Math.floor(rng() * 1e9)}`,
      kind,
      monsterId: monster.id,
      biome,
      tier,
      marks: BOUNTY_CULL_MARKS[tier],
      need: rollInt(rng, BOUNTY_CULL_MIN[tier], BOUNTY_CULL_MAX[tier]),
      have: 0,
      name: '',
      modifiers: [],
      reward: { kind: 'none' },
    }
  }
  const modifiers = rollModifiers(rng)
  const epithet = pick(rng, BOUNTY_EPITHETS) ?? 'Grimfang'
  return {
    id: `bounty-${monster.id}-${index}-${Math.floor(rng() * 1e9)}`,
    kind,
    monsterId: monster.id,
    biome,
    tier,
    marks: BOUNTY_HUNT_MARKS[tier] + modifiers.length * BOUNTY_MARKS_PER_MOD,
    need: 1,
    have: 0,
    name: `${epithet}, the ${monster.name}`,
    modifiers,
    reward: rollReward(rng),
  }
}

export function generateOffers(
  rng: Rng,
  unlocked: readonly BiomeId[],
  slots: number,
  baitBiome: BiomeId | null,
): { offers: ActiveContract[]; baitBiome: BiomeId | null } {
  const biomes = unlocked.filter((id) => pool([id]).some((monster) => monster.biomes.includes(id)))
  const offers: ActiveContract[] = []
  let bait = baitBiome && biomes.includes(baitBiome) ? baitBiome : baitBiome
  for (let i = 0; i < slots; i++) {
    const kind: ContractKind = rng() < 0.5 ? 'cull' : 'bounty'
    const biome = kind === 'bounty' && bait && biomes.includes(bait) ? bait : pick(rng, biomes)
    if (kind === 'bounty' && bait && biome === bait) bait = null
    if (!biome) break
    const offer = makeOffer(rng, kind, biome, i)
    if (offer) offers.push(offer)
  }
  return { offers, baitBiome: bait }
}

export function refreshBountyBoard(
  board: BountyBoard,
  now: number,
  rng: Rng,
  unlocked: readonly BiomeId[],
  slots = BOUNTY_BOARD_SLOTS,
): BountyBoard {
  if (board.offers.length > 0 && now - board.refreshedAt < BOUNTY_REFRESH_MS) return board
  const next = generateOffers(rng, unlocked, slots, board.baitBiome)
  return {
    refreshedAt: now,
    offers: next.offers,
    baitBiome: next.baitBiome,
    baitCharges: board.baitCharges,
  }
}

export function rerollOffers(
  board: BountyBoard,
  marks: number,
  cost: number,
  rng: Rng,
  unlocked: readonly BiomeId[],
  slots: number,
): { board: BountyBoard; marks: number; ok: boolean } {
  if (marks < cost) return { board, marks, ok: false }
  const next = generateOffers(rng, unlocked, slots, board.baitBiome)
  return {
    ok: true,
    marks: marks - cost,
    board: { ...board, offers: next.offers, baitBiome: next.baitBiome },
  }
}

export function acceptOffer(
  board: BountyBoard,
  active: readonly ActiveContract[],
  offerId: string,
  maxActive: number,
): { board: BountyBoard; active: ActiveContract[] } | null {
  if (active.length >= maxActive) return null
  const offer = board.offers.find((entry) => entry.id === offerId)
  if (!offer) return null
  return {
    board: { ...board, offers: board.offers.filter((entry) => entry.id !== offerId) },
    active: [...active, offer],
  }
}

export function abandonContract(active: readonly ActiveContract[], id: string): ActiveContract[] {
  return active.filter((contract) => contract.id !== id)
}

/** Cull progress from a normal Monster Hunting kill. Other fight kinds do not count. */
export function noteCullKill(
  active: readonly ActiveContract[],
  monsterId: string,
  kind: FightKind,
): { contracts: ActiveContract[]; marks: number } {
  if (kind !== 'hunt') return { contracts: [...active], marks: 0 }
  let marks = 0
  const contracts: ActiveContract[] = []
  for (const contract of active) {
    if (contract.kind !== 'cull' || contract.monsterId !== monsterId) {
      contracts.push(contract)
      continue
    }
    const have = contract.have + 1
    if (have >= contract.need) marks += contract.marks
    else contracts.push({ ...contract, have })
  }
  return { contracts, marks }
}

export function claimBounty(
  active: readonly ActiveContract[],
  contractId: string,
): { contracts: ActiveContract[]; marks: number; reward: RewardRoll } {
  const contract = active.find((entry) => entry.id === contractId && entry.kind === 'bounty')
  if (!contract) return { contracts: [...active], marks: 0, reward: { kind: 'none' } }
  return {
    contracts: active.filter((entry) => entry.id !== contractId),
    marks: contract.marks,
    reward: contract.reward,
  }
}

export function rewardLabel(reward: RewardRoll): string {
  if (reward.kind === 'item') return `${reward.qty}× ${reward.itemId}`
  if (reward.kind === 'title') return getTitle(reward.titleId)?.name ?? reward.titleId
  if (reward.kind === 'bait') return 'Bait'
  return 'Marks'
}

export interface LodgeBuy {
  marks: number
  board: BountyBoard
  extraBoard: boolean
  extraActive: boolean
  inventory: Inventory
  ownedTitles: string[]
  equippedTitleId: string | null
}

export function buyLodge(
  state: LodgeBuy,
  offerId: string,
  rank: number,
  rng: Rng,
  unlocked: readonly BiomeId[],
  biome?: BiomeId,
): LodgeBuy | null {
  const offer = LODGE_OFFERS.find((entry) => entry.id === offerId)
  if (!offer || rank < offer.renown) return null
  if (offer.kind === 'board' && state.extraBoard) return null
  if (offer.kind === 'active' && state.extraActive) return null
  if (offer.kind === 'title' && offer.titleId && state.ownedTitles.includes(offer.titleId)) return null
  const freeBait = offer.kind === 'bait' && state.board.baitCharges > 0
  const cost = freeBait ? 0 : offer.marks
  if (state.marks < cost) return null
  if (offer.kind === 'bait') {
    if (!biome || !unlocked.includes(biome)) return null
    return {
      ...state,
      marks: state.marks - cost,
      board: {
        ...state.board,
        baitBiome: biome,
        baitCharges: freeBait ? state.board.baitCharges - 1 : state.board.baitCharges,
      },
    }
  }
  if (offer.kind === 'reroll') {
    const slots = boardSlotCount(state.extraBoard)
    const rolled = rerollOffers(state.board, state.marks, offer.marks, rng, unlocked, slots)
    if (!rolled.ok) return null
    return { ...state, marks: rolled.marks, board: rolled.board }
  }
  const next: LodgeBuy = { ...state, marks: state.marks - cost }
  if (offer.kind === 'board') next.extraBoard = true
  if (offer.kind === 'active') next.extraActive = true
  if (offer.kind === 'item' && offer.itemId) {
    next.inventory = addItems(state.inventory, [{ itemId: offer.itemId, quantity: 1 }])
  }
  if (offer.kind === 'title' && offer.titleId) {
    next.ownedTitles = [...state.ownedTitles, offer.titleId]
    if (!state.equippedTitleId) next.equippedTitleId = offer.titleId
  }
  return next
}

export function lodgeOfferLocked(offer: LodgeOffer, rank: number): string | null {
  if (rank < offer.renown) return `Renown ${offer.renown}`
  return null
}

export function applyReward(
  payout: BountyPayout,
  reward: RewardRoll,
  inventory: Inventory,
): Inventory {
  if (reward.kind === 'item') return addItems(inventory, [{ itemId: reward.itemId, quantity: reward.qty }])
  if (reward.kind === 'title') payout.titles.push(reward.titleId)
  if (reward.kind === 'bait') payout.bait = true
  return inventory
}
