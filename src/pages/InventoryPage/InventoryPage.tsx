import { useState } from 'react'
import { getItem, ITEM_CATEGORIES, type ItemCategory, type ItemId, type ItemRarity } from '../../data/items'
import { useGameStore } from '../../store/gameStore'

const RARITY_TEXT: Record<ItemRarity, string> = {
  common: 'text-[#DAD6D6]',
  uncommon: 'text-[#92BFB1]',
  rare: 'text-[#7EB6D9]',
  'very-rare': 'text-[#C58BE2]',
  legendary: 'text-[#F4AC45]',
  artifact: 'text-[#E85D4C]',
}

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
  const sellItem = useGameStore((state) => state.sellItem)
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
      <div className="flex flex-wrap gap-2 mb-4">
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
        <p className="text-[#1f1f1f]">No items.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {shown.map((entry) => (
            <article key={entry.id} className="bg-[#1f1f1f] rounded-lg p-3 flex flex-col gap-2">
              <h3 className={`font-bold ${RARITY_TEXT[entry.def.rarity]}`}>{entry.def.name}</h3>
              <p className="text-sm text-[#DAD6D6]">x{entry.quantity}</p>
              <p className="text-xs text-[#92BFB1] capitalize">{entry.def.rarity}</p>
              <button
                type="button"
                onClick={() => sellItem(entry.id)}
                className="mt-auto px-3 py-1 bg-[#92BFB1] text-[#1f1f1f] rounded-lg hover:bg-[#F4AC45]"
              >
                Sell {entry.def.sellValue * entry.quantity} gp
              </button>
            </article>
          ))}
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
      className={`px-3 py-1 rounded-lg ${selected ? 'bg-[#F4AC45] text-[#1f1f1f]' : 'bg-[#1f1f1f] text-[#DAD6D6]'}`}
    >
      {label}
    </button>
  )
}
