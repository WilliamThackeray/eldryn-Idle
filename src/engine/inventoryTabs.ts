import { isItemId, type ItemId } from '../data/items'
import { BASE_INVENTORY_TABS, MAX_INVENTORY_TABS } from './config'
import type { Inventory } from './inventory'

export interface InventoryTab {
  id: string
  name: string
  itemIds: ItemId[]
}

export function defaultInventoryTabs(count = BASE_INVENTORY_TABS): InventoryTab[] {
  const n = Math.min(MAX_INVENTORY_TABS, Math.max(1, count))
  return Array.from({ length: n }, (_, i) => ({
    id: `tab-${i + 1}`,
    name: `Tab ${i + 1}`,
    itemIds: [],
  }))
}

export function tabDefaultName(tabId: string): string {
  const match = /^tab-(\d+)$/.exec(tabId)
  return match ? `Tab ${match[1]}` : tabId
}

export function renameTab(tabs: InventoryTab[], tabId: string, name: string): InventoryTab[] {
  const trimmed = name.trim().slice(0, 16)
  return tabs.map((tab) =>
    tab.id === tabId ? { ...tab, name: trimmed || tabDefaultName(tab.id) } : tab,
  )
}

function withoutItem(tabs: InventoryTab[], itemId: ItemId): InventoryTab[] {
  return tabs.map((tab) => ({
    ...tab,
    itemIds: tab.itemIds.filter((id) => id !== itemId),
  }))
}

export function moveItemToTab(tabs: InventoryTab[], itemId: ItemId, toTabId: string): InventoryTab[] {
  const cleared = withoutItem(tabs, itemId)
  return cleared.map((tab) =>
    tab.id === toTabId ? { ...tab, itemIds: [...tab.itemIds, itemId] } : tab,
  )
}

export function reorderItem(
  tabs: InventoryTab[],
  tabId: string,
  itemId: ItemId,
  beforeItemId: ItemId,
): InventoryTab[] {
  if (itemId === beforeItemId) return tabs
  return tabs.map((tab) => {
    if (tab.id !== tabId) return tab
    const without = tab.itemIds.filter((id) => id !== itemId)
    const at = without.indexOf(beforeItemId)
    if (at < 0) return { ...tab, itemIds: [...without, itemId] }
    const next = [...without]
    next.splice(at, 0, itemId)
    return { ...tab, itemIds: next }
  })
}

function idsOnTabs(tabs: InventoryTab[]): Set<ItemId> {
  const seen = new Set<ItemId>()
  for (const tab of tabs) for (const id of tab.itemIds) seen.add(id)
  return seen
}

/** Append positive-count ids that are on no tab onto Tab 1. */
export function placeIncoming(
  tabs: InventoryTab[],
  _before: Inventory,
  after: Inventory,
): InventoryTab[] {
  if (tabs.length === 0) return tabs
  const placed = idsOnTabs(tabs)
  const newcomers: ItemId[] = []
  for (const [id, qty] of Object.entries(after) as [ItemId, number][]) {
    if (qty > 0 && !placed.has(id)) newcomers.push(id)
  }
  if (newcomers.length === 0) return tabs
  return tabs.map((tab, index) =>
    index === 0 ? { ...tab, itemIds: [...tab.itemIds, ...newcomers] } : tab,
  )
}

export function appendInventoryTab(tabs: InventoryTab[]): InventoryTab[] {
  if (tabs.length >= MAX_INVENTORY_TABS) return tabs
  const n = tabs.length + 1
  return [...tabs, { id: `tab-${n}`, name: `Tab ${n}`, itemIds: [] }]
}

/** Keep saved tabs up to MAX, pad to at least BASE, and up to `tabCount` when upgrades unlock more. */
export function normalizeInventoryTabs(
  raw: unknown,
  inventory: Inventory,
  tabCount = BASE_INVENTORY_TABS,
): InventoryTab[] {
  const target = Math.min(MAX_INVENTORY_TABS, Math.max(BASE_INVENTORY_TABS, tabCount))
  const parsed: InventoryTab[] = []
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue
      const record = entry as Record<string, unknown>
      const id = typeof record.id === 'string' ? record.id : `tab-${parsed.length + 1}`
      const name =
        typeof record.name === 'string' && record.name.trim()
          ? record.name.trim().slice(0, 16)
          : tabDefaultName(id)
      const itemIds: ItemId[] = []
      if (Array.isArray(record.itemIds)) {
        for (const itemId of record.itemIds) {
          if (typeof itemId === 'string' && isItemId(itemId)) itemIds.push(itemId)
        }
      }
      parsed.push({ id, name, itemIds })
      if (parsed.length >= MAX_INVENTORY_TABS) break
    }
  }

  const overflow: ItemId[] = []
  if (Array.isArray(raw) && raw.length > MAX_INVENTORY_TABS) {
    for (const entry of raw.slice(MAX_INVENTORY_TABS)) {
      if (!entry || typeof entry !== 'object') continue
      const record = entry as Record<string, unknown>
      if (!Array.isArray(record.itemIds)) continue
      for (const itemId of record.itemIds) {
        if (typeof itemId === 'string' && isItemId(itemId)) overflow.push(itemId)
      }
    }
  }

  const base = defaultInventoryTabs(target)
  const tabs = base.map((tab, i) => {
    const source = parsed[i]
    if (!source) return tab
    return {
      id: tab.id,
      name: source.name || tab.name,
      itemIds: source.itemIds,
    }
  })

  if (overflow.length > 0) {
    const seen = idsOnTabs(tabs)
    const extra = overflow.filter((id) => !seen.has(id))
    if (extra.length > 0) {
      tabs[0] = { ...tabs[0], itemIds: [...tabs[0].itemIds, ...extra] }
    }
  }

  return placeIncoming(tabs, {}, inventory)
}
