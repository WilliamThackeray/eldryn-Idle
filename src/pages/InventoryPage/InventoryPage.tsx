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
import { RARITY_BORDER, RARITY_TEXT } from '../../components/rarity'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageLayout, SidePanel } from '../../components/ui/PageLayout'
import { cx } from '../../components/ui/format'
import { getItem, type ItemCategory, type ItemId } from '../../data/items'
import { BIOMES, CREATURE_TYPES, getMonster, type BiomeId, type CreatureType } from '../../data/monsters'
import { activePerks } from '../../engine/abilities'
import { sellItems } from '../../engine/inventory'
import { type ItemLink } from '../../engine/itemIndex'
import { sellPriceMultiplier } from '../../engine/social'
import { useGameStore } from '../../store/gameStore'
import type { PageFocus } from '../pageFocus'

const SOCIAL_USE = new Set([
  'trade-contract',
  'disguise-kit',
  'menace-trophy',
  'bounty-contract',
  'rumor',
  'intel',
])

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
  const classId = useGameStore((state) => state.classId)
  const isInDungeonOrQuest = useGameStore((state) => state.isInDungeonOrQuest)
  const sellItem = useGameStore((state) => state.sellItem)
  const equipItem = useGameStore((state) => state.equipItem)
  const activateSocialItem = useGameStore((state) => state.activateSocialItem)
  const activeBuffs = useGameStore((state) => state.activeBuffs)
  const renameInventoryTab = useGameStore((state) => state.renameInventoryTab)
  const moveInventoryItem = useGameStore((state) => state.moveInventoryItem)
  const reorderInventoryItem = useGameStore((state) => state.reorderInventoryItem)

  const [activeTabId, setActiveTabId] = useState(() => inventoryTabs[0]?.id ?? 'tab-1')
  const [selectedId, setSelectedId] = useState<ItemId | null>(null)
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [sellQty, setSellQty] = useState(1)
  const [dragItemId, setDragItemId] = useState<ItemId | null>(null)
  const [useBiome, setUseBiome] = useState<BiomeId>('forest')
  const [useType, setUseType] = useState<CreatureType>('beast')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'name' | 'rarity' | 'category' | 'quantity'>('name')

  const activeTab = inventoryTabs.find((tab) => tab.id === activeTabId) ?? inventoryTabs[0]

  const shown = useMemo(() => {
    if (!activeTab) return []
    const rarityRank = ['common', 'uncommon', 'rare', 'very-rare', 'legendary', 'artifact']
    const needle = query.trim().toLowerCase()
    const rows = activeTab.itemIds.flatMap((id) => {
      const quantity = inventory[id] ?? 0
      if (quantity <= 0) return []
      const def = getItem(id)
      if (!def) return []
      if (needle && !def.name.toLowerCase().includes(needle)) return []
      return [{ id, quantity, def }]
    })
    rows.sort((a, b) => {
      if (sort === 'quantity') return b.quantity - a.quantity || a.def.name.localeCompare(b.def.name)
      if (sort === 'category') return a.def.category.localeCompare(b.def.category) || a.def.name.localeCompare(b.def.name)
      if (sort === 'rarity') return rarityRank.indexOf(b.def.rarity) - rarityRank.indexOf(a.def.rarity) || a.def.name.localeCompare(b.def.name)
      return a.def.name.localeCompare(b.def.name)
    })
    return rows
  }, [activeTab, inventory, query, sort])

  const selected = selectedId ? getItem(selectedId) : undefined
  const owned = selectedId ? (inventory[selectedId] ?? 0) : 0
  const priceMultiplier = sellPriceMultiplier(activePerks({ skills }), activeBuffs)

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
      onNavigate('mile-camp', { kind: 'quest', questId: link.questId })
      return
    }
    if (link.kind === 'combat') {
      onNavigate('monsterHunting')
    }
  }

  return (
    <PageLayout>
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
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
                className={cx(
                  'rounded-full px-3 py-1 text-body font-semibold',
                  selectedTab ? 'bg-crimson text-parchment' : 'bg-panel text-parchment hover:bg-brown',
                )}
              >
                {tab.name}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label="Search items"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 py-1.5 text-body text-parchment"
          />
          <select
            aria-label="Sort items"
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="rounded-lg border border-line bg-ink px-2 py-1.5 text-body text-parchment"
          >
            <option value="name">Name</option>
            <option value="rarity">Rarity</option>
            <option value="category">Category</option>
            <option value="quantity">Quantity</option>
          </select>
        </div>

        {shown.length === 0 ? (
          <EmptyState text={query.trim() ? 'No matches.' : 'Drag items here'} />
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
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
                  className={cx(
                    'relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border bg-panel p-2',
                    RARITY_BORDER[entry.def.rarity],
                    selectedCard && 'ring-2 ring-gold',
                  )}
                >
                  <span className="absolute right-1 top-1 rounded bg-ink px-1 text-meta text-parchment">
                    {entry.quantity}
                  </span>
                  {entry.def.icon ? (
                    <img src={entry.def.icon} alt="" className="h-8 w-8 object-contain" />
                  ) : (
                    <Icon size={20} className="text-muted" aria-hidden />
                  )}
                  <h3 className={cx('line-clamp-2 text-center text-meta font-semibold', RARITY_TEXT[entry.def.rarity])}>
                    {entry.def.name}
                  </h3>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <SidePanel className="rounded-lg border border-line bg-panel p-4">
        <ItemDetail
          itemId={selectedId}
          owned={owned}
          equipment={equipment}
          inventory={inventory}
          skills={skills}
          classXp={classXp}
          classId={classId}
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
          useLabel={selectedId && SOCIAL_USE.has(selectedId) ? 'Use' : null}
          useDisabled={!selectedId || owned <= 0}
          useExtra={
            selectedId === 'rumor' ? (
              <label className="flex items-center gap-2 text-sm">
                Biome
                <select
                  value={useBiome}
                  onChange={(event) => setUseBiome(event.target.value as BiomeId)}
                  className="rounded border border-brown/40 bg-ink/50 px-2 py-1"
                >
                  {BIOMES.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
            ) : selectedId === 'intel' ? (
              <label className="flex items-center gap-2 text-sm">
                Creature type
                <select
                  value={useType}
                  onChange={(event) => setUseType(event.target.value as CreatureType)}
                  className="rounded border border-brown/40 bg-ink/50 px-2 py-1"
                >
                  {CREATURE_TYPES.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
            ) : null
          }
          onUse={() => {
            if (!selectedId) return
            if (selectedId === 'rumor') activateSocialItem(selectedId, { biome: useBiome })
            else if (selectedId === 'intel') activateSocialItem(selectedId, { creatureType: useType })
            else activateSocialItem(selectedId)
          }}
        />
      </SidePanel>
    </div>
    </PageLayout>
  )
}
