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
import { RARITY_TEXT } from '../../components/rarity'
import { getItem, type ItemCategory, type ItemId } from '../../data/items'
import { getMonster } from '../../data/monsters'
import { activePerks, effectTotal } from '../../engine/abilities'
import { canEquip, targetSlot, type EquipmentSlot } from '../../engine/equipment'
import { equipPreview } from '../../engine/equipPreview'
import { sellItems } from '../../engine/inventory'
import { sourcesOf, usesOf, type ItemLink } from '../../engine/itemIndex'
import { useGameStore } from '../../store/gameStore'
import type { PageFocus } from '../pageFocus'

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  material: 'Materials',
  food: 'Food',
  potion: 'Potions',
  component: 'Components',
  gear: 'Gear',
  ammo: 'Ammo',
  currency: 'Currency',
  misc: 'Misc',
}

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

const SLOT_LABEL: Record<EquipmentSlot, string> = {
  helmet: 'Helmet',
  chest: 'Chest',
  chaps: 'Chaps',
  boots: 'Boots',
  gauntlets: 'Gauntlets',
  cloak: 'Cloak',
  belt: 'Belt',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
  necklace: 'Necklace',
  mainHand: 'Main Hand',
  offHand: 'Off Hand',
  ammo: 'Ammo',
  attuned1: 'Attuned 1',
  attuned2: 'Attuned 2',
  attuned3: 'Attuned 3',
  summon1: 'Summon 1',
  summon2: 'Summon 2',
  food: 'Food',
  potion: 'Potion',
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

  const preview =
    selectedId && canEquip(equipment, selectedId)
      ? equipPreview(equipment, inventory, selectedId, skills, classXp)
      : null

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
                    <Icon size={18} className="shrink-0 text-sage" />
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
        {!selected || !selectedId || owned <= 0 ? (
          <p className="text-parchment/70">Select an item</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {(() => {
                const Icon = CATEGORY_ICON[selected.category] ?? Package
                return <Icon size={28} className="shrink-0 text-sage" />
              })()}
              <div className="min-w-0">
                <h2 className={`text-lg font-bold ${RARITY_TEXT[selected.rarity]}`}>{selected.name}</h2>
                <p className="text-xs capitalize text-sage">
                  {selected.rarity} · {CATEGORY_LABEL[selected.category]}
                </p>
              </div>
            </div>

            <p className="text-sm text-parchment/80">{selected.description}</p>
            <p className="text-sm">
              Owned: <span className="font-bold text-gold">{owned}</span>
            </p>

            <div className="space-y-2 rounded border border-brown/40 p-3">
              <div className="flex justify-between text-sm">
                <span>Sell</span>
                <span className="text-sage">{selected.sellValue} gp each</span>
              </div>
              <input
                type="range"
                min={1}
                max={owned}
                value={Math.min(sellQty, owned)}
                onChange={(event) => setSellQty(Number(event.target.value))}
                className="w-full"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={owned}
                  value={Math.min(sellQty, owned)}
                  onChange={(event) => {
                    const next = Number(event.target.value)
                    if (!Number.isFinite(next)) return
                    setSellQty(Math.min(owned, Math.max(1, Math.floor(next))))
                  }}
                  className="w-20 rounded border border-brown/40 bg-ink/50 px-2 py-1 text-sm"
                />
                <span className="text-sm text-parchment/70">= {sellPreview} gp</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sellItem(selectedId, sellQty)
                  if (owned - sellQty <= 0) setSelectedId(null)
                }}
                className="w-full rounded-lg bg-sage px-3 py-1.5 text-sm text-ink transition-colors hover:bg-gold"
              >
                Sell
              </button>
            </div>

            <StatLines itemId={selectedId} />

            {canEquip(equipment, selectedId) && (
              <div className="space-y-2 rounded border border-brown/40 p-3 text-sm">
                <EquipBlock
                  itemId={selectedId}
                  slot={preview?.slot ?? targetSlot(equipment, selectedId)}
                  equipment={equipment}
                  preview={preview}
                  disabled={isInDungeonOrQuest}
                  onEquip={() => equipItem(selectedId)}
                />
              </div>
            )}

            <LinkList title="Obtained from" links={sourcesOf(selectedId)} onOpen={openLink} />
            <LinkList title="Used in" links={usesOf(selectedId)} onOpen={openLink} />
          </div>
        )}
      </aside>
    </div>
  )
}

