import { useMemo, useState } from 'react'
import { ClassCard } from '../../components/ClassCard'
import { RARITY_TEXT } from '../../components/rarity'
import { CLASSES, getClass, type ClassId, type ClericFocus } from '../../data/classes'
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
import { ECHO_XP_PCT } from '../../engine/config'
import {
  canMulticlass,
  formatMulticlassGaps,
  multiclassCost,
  multiclassGaps,
  rebirthCost,
} from '../../engine/multiclass'
import { shopDiscountTotal, shopGoldCost } from '../../engine/social'
import { levelForXp } from '../../engine/xp'
import { useGameStore } from '../../store/gameStore'

const SECTIONS: { id: ShopSection; label: string }[] = [
  { id: 'general', label: 'General Store' },
  { id: 'class', label: 'Class' },
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

        {section === 'class' ? (
          <ClassShop discount={discount} />
        ) : (
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
        )}
      </div>
    </div>
  )
}

function ClassShop({ discount }: { discount: number }) {
  const gold = useGameStore((state) => state.gold)
  const inventory = useGameStore((state) => state.inventory)
  const skills = useGameStore((state) => state.skills)
  const classId = useGameStore((state) => state.classId)
  const secondaryClassId = useGameStore((state) => state.secondaryClassId)
  const echoes = useGameStore((state) => state.echoes)
  const isInDungeonOrQuest = useGameStore((state) => state.isInDungeonOrQuest)
  const buyMulticlass = useGameStore((state) => state.buyMulticlass)
  const rebirth = useGameStore((state) => state.rebirth)
  const [rebirthPick, setRebirthPick] = useState<ClassId | null>(null)
  const [rebirthFocus, setRebirthFocus] = useState<ClericFocus>('INT')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const mCost = multiclassCost(discount)
  const rCost = rebirthCost(echoes, discount)
  const locked = isInDungeonOrQuest || !classId

  return (
    <div className="space-y-8">
      {locked && (
        <p className="text-sm text-crimson">
          {isInDungeonOrQuest
            ? 'Leave the dungeon or quest before Multiclass or Rebirth.'
            : 'Create a character first.'}
        </p>
      )}

      <section>
        <h3 className="mb-1 text-lg font-bold text-gold">Multiclass</h3>
        <p className="mb-3 text-sm text-parchment/70">
          Add one secondary class. It earns 25% of combat XP. Signature at secondary Class Level 5.
          {secondaryClassId
            ? ` Current secondary: ${getClass(secondaryClassId).name}.`
            : ''}
        </p>
        <CostLines gold={gold} inventory={inventory} cost={mCost} />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CLASSES.filter((entry) => entry.id !== classId).map((entry) => {
            const gaps = multiclassGaps(entry.id, skills)
            const eligible =
              !locked &&
              canMulticlass({
                primaryClassId: classId,
                secondaryClassId,
                targetClassId: entry.id,
                skills,
                isInDungeonOrQuest,
              }) &&
              gold >= mCost.gold &&
              mCost.items.every((stack) => (inventory[stack.itemId] ?? 0) >= stack.quantity)
            return (
              <ClassCard
                key={entry.id}
                entry={entry}
                disabled={!eligible}
                footer={
                  <div className="mt-3 space-y-2">
                    {gaps.length > 0 ? (
                      <p className="text-xs text-crimson">{formatMulticlassGaps(gaps)}</p>
                    ) : secondaryClassId != null ? (
                      <p className="text-xs text-parchment/60">Secondary class already set.</p>
                    ) : (
                      <p className="text-xs text-sage">Ranks met.</p>
                    )}
                    <button
                      type="button"
                      disabled={!eligible}
                      onClick={() => buyMulticlass(entry.id)}
                      className="rounded-lg bg-sage px-3 py-1 text-sm text-ink hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Multiclass
                    </button>
                  </div>
                }
              />
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-lg font-bold text-gold">Rebirth</h3>
        <p className="mb-3 text-sm text-parchment/70">
          Choose a new primary class. Class Level resets to 1. Each rebirth grants +{ECHO_XP_PCT}% all
          XP (Echo). Skills, items, upgrades, Ranks, History, and quests stay. Secondary class is
          removed.
        </p>
        <CostLines gold={gold} inventory={inventory} cost={rCost} />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CLASSES.map((entry) => {
            const selected = rebirthPick === entry.id
            return (
              <ClassCard
                key={entry.id}
                entry={entry}
                selected={selected}
                disabled={locked}
                onSelect={() => setRebirthPick(entry.id)}
                clericFocus={rebirthFocus}
                onClericFocus={setRebirthFocus}
                footer={
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      setRebirthPick(entry.id)
                      setConfirmOpen(true)
                    }}
                    className="mt-3 rounded-lg bg-crimson px-3 py-1 text-sm text-parchment hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Rebirth as {entry.name}
                  </button>
                }
              />
            )
          })}
        </div>
      </section>

      {confirmOpen && rebirthPick && (
        <RebirthConfirm
          classId={rebirthPick}
          cost={rCost}
          hasSecondary={secondaryClassId != null}
          secondaryName={secondaryClassId ? getClass(secondaryClassId).name : null}
          echoes={echoes}
          gold={gold}
          inventory={inventory}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            rebirth(rebirthPick, rebirthFocus)
            setConfirmOpen(false)
            setRebirthPick(null)
          }}
        />
      )}
    </div>
  )
}

