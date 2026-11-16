import type { ItemId } from './items'
import { addItems, type Inventory } from '../engine/inventory'

export interface ShopListing {
  itemId: ItemId
  price: number
  quantity?: number
}

const ARMOR_PIECES = ['helmet', 'chest', 'chaps', 'gauntlets', 'boots'] as const

function setPieces(prefix: string, price: number): ShopListing[] {
  return ARMOR_PIECES.map((piece) => ({ itemId: `${prefix}-${piece}` as ItemId, price }))
}

export const SHOP_CATALOG: readonly ShopListing[] = [
  { itemId: 'club', price: 1 },
  { itemId: 'dagger', price: 1 },
  { itemId: 'handaxe', price: 5 },
  { itemId: 'mace', price: 5 },
  { itemId: 'spear', price: 1 },
  { itemId: 'shortsword', price: 10 },
  { itemId: 'longsword', price: 15 },
  { itemId: 'shortbow', price: 25 },
  { itemId: 'light-crossbow', price: 25 },
  { itemId: 'sling', price: 1 },
  { itemId: 'shield', price: 10 },
  ...setPieces('padded', 1),
  ...setPieces('leather', 2),
  ...setPieces('hide', 2),
  { itemId: 'arrows', price: 1, quantity: 20 },
  { itemId: 'bolts', price: 1, quantity: 20 },
  { itemId: 'sling-bullets', price: 1, quantity: 20 },
  { itemId: 'component-bag-basic', price: 25 },
  { itemId: 'component-bag-fine', price: 100 },
  { itemId: 'component-bag-rare', price: 400 },
  { itemId: 'component-bag-exotic', price: 1600 },
  { itemId: 'component-bag-legendary', price: 6400 },
]

const BY_ID = new Map(SHOP_CATALOG.map((entry) => [entry.itemId, entry]))

export function getShopListing(itemId: string): ShopListing | undefined {
  return BY_ID.get(itemId as ItemId)
}

export function buyItem(
  inventory: Inventory,
  gold: number,
  itemId: string,
): { inventory: Inventory; gold: number } {
  const listing = getShopListing(itemId)
  if (!listing || gold < listing.price) return { inventory, gold }
  return {
    inventory: addItems(inventory, [{ itemId: listing.itemId, quantity: listing.quantity ?? 1 }]),
    gold: gold - listing.price,
  }
}