function StatLines({ itemId }: { itemId: ItemId }) {
  const def = getItem(itemId)
  if (!def) return null
  const lines: string[] = []
  if (def.heal != null) lines.push(`Heals ${def.heal} HP`)
  const gear = def.gear
  if (gear) {
    if (gear.magicBonus) lines.push(`Magic +${gear.magicBonus}`)
    if (gear.weapon) {
      lines.push(
        `Weapon ${gear.weapon.dice} ${gear.weapon.damageType}${
          gear.weapon.versatileDice ? ` (versatile ${gear.weapon.versatileDice})` : ''
        }`,
      )
      if (gear.weapon.properties.length) lines.push(`Properties: ${gear.weapon.properties.join(', ')}`)
      lines.push(`Mastery: ${gear.weapon.mastery}`)
    }
    if (gear.armor) {
      lines.push(
        `Armor ${gear.armor.weightClass} · value ${gear.armor.armorValue}${
          gear.armor.stealthDisadvantage ? ' · stealth disadvantage' : ''
        }`,
      )
      if (gear.armor.strRequirement != null) lines.push(`Requires STR ${gear.armor.strRequirement}`)
    }
    if (gear.shield) lines.push('Shield +2 AC')
    if (gear.material) lines.push(`Material: ${gear.material}`)
  }
  if (lines.length === 0) return null
  return (
    <div className="space-y-1 text-sm">
      <h3 className="font-bold text-gold">Stats</h3>
      <ul className="space-y-0.5 text-parchment/80">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}

function EquipBlock({
  itemId,
  slot,
  equipment,
  preview,
  disabled,
  onEquip,
}: {
  itemId: ItemId
  slot: EquipmentSlot | null
  equipment: ReturnType<typeof useGameStore.getState>['equipment']
  preview: ReturnType<typeof equipPreview>
  disabled: boolean
  onEquip: () => void
}) {
  const def = getItem(itemId)
  const isFood = def?.category === 'food' || def?.gear?.slot === 'food'
  const isPotion = def?.category === 'potion' || def?.gear?.slot === 'potion'
  const label = isFood
    ? 'Assign to food slot'
    : isPotion
      ? 'Assign to potion slot'
      : 'Equip'

  const relatedSlots: EquipmentSlot[] =
    slot === 'ring1' || slot === 'ring2'
      ? ['ring1', 'ring2']
      : slot === 'attuned1' || slot === 'attuned2' || slot === 'attuned3'
        ? ['attuned1', 'attuned2', 'attuned3']
        : slot === 'summon1' || slot === 'summon2'
          ? ['summon1', 'summon2']
          : slot
            ? [slot]
            : []

  const diffs = preview?.diffs
  const diffLines: string[] = []
  if (diffs) {
    if (diffs.ac !== 0) diffLines.push(`${diffs.ac > 0 ? '+' : ''}${diffs.ac} AC`)
    if (diffs.toHit !== 0) diffLines.push(`${diffs.toHit > 0 ? '+' : ''}${diffs.toHit} to-hit`)
    if (diffs.damageBefore !== diffs.damageAfter) {
      diffLines.push(`Damage ${diffs.damageBefore} → ${diffs.damageAfter}`)
    }
    if (diffs.intervalMs !== 0) {
      const sec = diffs.intervalMs / 1000
      diffLines.push(`${sec > 0 ? '+' : ''}${sec.toFixed(1)}s interval`)
    }
  }

  return (
    <>
      {slot && (
        <p>
          Slot: <span className="text-gold">{SLOT_LABEL[slot]}</span>
        </p>
      )}
      {relatedSlots.map((entry) => {
        const worn = equipment[entry]
        const wornName = worn ? getItem(worn)?.name ?? worn : 'Empty'
        return (
          <p key={entry} className="text-parchment/80">
            {SLOT_LABEL[entry]}: {wornName}
          </p>
        )
      })}
      {def?.gear?.armor?.strRequirement != null && (
        <p className="text-parchment/70">Requires STR {def.gear.armor.strRequirement}</p>
      )}
      {diffLines.length > 0 && (
        <ul className="text-sage">
          {diffLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        disabled={disabled || !slot}
        onClick={onEquip}
        className="w-full rounded-lg bg-crimson px-3 py-1.5 text-parchment transition-colors hover:bg-brown disabled:cursor-not-allowed disabled:opacity-40"
      >
        {label}
      </button>
    </>
  )
}

function LinkList({
  title,
  links,
  onOpen,
}: {
  title: string
  links: ItemLink[]
  onOpen: (link: ItemLink) => void
}) {
  if (links.length === 0) return null
  return (
    <div className="space-y-1 text-sm">
      <h3 className="font-bold text-gold">{title}</h3>
      <ul className="space-y-1">
        {links.map((link, index) => (
          <li key={`${link.kind}-${index}-${link.label}`}>
            <button
              type="button"
              onClick={() => onOpen(link)}
              className="text-left text-sage underline-offset-2 hover:underline"
            >
              {link.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
