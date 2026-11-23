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
import { SKILLS, type TradeSkillId } from '../../data/skills'
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
import { usePageTab } from '../../store/uiPrefs'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Currency } from '../../components/ui/Currency'
import { ItemChip } from '../../components/ui/ItemChip'
import { PageLayout } from '../../components/ui/PageLayout'
import { cx } from '../../components/ui/format'
import type { AbilityAbbr } from '../../types/game'

const SECTIONS: { id: ShopSection; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'class', label: 'Class' },
  ...SKILLS.map((skill) => ({ id: skill.id as ShopSection, label: skill.name })),
  { id: 'combat', label: 'Combat' },
]

const ABILITY_ORDER: AbilityAbbr[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const ABILITY_TEXT: Record<AbilityAbbr, string> = {
  STR: 'text-ability-str',
  DEX: 'text-ability-dex',
  CON: 'text-ability-con',
  INT: 'text-ability-int',
  WIS: 'text-ability-wis',
  CHA: 'text-ability-cha',
}

function openUpgradeCount(section: ShopSection, owned: Record<string, number>): number {
  return upgradesForSection(section).filter((upgrade) => {
    const index = owned[upgrade.id]
    const next = upgrade.tiers[index == null ? 0 : index + 1]
    return next != null && next.effect.kind !== 'soon'
  }).length
}

export function ShopPage() {
  const gold = useGameStore((state) => state.gold)
  const favor = useGameStore((state) => state.favor)
  const inventory = useGameStore((state) => state.inventory)
  const upgrades = useGameStore((state) => state.upgrades)
  const skills = useGameStore((state) => state.skills)
  const buyGood = useGameStore((state) => state.buyGood)
  const buyUpgrade = useGameStore((state) => state.buyUpgrade)
  const [section, setSection] = usePageTab<ShopSection>(
    'shop',
    'general',
    SECTIONS.map((entry) => entry.id),
  )

  const sectionUpgrades = useMemo(() => upgradesForSection(section), [section])
  const discount = shopDiscountTotal(activePerks({ skills }), upgrades, shopDiscountFromUpgrades)

  return (
    <PageLayout>
    <div className="grid grid-cols-1 gap-6 text-parchment lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="space-y-1">
        <h2 className="mb-2 text-section font-bold text-gold">Shop</h2>
        {SECTIONS.filter((entry) => entry.id === 'general' || entry.id === 'class').map((entry) => (
          <SectionButton
            key={entry.id}
            label={entry.label}
            count={openUpgradeCount(entry.id, upgrades)}
            selected={section === entry.id}
            onClick={() => setSection(entry.id)}
          />
        ))}
        {ABILITY_ORDER.map((abbr) => (
          <div key={abbr}>
            <p className={cx('mb-1 mt-3 text-meta font-semibold', ABILITY_TEXT[abbr])}>{abbr}</p>
            {SKILLS.filter((skill) => skill.ability === abbr).map((skill) => (
              <SectionButton
                key={skill.id}
                label={skill.name}
                count={openUpgradeCount(skill.id, upgrades)}
                selected={section === skill.id}
                onClick={() => setSection(skill.id)}
              />
            ))}
          </div>
        ))}
        <p className="mb-1 mt-3 text-meta font-semibold text-gold">Combat</p>
        <SectionButton
          label="Combat"
          count={openUpgradeCount('combat', upgrades)}
          selected={section === 'combat'}
          onClick={() => setSection('combat')}
        />
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
                  <Card key={listing.itemId} className="flex flex-col gap-2">
                    <h4 className={`font-bold ${RARITY_TEXT[def.rarity]}`}>{def.name}</h4>
                    <p className="text-body text-muted">{def.description}</p>
                    <Currency kind="gp" amount={price} />
                    <Button
                      size="sm"
                      className="mt-auto"
                      disabled={!affordable}
                      disabledReason={affordable ? undefined : `Need ${price} gp`}
                      onClick={() => buyGood(listing.itemId)}
                    >
                      Buy
                    </Button>
                  </Card>
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
    </PageLayout>
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
                    <Button
                      size="sm"
                      disabled={!eligible}
                      disabledReason={eligible ? undefined : multiclassReason(locked, isInDungeonOrQuest, gaps.length > 0, secondaryClassId != null, gold >= mCost.gold)}
                      onClick={() => buyMulticlass(entry.id)}
                    >
                      Multiclass
                    </Button>
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
                  <Button
                    size="sm"
                    variant="danger"
                    className="mt-3"
                    disabled={locked}
                    disabledReason={
                      locked
                        ? isInDungeonOrQuest
                          ? 'Leave the dungeon or quest first'
                          : 'Create a character first'
                        : undefined
                    }
                    onClick={() => {
                      setRebirthPick(entry.id)
                      setConfirmOpen(true)
                    }}
                  >
                    Rebirth as {entry.name}
                  </Button>
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
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!affordable}
            disabledReason={affordable ? undefined : 'Not enough gold or materials'}
            onClick={onConfirm}
          >
            Confirm Rebirth
          </Button>
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
  skills: Record<TradeSkillId, { xp: number }>
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
    <Card variant={soon ? 'muted' : 'default'} className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold text-gold">{upgrade.name}</h4>
        <span className="text-meta text-muted" aria-label={`Tier ${ownedCount} of ${total}`}>
          {Array.from({ length: total }, (_, index) => (
            <span key={index} className={index < ownedCount ? 'text-gold' : 'text-muted'}>
              {index < ownedCount ? '●' : '○'}
            </span>
          ))}
        </span>
      </div>
      <p className="text-body text-muted">{upgrade.description}</p>
      {soon && <p className="text-meta text-muted">Coming soon</p>}
      {maxed && !soon && <p className="text-meta text-sage">Maxed</p>}
      {next && !soon && (
        <div className="flex flex-wrap gap-2">
          <Currency kind="gp" amount={goldCost} />
          {favorCost > 0 && <Currency kind="favor" amount={favorCost} />}
          {items.map((stack) => (
            <ItemChip
              key={stack.itemId}
              name={getItem(stack.itemId)?.name ?? stack.itemId}
              owned={inventory[stack.itemId] ?? 0}
              needed={stack.quantity}
            />
          ))}
          {requires && (
            <p className={skillOk ? 'text-meta text-muted' : 'text-meta text-lack'}>
              Requires {requires.skillId} {requires.level}
            </p>
          )}
        </div>
      )}
      <Button
        size="sm"
        className="mt-auto"
        disabled={disabled}
        disabledReason={buyBlockReason({
          maxed,
          soon,
          skillOk,
          requires,
          gold,
          goldCost,
          favor,
          favorCost,
          hasItems,
        })}
        onClick={onBuy}
      >
        Buy
      </Button>
    </Card>
  )
}