function CostLines({
  gold,
  inventory,
  cost,
}: {
  gold: number
  inventory: Partial<Record<ItemId, number>>
  cost: { gold: number; items: { itemId: ItemId; quantity: number }[] }
}) {
  return (
    <div className="space-y-1 text-sm">
      <p className={gold >= cost.gold ? 'text-sage' : 'text-crimson'}>{cost.gold} gp</p>
      {cost.items.map((stack) => {
        const have = inventory[stack.itemId] ?? 0
        return (
          <p key={stack.itemId} className={have >= stack.quantity ? 'text-parchment' : 'text-crimson'}>
            {getItem(stack.itemId)?.name ?? stack.itemId}: {have}/{stack.quantity}
          </p>
        )
      })}
    </div>
  )
}

function RebirthConfirm({
  classId,
  cost,
  hasSecondary,
  secondaryName,
  echoes,
  gold,
  inventory,
  onCancel,
  onConfirm,
}: {
  classId: ClassId
  cost: { gold: number; items: { itemId: ItemId; quantity: number }[] }
  hasSecondary: boolean
  secondaryName: string | null
  echoes: number
  gold: number
  inventory: Partial<Record<ItemId, number>>
  onCancel: () => void
  onConfirm: () => void
}) {
  const affordable =
    gold >= cost.gold &&
    cost.items.every((stack) => (inventory[stack.itemId] ?? 0) >= stack.quantity)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4">
      <div
        role="dialog"
        aria-labelledby="rebirth-title"
        className="max-w-md rounded-lg border border-brown/40 bg-panel p-5 shadow-xl"
      >
        <h3 id="rebirth-title" className="text-xl font-bold text-gold">
          Confirm Rebirth
        </h3>
        <p className="mt-2 text-sm">
          Become a {getClass(classId).name}. Class Level resets to 1. You gain Echo {echoes + 1} (+
          {ECHO_XP_PCT}% all XP, permanent).
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-parchment/80">
          <li>Resets: Class Level</li>
          {hasSecondary && (
            <li className="text-crimson">
              Removes secondary class ({secondaryName}). This cannot be undone without buying Multiclass
              again.
            </li>
          )}
          <li>Stays: skills, items, upgrades, Ability Ranks, History bonuses, quests</li>
        </ul>
        <div className="mt-3">
          <CostLines gold={gold} inventory={inventory} cost={cost} />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-brown px-3 py-2 text-parchment hover:bg-crimson"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!affordable}
            onClick={onConfirm}
            className="rounded-lg bg-crimson px-3 py-2 text-parchment hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm Rebirth
          </button>
        </div>
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
