import { Package, type LucideIcon } from 'lucide-react'
import { RARITY_TEXT } from './rarity'
import type { ClassId } from '../data/classes'
import { isWeaponProficient } from '../data/classes'
import { getItem, type ItemCategory, type ItemId } from '../data/items'
import { canEquip, targetSlot, type Equipment, type EquipmentSlot } from '../engine/equipment'
import { equipPreview } from '../engine/equipPreview'
import type { Inventory } from '../engine/inventory'
import { sourcesOf, usesOf, type ItemLink } from '../engine/itemIndex'
import { levelForXp } from '../engine/xp'
import type { SkillId } from '../data/skills'
import type { SkillProgress } from '../types/game'

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

interface ItemDetailProps {
  itemId: ItemId | null
  owned: number
  equipment: Equipment
  inventory: Inventory
  skills: Record<SkillId, SkillProgress>
  classXp: number
  classId?: ClassId | null
  isInDungeonOrQuest: boolean
  categoryIcon?: LucideIcon
  /** Inventory: sell + equip. Worn: unequip only. */
  mode: 'inventory' | 'worn'
  sellQty?: number
  sellPreview?: number
  onSellQtyChange?: (qty: number) => void
  onSell?: () => void
  onEquip?: () => void
  onUnequip?: () => void
  onOpenLink?: (link: ItemLink) => void
  emptyLabel?: string
}

export function ItemDetail({
  itemId,
  owned,
  equipment,
  inventory,
  skills,
  classXp,
  classId = null,
  isInDungeonOrQuest,
  categoryIcon: Icon = Package,
  mode,
  sellQty = 1,
  sellPreview = 0,
  onSellQtyChange,
  onSell,
  onEquip,
  onUnequip,
  onOpenLink,
  emptyLabel = 'Select an item',
}: ItemDetailProps) {
  const selected = itemId ? getItem(itemId) : undefined
  if (!selected || !itemId || (mode === 'inventory' && owned <= 0)) {
    return <p className="text-parchment/70">{emptyLabel}</p>
  }

  const classLevel = levelForXp(classXp)
  const equipReason = canEquip(equipment, itemId, classLevel)
  const preview =
    mode === 'inventory' && equipReason == null
      ? equipPreview(equipment, inventory, itemId, skills, classXp, classId)
      : null
  const equippable =
    Boolean(selected.gear) ||
    selected.category === 'ammo' ||
    selected.category === 'food' ||
    selected.category === 'potion'
  const notProficient =
    Boolean(selected.gear?.weapon) && !isWeaponProficient(classId, itemId)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        {selected.icon ? (
          <img src={selected.icon} alt="" className="h-12 w-12 shrink-0 object-contain" />
        ) : (
          <Icon size={28} className="shrink-0 text-sage" />
        )}
        <div className="min-w-0">
          <h2 className={`text-lg font-bold ${RARITY_TEXT[selected.rarity]}`}>{selected.name}</h2>
          <p className="text-xs capitalize text-sage">
            {selected.rarity} · {CATEGORY_LABEL[selected.category]}
          </p>
          {notProficient && <p className="text-xs text-crimson">Not proficient</p>}
        </div>
      </div>

      <p className="text-sm text-parchment/80">{selected.description}</p>
      {mode === 'inventory' && (
        <p className="text-sm">
          Owned: <span className="font-bold text-gold">{owned}</span>
        </p>
      )}

      {mode === 'inventory' && onSell && onSellQtyChange && (
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
            onChange={(event) => onSellQtyChange(Number(event.target.value))}
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
                onSellQtyChange(Math.min(owned, Math.max(1, Math.floor(next))))
              }}
              className="w-20 rounded border border-brown/40 bg-ink/50 px-2 py-1 text-sm"
            />
            <span className="text-sm text-parchment/70">= {sellPreview} gp</span>
          </div>
          <button
            type="button"
            onClick={onSell}
            className="w-full rounded-lg bg-sage px-3 py-1.5 text-sm text-ink transition-colors hover:bg-gold"
          >
            Sell
          </button>
        </div>
      )}

      <StatLines itemId={itemId} />

      {mode === 'inventory' && equippable && (
        <div className="space-y-2 rounded border border-brown/40 p-3 text-sm">
          {equipReason && <p className="text-crimson">{equipReason}</p>}
          <EquipBlock
            itemId={itemId}
            slot={preview?.slot ?? targetSlot(equipment, itemId)}
            equipment={equipment}
            preview={preview}
            disabled={isInDungeonOrQuest || equipReason != null}
            onEquip={() => onEquip?.()}
          />
        </div>
      )}

      {mode === 'worn' && onUnequip && (
        <button
          type="button"
          disabled={isInDungeonOrQuest}
          onClick={onUnequip}
          className="w-full rounded-lg bg-crimson px-3 py-1.5 text-parchment transition-colors hover:bg-brown disabled:cursor-not-allowed disabled:opacity-40"
        >
          Unequip
        </button>
      )}

      {onOpenLink && (
        <>
          <LinkList title="Obtained from" links={sourcesOf(itemId)} onOpen={onOpenLink} />
          <LinkList title="Used in" links={usesOf(itemId)} onOpen={onOpenLink} />
        </>
      )}
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
  equipment: Equipment
  preview: ReturnType<typeof equipPreview>
  disabled: boolean
  onEquip: () => void
}) {
  const def = getItem(itemId)
  const isFood = def?.category === 'food' || def?.gear?.slot === 'food'
  const isPotion = def?.category === 'potion' || def?.gear?.slot === 'potion'
  const label = isFood ? 'Assign to food slot' : isPotion ? 'Assign to potion slot' : 'Equip'

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
    if (diffs.notProficient) diffLines.push('Not proficient')
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