function SectionButton({
  label,
  count,
  selected,
  onClick,
}: {
  label: string
  count: number
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-body',
        selected ? 'bg-gold text-ink' : 'text-parchment hover:bg-panel',
      )}
    >
      <span>{label}</span>
      <span className={cx('text-meta', selected ? 'text-ink' : 'text-muted')}>{count}</span>
    </button>
  )
}

function multiclassReason(
  locked: boolean,
  inRun: boolean,
  hasGaps: boolean,
  hasSecondary: boolean,
  hasGold: boolean,
): string {
  if (inRun) return 'Leave the dungeon or quest first'
  if (locked) return 'Create a character first'
  if (hasSecondary) return 'Secondary class already set'
  if (hasGaps) return 'Ability ranks not met'
  if (!hasGold) return 'Not enough gold or materials'
  return 'Not enough gold or materials'
}

function buyBlockReason(input: {
  maxed: boolean
  soon: boolean
  skillOk: boolean
  requires: { skillId: string; level: number } | undefined
  gold: number
  goldCost: number
  favor: number
  favorCost: number
  hasItems: boolean
}): string | undefined {
  if (!input.maxed && !input.soon && input.skillOk && input.gold >= input.goldCost && input.favor >= input.favorCost && input.hasItems) {
    return undefined
  }
  if (input.maxed) return 'Maxed'
  if (input.soon) return 'Coming soon'
  if (!input.skillOk && input.requires) return `Requires ${input.requires.skillId} ${input.requires.level}`
  if (input.gold < input.goldCost) return `Need ${input.goldCost} gp`
  if (input.favor < input.favorCost) return 'Not enough Favor'
  if (!input.hasItems) return 'Missing materials'
  return 'Cannot buy'
}
