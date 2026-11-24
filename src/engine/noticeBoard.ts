import { ACTIVITIES } from '../data/activities'
import { getItem, type ItemId } from '../data/items'
import { HUNT_BIOMES, MONSTERS, getMonster } from '../data/monsters'
import type { Objective } from '../data/quests'
import type { TradeSkillId } from '../data/skills'
import type { SkillProgress } from '../types/game'
import type { GameEvent } from './advance'
import {
  NOTICE_BOARD_FAVOR,
  NOTICE_BOARD_KILL_GOLD_PER,
  NOTICE_BOARD_MS,
  NOTICE_BOARD_QTY,
  NOTICE_BOARD_REROLL_FAVOR,
} from './config'
import { hasItems, removeItems, type Inventory } from './inventory'
import { activityUnlocked, type QuestProgress } from './quest'
import type { Rng } from './rng'
import { levelForXp } from './xp'

export interface NoticeOffer {
  id: string
  objective: Objective
  gold: number
  favor: number
  count: number
}

export interface NoticeBoard {
  refreshedAt: number
  offers: NoticeOffer[]
}

export function emptyNoticeBoard(now = Date.now()): NoticeBoard {
  return { refreshedAt: now, offers: [] }
}

function shuffle<T>(list: T[], rng: Rng): T[] {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[next[i], next[j]] = [next[j]!, next[i]!]
  }
  return next
}

export function deliverPool(
  skills: Record<TradeSkillId, SkillProgress>,
  questProgress: QuestProgress,
): { itemId: string; sellValue: number }[] {
  const seen = new Map<string, number>()
  for (const activity of ACTIVITIES) {
    if (activity.kind !== 'craft' && activity.kind !== 'gather') continue
    if (!activity.outputs.length) continue
    if (!activityUnlocked(activity.requiresQuest, questProgress)) continue
    if (levelForXp(skills[activity.skillId]?.xp ?? 0) < activity.requiredLevel) continue
    for (const out of activity.outputs) {
      const item = getItem(out.itemId)
      if (!item || seen.has(out.itemId)) continue
      seen.set(out.itemId, item.sellValue)
    }
  }
  return [...seen.entries()].map(([itemId, sellValue]) => ({ itemId, sellValue }))
}

export function killPool(): { monsterId: string }[] {
  return MONSTERS.filter(
    (m) => !m.rare && !m.lairOnly && m.biomes.some((b) => (HUNT_BIOMES as readonly string[]).includes(b)),
  ).map((m) => ({ monsterId: m.id }))
}

function makeOffers(
  rng: Rng,
  skills: Record<TradeSkillId, SkillProgress>,
  questProgress: QuestProgress,
): NoticeOffer[] {
  const delivers = shuffle(deliverPool(skills, questProgress), rng)
  const kills = shuffle(killPool(), rng)
  const offers: NoticeOffer[] = []
  const qty = NOTICE_BOARD_QTY

  const takeDeliver = () => {
    const entry = delivers.shift()
    if (!entry) return
    offers.push({
      id: `deliver-${entry.itemId}-${offers.length}`,
      objective: { type: 'deliver', itemId: entry.itemId as ItemId, qty },
      gold: entry.sellValue * qty,
      favor: NOTICE_BOARD_FAVOR,
      count: 0,
    })
  }
  const takeKill = () => {
    const entry = kills.shift()
    if (!entry) return
    offers.push({
      id: `kill-${entry.monsterId}-${offers.length}`,
      objective: { type: 'kill', monsterId: entry.monsterId, qty },
      gold: NOTICE_BOARD_KILL_GOLD_PER * qty,
      favor: NOTICE_BOARD_FAVOR,
      count: 0,
    })
  }

  takeDeliver()
  takeDeliver()
  takeKill()
  while (offers.length < 3) {
    if (delivers.length) takeDeliver()
    else if (kills.length) takeKill()
    else break
  }
  return offers.slice(0, 3)
}

