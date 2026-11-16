import { useState } from 'react'
import { RARITY_TEXT } from '../../components/rarity'
import { getItem, ITEM_CATEGORIES, type ItemCategory, type ItemId } from '../../data/items'
import { canEquip } from '../../engine/equipment'
import { useGameStore } from '../../store/gameStore'

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

export function InventoryPage() {
  const inventory = useGameStore((state) => state.inventory)
  const equipment = useGameStore((state) => state.equipment)
  const isInDungeonOrQuest = useGameStore((state) => state.isInDungeonOrQuest)
  const sellItem = useGameStore((state) => state.sellItem)
  const equipItem = useGameStore((state) => state.equipItem)
  const [category, setCategory] = useState<ItemCategory | 'all'>('all')
  const owned = (Object.entries(inventory) as [ItemId, number][])
    .flatMap(([id, quantity]) => {
      const def = getItem(id)
      if (!def || quantity <= 0) return []
      return [{ id, quantity, def }]
    })
    .sort((a, b) => a.def.name.localeCompare(b.def.name))
  const present = new Set(owned.map((entry) => entry.def.category))
  const selected = category !== 'all' && !present.has(category) ? 'all' : category
  const shown = owned.filter((entry) => selected === 'all' || entry.def.category === selected)

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterButton current={selected} id="all" label="All" onSelect={setCategory} />
        {ITEM_CATEGORIES.filter((entry) => present.has(entry)).map((entry) => (
          <FilterButton
            key={entry}
            current={selected}
            id={entry}
            label={CATEGORY_LABEL[entry]}
            onSelect={setCategory}
          />
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="text-parchment/70">No items.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {shown.map((entry) => {
            const equippable = !isInDungeonOrQuest && canEquip(equipment, entry.id)
            return (
              <article
                key={entry.id}
                className={`flex flex-col gap-2 rounded-lg border border-brown/40 bg-panel p-3 ${
                  equippable ? 'cursor-pointer hover:border-gold' : ''
                }`}
                onClick={() => {
                  if (equippable) equipItem(entry.id)
                }}
              >
                <h3 className={`font-bold ${RARITY_TEXT[entry.def.rarity]}`}>{entry.def.name}</h3>
                <p className="text-sm text-parchment">x{entry.quantity}</p>
                <p className="text-xs capitalize text-sage">{entry.def.rarity}</p>
                {equippable && <p className="text-xs text-gold">Click to equip</p>}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    sellItem(entry.id)
                  }}
                  className="mt-auto rounded-lg bg-sage px-3 py-1 text-ink transition-colors hover:bg-gold"
                >
                  Sell {entry.def.sellValue * entry.quantity} gp
                </button>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterButton({
  current,
  id,
  label,
  onSelect,
}: {
  current: ItemCategory | 'all'
  id: ItemCategory | 'all'
  label: string
  onSelect: (id: ItemCategory | 'all') => void
}) {
  const selected = current === id
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      className={`rounded-lg px-3 py-1 ${selected ? 'bg-gold text-ink' : 'bg-panel text-parchment ring-1 ring-brown/40'}`}
    >
      {label}
    </button>
  )
}
