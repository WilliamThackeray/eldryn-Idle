import { RARITY_TEXT } from '../../components/rarity'
import { getItem, type ItemId } from '../../data/items'
import { SHOP_CATALOG } from '../../data/shop'
import { useGameStore } from '../../store/gameStore'

export function ShopPage() {
  const gold = useGameStore((state) => state.gold)
  const inventory = useGameStore((state) => state.inventory)
  const buyItem = useGameStore((state) => state.buyItem)
  const sellItem = useGameStore((state) => state.sellItem)

  const owned = (Object.entries(inventory) as [ItemId, number][])
    .flatMap(([id, quantity]) => {
      const def = getItem(id)
      if (!def || quantity <= 0) return []
      return [{ id, quantity, def }]
    })
    .sort((a, b) => a.def.name.localeCompare(b.def.name))

  return (
    <div className="space-y-8 text-parchment">
      <section>
        <h2 className="mb-3 text-xl font-bold text-gold">Buy</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP_CATALOG.map((listing) => {
            const def = getItem(listing.itemId)
            if (!def) return null
            const qty = listing.quantity ?? 1
            const affordable = gold >= listing.price
            return (
              <article
                key={`${listing.itemId}-${qty}`}
                className="flex flex-col gap-2 rounded-lg border border-brown/40 bg-panel p-4"
              >
                <h3 className={`font-bold ${RARITY_TEXT[def.rarity]}`}>{def.name}</h3>
                <p className="text-sm text-parchment/80">{def.description}</p>
                <p className="text-sm text-sage">
                  {qty > 1 ? `${qty} for ` : ''}
                  {listing.price} gp
                </p>
                <button
                  type="button"
                  disabled={!affordable}
                  onClick={() => buyItem(listing.itemId)}
                  className="mt-auto rounded-lg bg-sage px-3 py-1 text-ink transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Buy
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-gold">Sell</h2>
        {owned.length === 0 ? (
          <p className="text-parchment/70">Nothing to sell.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {owned.map((entry) => (
              <article
                key={entry.id}
                className="flex flex-col gap-2 rounded-lg border border-brown/40 bg-panel p-3"
              >
                <h3 className={`font-bold ${RARITY_TEXT[entry.def.rarity]}`}>{entry.def.name}</h3>
                <p className="text-sm text-parchment">x{entry.quantity}</p>
                <button
                  type="button"
                  onClick={() => sellItem(entry.id)}
                  className="mt-auto rounded-lg bg-sage px-3 py-1 text-ink transition-colors hover:bg-gold"
                >
                  Sell {entry.def.sellValue * entry.quantity} gp
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