export function refreshIfDue(
  board: NoticeBoard,
  now: number,
  rng: Rng,
  skills: Record<TradeSkillId, SkillProgress>,
  questProgress: QuestProgress,
): NoticeBoard {
  if (board.offers.length > 0 && now - board.refreshedAt < NOTICE_BOARD_MS) return board
  return {
    refreshedAt: now,
    offers: makeOffers(rng, skills, questProgress),
  }
}

export function rerollBoard(
  board: NoticeBoard,
  favor: number,
  rng: Rng,
  skills: Record<TradeSkillId, SkillProgress>,
  questProgress: QuestProgress,
): { board: NoticeBoard; favor: number; ok: boolean } {
  if (favor < NOTICE_BOARD_REROLL_FAVOR) return { board, favor, ok: false }
  return {
    board: {
      refreshedAt: board.refreshedAt,
      offers: makeOffers(rng, skills, questProgress),
    },
    favor: favor - NOTICE_BOARD_REROLL_FAVOR,
    ok: true,
  }
}

export function applyNoticeEvents(board: NoticeBoard, events: GameEvent[]): NoticeBoard {
  let offers = board.offers
  let changed = false
  for (const event of events) {
    if (event.kind !== 'kill') continue
    offers = offers.map((offer) => {
      if (offer.objective.type !== 'kill') return offer
      if (!('monsterId' in offer.objective)) return offer
      if (offer.objective.monsterId !== event.monsterId) return offer
      if (offer.count >= offer.objective.qty) return offer
      changed = true
      return { ...offer, count: offer.count + 1 }
    })
  }
  return changed ? { ...board, offers } : board
}

export function turnInNotice(
  board: NoticeBoard,
  offerId: string,
  inventory: Inventory,
  gold: number,
  favor: number,
): { board: NoticeBoard; inventory: Inventory; gold: number; favor: number; ok: boolean } {
  const offer = board.offers.find((o) => o.id === offerId)
  if (!offer) return { board, inventory, gold, favor, ok: false }

  if (offer.objective.type === 'deliver') {
    if (!hasItems(inventory, [{ itemId: offer.objective.itemId, quantity: offer.objective.qty }])) {
      return { board, inventory, gold, favor, ok: false }
    }
    return {
      board: { ...board, offers: board.offers.filter((o) => o.id !== offerId) },
      inventory: removeItems(inventory, [
        { itemId: offer.objective.itemId, quantity: offer.objective.qty },
      ]),
      gold: gold + offer.gold,
      favor: favor + offer.favor,
      ok: true,
    }
  }

  if (offer.objective.type === 'kill' && 'monsterId' in offer.objective) {
    if (offer.count < offer.objective.qty) return { board, inventory, gold, favor, ok: false }
    return {
      board: { ...board, offers: board.offers.filter((o) => o.id !== offerId) },
      inventory,
      gold: gold + offer.gold,
      favor: favor + offer.favor,
      ok: true,
    }
  }

  return { board, inventory, gold, favor, ok: false }
}

export function noticeOfferReady(offer: NoticeOffer, inventory: Inventory): boolean {
  if (offer.objective.type === 'deliver') {
    return hasItems(inventory, [{ itemId: offer.objective.itemId, quantity: offer.objective.qty }])
  }
  if (offer.objective.type === 'kill' && 'monsterId' in offer.objective) {
    return offer.count >= offer.objective.qty
  }
  return false
}

export function noticeOfferLabel(offer: NoticeOffer): string {
  const obj = offer.objective
  if (obj.type === 'deliver') {
    return `Deliver ${getItem(obj.itemId)?.name ?? obj.itemId} ${offer.count}/${obj.qty}`
  }
  if (obj.type === 'kill' && 'monsterId' in obj) {
    return `Kill ${getMonster(obj.monsterId)?.name ?? obj.monsterId} ${offer.count}/${obj.qty}`
  }
  return offer.id
}
