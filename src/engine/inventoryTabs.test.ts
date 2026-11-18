import { expect, test } from 'vitest'
import type { ItemId } from '../data/items'
import {
  defaultInventoryTabs,
  moveItemToTab,
  placeIncoming,
  renameTab,
  reorderItem,
} from './inventoryTabs'
import type { Inventory } from './inventory'

test('defaultInventoryTabs makes five Tab N entries', () => {
  const tabs = defaultInventoryTabs()
  expect(tabs).toHaveLength(5)
  expect(tabs.map((t) => t.id)).toEqual(['tab-1', 'tab-2', 'tab-3', 'tab-4', 'tab-5'])
  expect(tabs.map((t) => t.name)).toEqual(['Tab 1', 'Tab 2', 'Tab 3', 'Tab 4', 'Tab 5'])
  expect(tabs.every((t) => t.itemIds.length === 0)).toBe(true)
})

test('moveItemToTab appends onto the destination and removes from the source', () => {
  const tabs = defaultInventoryTabs()
  tabs[0].itemIds = ['iron-ore', 'coal'] as ItemId[]
  const next = moveItemToTab(tabs, 'iron-ore' as ItemId, 'tab-2')
  expect(next[0].itemIds).toEqual(['coal'])
  expect(next[1].itemIds).toEqual(['iron-ore'])
})

test('reorderItem inserts before the target in the same tab', () => {
  const tabs = defaultInventoryTabs()
  tabs[0].itemIds = ['iron-ore', 'coal', 'iron-bar'] as ItemId[]
  const next = reorderItem(tabs, 'tab-1', 'iron-bar' as ItemId, 'iron-ore' as ItemId)
  expect(next[0].itemIds).toEqual(['iron-bar', 'iron-ore', 'coal'])
})

test('placeIncoming puts a brand-new id on Tab 1', () => {
  const tabs = defaultInventoryTabs()
  const before: Inventory = {}
  const after: Inventory = { 'iron-ore': 3 }
  const next = placeIncoming(tabs, before, after)
  expect(next[0].itemIds).toEqual(['iron-ore'])
})

test('placeIncoming leaves an id on its remembered tab when the count returns', () => {
  const tabs = defaultInventoryTabs()
  tabs[2].itemIds = ['iron-ore'] as ItemId[]
  const before: Inventory = {}
  const after: Inventory = { 'iron-ore': 2 }
  const next = placeIncoming(tabs, before, after)
  expect(next[0].itemIds).toEqual([])
  expect(next[2].itemIds).toEqual(['iron-ore'])
})

test('renameTab clamps to 16 characters and blanks become Tab N', () => {
  const tabs = defaultInventoryTabs()
  expect(renameTab(tabs, 'tab-2', 'Ore & Bars!!!').find((t) => t.id === 'tab-2')?.name).toBe(
    'Ore & Bars!!!',
  )
  expect(renameTab(tabs, 'tab-2', '   ').find((t) => t.id === 'tab-2')?.name).toBe('Tab 2')
  expect(
    renameTab(tabs, 'tab-1', 'abcdefghijklmnopqrstuvwxyz').find((t) => t.id === 'tab-1')?.name,
  ).toBe('abcdefghijklmnop')
})
