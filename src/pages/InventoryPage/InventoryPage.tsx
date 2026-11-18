import { useEffect, useMemo, useState } from 'react'
import {
  FlaskConical,
  Gem,
  Hammer,
  Package,
  Shield,
  Sparkles,
  Sword,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { ItemDetail } from '../../components/ItemDetail'
import { RARITY_TEXT } from '../../components/rarity'
import { getItem, type ItemCategory, type ItemId } from '../../data/items'
import { getMonster } from '../../data/monsters'
import { activePerks, effectTotal } from '../../engine/abilities'
import { sellItems } from '../../engine/inventory'
import { type ItemLink } from '../../engine/itemIndex'
import { useGameStore } from '../../store/gameStore'
import type { PageFocus } from '../pageFocus'

const CATEGORY_ICON: Record<ItemCategory, LucideIcon> = {
  material: Hammer,
  food: Utensils,
  potion: FlaskConical,
  component: Sparkles,
  gear: Shield,
  ammo: Sword,
  currency: Gem,
  misc: Package,
}

interface InventoryPageProps {
  onNavigate?: (page: string, focus?: PageFocus) => void
}

export function InventoryPage({ onNavigate }: InventoryPageProps) {
  const inventory = useGameStore((state) => state.inventory)
  const inventoryTabs = useGameStore((state) => state.inventoryTabs)
  const equipment = useGameStore((state) => state.equipment)
  const skills = useGameStore((state) => state.skills)
  const classXp = useGameStore((state) => state.classXp)
  const isInDungeonOrQuest = useGameStore((state) => state.isInDungeonOrQuest)
  const sellItem = useGameStore((state) => state.sellItem)
  const equipItem = useGameStore((state) => state.equipItem)
  const renameInventoryTab = useGameStore((state) => state.renameInventoryTab)
  const moveInventoryItem = useGameStore((state) => state.moveInventoryItem)
  const reorderInventoryItem = useGameStore((state) => state.reorderInventoryItem)

  const [activeTabId, setActiveTabId] = useState(() => inventoryTabs[0]?.id ?? 'tab-1')
  const [selectedId, setSelectedId] = useState<ItemId | null>(null)
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [sellQty, setSellQty] = useState(1)
  const [dragItemId, setDragItemId] = useState<ItemId | null>(null)

  const activeTab = inventoryTabs.find((tab) => tab.id === activeTabId) ?? inventoryTabs[0]

  const shown = useMemo(() => {
    if (!activeTab) return []
    return activeTab.itemIds.flatMap((id) => {
      const quantity = inventory[id] ?? 0
      if (quantity <= 0) return []
      const def = getItem(id)
      if (!def) return []
      return [{ id, quantity, def }]
    })
  }, [activeTab, inventory])

  const selected = selectedId ? getItem(selectedId) : undefined
  const owned = selectedId ? (inventory[selectedId] ?? 0) : 0
  const priceMultiplier = 1 + effectTotal(activePerks({ skills }), 'sellPricePct')

  useEffect(() => {
    if (!selectedId) return
    setSellQty((qty) => {
      const next = Math.min(Math.max(1, qty), Math.max(1, owned))
      return next === qty ? qty : next
    })
  }, [selectedId, owned])

  useEffect(() => {
    if (!inventoryTabs.some((tab) => tab.id === activeTabId) && inventoryTabs[0]) {
      setActiveTabId(inventoryTabs[0].id)
    }
  }, [inventoryTabs, activeTabId])
  const sellPreview =
    selectedId && owned > 0
      ? sellItems(inventory, 0, selectedId, sellQty, priceMultiplier).gold
      : 0

  function commitRename(tabId: string) {
    renameInventoryTab(tabId, editName)
    setEditingTabId(null)
  }

  function openLink(link: ItemLink) {
    if (!onNavigate) return
    if (link.kind === 'activity') {
      onNavigate(link.skillId, { kind: 'activity', skillId: link.skillId, activityId: link.activityId })
      return
    }
    if (link.kind === 'monster') {
      const monster = getMonster(link.monsterId)
      const biome = monster?.biomes[0]
      if (!biome) return
      onNavigate('monsterHunting', { kind: 'monster', monsterId: link.monsterId, biome })
      return
    }
    if (link.kind === 'dungeon') {
      onNavigate('monsterHunting', { kind: 'dungeon', dungeonId: link.dungeonId })
      return
    }
    if (link.kind === 'spell') {
      onNavigate('character', { kind: 'spell', spellId: link.spellId })
      return
    }
    if (link.kind === 'shop') {
      onNavigate('shop')
      return
    }
    if (link.kind === 'quest') {
      onNavigate('quests', { kind: 'quest', questId: link.questId })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-2">
          {inventoryTabs.map((tab) => {
            const selectedTab = tab.id === activeTab?.id
            if (editingTabId === tab.id) {
              return (
                <input
                  key={tab.id}
                  autoFocus
                  value={editName}
                  maxLength={16}
                  onChange={(event) => setEditName(event.target.value.slice(0, 16))}
                  onBlur={() => commitRename(tab.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitRename(tab.id)
                    if (event.key === 'Escape') setEditingTabId(null)
                  }}
                  className="w-28 rounded-lg bg-gold px-3 py-1 text-ink outline-none"
                />
              )
            }
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={selectedTab}
                onClick={() => setActiveTabId(tab.id)}
                onDoubleClick={() => {
                  setEditingTabId(tab.id)
                  setEditName(tab.name)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const itemId = (event.dataTransfer.getData('text/item-id') || dragItemId) as ItemId | ''
                  if (!itemId) return
                  moveInventoryItem(itemId, tab.id)
                  setActiveTabId(tab.id)
                  setDragItemId(null)
                }}
                className={`rounded-lg px-3 py-1 ${
                  selectedTab ? 'bg-gold text-ink' : 'bg-panel text-parchment ring-1 ring-brown/40'
                }`}
              >
                {tab.name}
              </button>
            )
          })}
        </div>

        {shown.length === 0 ? (
          <p className="text-parchment/70">No items.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {shown.map((entry) => {
              const Icon = CATEGORY_ICON[entry.def.category] ?? Package
              const selectedCard = selectedId === entry.id
              return (
                <article
                  key={entry.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/item-id', entry.id)
                    event.dataTransfer.effectAllowed = 'move'
                    setDragItemId(entry.id)
                  }}
                  onDragEnd={() => setDragItemId(null)}
                  onDragOver={(event) => {
                    event.preventDefault()
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    const itemId = (event.dataTransfer.getData('text/item-id') || dragItemId) as ItemId | ''
                    if (!itemId || !activeTab || itemId === entry.id) return
                    reorderInventoryItem(activeTab.id, itemId, entry.id)
                    setDragItemId(null)
                  }}
                  onClick={() => setSelectedId(entry.id)}
                  className={`flex cursor-pointer flex-col gap-1 rounded-lg border bg-panel p-3 ${
                    selectedCard ? 'border-gold' : 'border-brown/40 hover:border-gold/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {entry.def.icon ? (
                      <img src={entry.def.icon} alt="" className="h-10 w-10 shrink-0 object-contain" />
                    ) : (
                      <Icon size={18} className="shrink-0 text-sage" />
                    )}
                    <span className="text-sm text-parchment">x{entry.quantity}</span>
                  </div>
                  <h3 className={`text-sm font-bold leading-tight ${RARITY_TEXT[entry.def.rarity]}`}>
                    {entry.def.name}
                  </h3>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <aside className="sticky top-0 h-fit rounded-lg border border-brown/40 bg-panel p-4">
        <ItemDetail
          itemId={selectedId}
          owned={owned}
          equipment={equipment}
          inventory={inventory}
          skills={skills}
          classXp={classXp}
          isInDungeonOrQuest={isInDungeonOrQuest}
          mode="inventory"
          categoryIcon={selected ? CATEGORY_ICON[selected.category] : Package}
          sellQty={sellQty}
          sellPreview={sellPreview}
          onSellQtyChange={setSellQty}
          onSell={() => {
            if (!selectedId) return
            sellItem(selectedId, sellQty)
            if (owned - sellQty <= 0) setSelectedId(null)
          }}
          onEquip={() => {
            if (selectedId) equipItem(selectedId)
          }}
          onOpenLink={openLink}
        />
      </aside>
    </div>
  )
}
