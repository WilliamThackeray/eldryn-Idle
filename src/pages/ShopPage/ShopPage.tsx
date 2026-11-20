import { useMemo, useState } from 'react'
import { RARITY_TEXT } from '../../components/rarity'
import { getItem, type ItemId } from '../../data/items'
import {
  GENERAL_GOODS,
  goodPrice,
  shopDiscountFromUpgrades,
  upgradesForSection,
  type ShopSection,
  type ShopUpgrade,
} from '../../data/shop'
import { SKILLS, type SkillId } from '../../data/skills'
import { activePerks } from '../../engine/abilities'
import { shopDiscountTotal, shopGoldCost } from '../../engine/social'
import { levelForXp } from '../../engine/xp'
import { useGameStore } from '../../store/gameStore'

const SECTIONS: { id: ShopSection; label: string }[] = [
  { id: 'general', label: 'General Store' },
  ...SKILLS.map((skill) => ({ id: skill.id as ShopSection, label: skill.name })),
  { id: 'combat', label: 'Combat' },
]

export function ShopPage() {
  const gold = useGameStore((state) => state.gold)
  const favor = useGameStore((state) => state.favor)
  const inventory = useGameStore((state) => state.inventory)
  const upgrades = useGameStore((state) => state.upgrades)
  const skills = useGameStore((state) => state.skills)
  const buyGood = useGameStore((state) => state.buyGood)
  const buyUpgrade = useGameStore((state) => state.buyUpgrade)
  const [section, setSection] = useState<ShopSection>('general')

  const sectionUpgrades = useMemo(() => upgradesForSection(section), [section])
  const discount = shopDiscountTotal(activePerks({ skills }), upgrades, shopDiscountFromUpgrades)

  return (
    <div className="grid grid-cols-1 gap-6 text-parchment lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="space-y-1">
        <h2 className="mb-2 text-xl font-bold text-gold">Shop</h2>
        {SECTIONS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setSection(entry.id)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              section === entry.id ? 'bg-gold text-ink' : 'bg-panel text-parchment hover:bg-brown/40'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      <div className="space-y-6">
        {section === 'general' && (
          <section>
            <h3 className="mb-3 text-lg font-bold text-gold">Goods</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {GENERAL_GOODS.map((listing) => {
                const def = getItem(listing.itemId)
                const price = goodPrice(listing.itemId, discount)
                if (!def || price == null) return null
                const affordable = gold >= price
                return (
                  <article
                    key={listing.itemId}
                    className="flex flex-col gap-2 rounded-lg border border-brown/40 bg-panel p-4"
                  >
                    <h4 className={`font-bold ${RARITY_TEXT[def.rarity]}`}>{def.name}</h4>
                    <p className="text-sm text-parchment/80">{def.description}</p>
                    <p className="text-sm text-sage">{price} gp</p>
                    <button
                      type="button"
                      disabled={!affordable}
                      onClick={() => buyGood(listing.itemId)}
                      className="mt-auto rounded-lg bg-sage px-3 py-1 text-ink transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Buy
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-3 text-lg font-bold text-gold">Upgrades</h3>
          {sectionUpgrades.length === 0 ? (
            <p className="text-parchment/70">Nothing here yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sectionUpgrades.map((upgrade) => (
                <UpgradeCard
                  key={upgrade.id}
                  upgrade={upgrade}
                  gold={gold}
                  favor={favor}
                  discount={discount}
                  inventory={inventory}
                  ownedTier={upgrades[upgrade.id]}
                  skills={skills}
                  onBuy={() => buyUpgrade(upgrade.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function UpgradeCard({
  upgrade,
  gold,
  favor,
  discount,
  inventory,
  ownedTier,
  skills,
  onBuy,
}: {
  upgrade: ShopUpgrade
  gold: number
  favor: number
  discount: number
  inventory: Partial<Record<ItemId, number>>
  ownedTier: number | undefined
  skills: Record<SkillId, { xp: number }>
  onBuy: () => void
}) {
  const nextIndex = ownedTier == null ? 0 : ownedTier + 1
  const next = upgrade.tiers[nextIndex]
  const ownedCount = ownedTier == null ? 0 : ownedTier + 1
  const total = upgrade.tiers.length
  const maxed = next == null
  const soon = next?.effect.kind === 'soon'
  const requires = next?.requires
  const skillOk =
    !requires || levelForXp(skills[requires.skillId]?.xp ?? 0) >= requires.level
  const items = next?.cost.items ?? []
  const hasItems = items.every((stack) => (inventory[stack.itemId] ?? 0) >= stack.quantity)
  const goldCost = next ? shopGoldCost(next.cost.gold, discount) : 0
  const favorCost = next?.cost.favor ?? 0
  const affordable =
    next != null && gold >= goldCost && favor >= favorCost && hasItems && skillOk
  const disabled = maxed || soon || !affordable

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-brown/40 bg-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold text-gold">{upgrade.name}</h4>
        <span className="text-sm text-sage">
          {ownedCount}/{total}
        </span>
      </div>
      <p className="text-sm text-parchment/80">{upgrade.description}</p>
      {soon && <p className="text-sm text-parchment/60">Coming soon</p>}
      {maxed && !soon && <p className="text-sm text-sage">Maxed</p>}
      {next && !soon && (
        <div className="space-y-1 text-sm">
          <p className={gold >= goldCost ? 'text-sage' : 'text-red-300'}>{goldCost} gp</p>
          {favorCost > 0 && (
            <p className={favor >= favorCost ? 'text-sage' : 'text-red-300'}>{favorCost} Favor</p>
          )}
          {items.map((stack) => {
            const def = getItem(stack.itemId)
            const have = inventory[stack.itemId] ?? 0
            return (
              <p key={stack.itemId} className={have >= stack.quantity ? 'text-parchment' : 'text-red-300'}>
                {def?.name ?? stack.itemId}: {have}/{stack.quantity}
              </p>
            )
          })}
          {requires && (
            <p className={skillOk ? 'text-parchment/70' : 'text-red-300'}>
              Requires {requires.skillId} {requires.level}
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onBuy}
        className="mt-auto rounded-lg bg-sage px-3 py-1 text-ink transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50"
      >
        Buy
      </button>
    </article>
  )
}
