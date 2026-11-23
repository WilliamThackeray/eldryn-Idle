import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  CircleDot,
  Crosshair,
  Crown,
  FlaskConical,
  Footprints,
  Gem,
  Hand,
  Layers,
  PawPrint,
  Shield,
  Shirt,
  Sparkles,
  Sword,
  Utensils,
} from 'lucide-react'
import { getItem, type ItemId } from '../data/items'
import { canEquip, type Equipment, type EquipmentSlot } from '../engine/equipment'
import type { Inventory } from '../engine/inventory'
import { levelForXp } from '../engine/xp'
import { itemStatLines } from './itemStatLines'
import { RARITY_BORDER, RARITY_TEXT } from './rarity'
import { cx } from './ui/format'
import { Tooltip } from './ui/Tooltip'

const SLOT_LABEL: Record<EquipmentSlot, string> = {
  helmet: 'Head',
  chest: 'Chest',
  chaps: 'Legs',
  boots: 'Feet',
  gauntlets: 'Hands',
  cloak: 'Cloak',
  belt: 'Belt',
  ring1: 'Ring',
  ring2: 'Ring',
  necklace: 'Neck',
  mainHand: 'Main',
  offHand: 'Off',
  ammo: 'Ammo',
  attuned1: 'Attune',
  attuned2: 'Attune',
  attuned3: 'Attune',
  summon1: 'Summon',
  summon2: 'Summon',
  food: 'Food',
  potion: 'Potion',
}

const SLOT_ICON: Record<EquipmentSlot, LucideIcon> = {
  helmet: Crown,
  necklace: Gem,
  cloak: Layers,
  chest: Shirt,
  belt: CircleDot,
  chaps: Footprints,
  boots: Footprints,
  gauntlets: Hand,
  mainHand: Sword,
  offHand: Shield,
  ring1: Gem,
  ring2: Gem,
  ammo: Crosshair,
  attuned1: Sparkles,
  attuned2: Sparkles,
  attuned3: Sparkles,
  summon1: PawPrint,
  summon2: PawPrint,
  food: Utensils,
  potion: FlaskConical,
}

/** Percent of the figure box. Main hand is the figure's right (viewer's left). */
const BODY_POS: Partial<Record<EquipmentSlot, { top: string; left: string }>> = {
  helmet: { top: '12%', left: '50%' },
  necklace: { top: '23%', left: '50%' },
  cloak: { top: '28%', left: '32%' },
  ammo: { top: '27%', left: '68%' },
  chest: { top: '36%', left: '50%' },
  mainHand: { top: '46%', left: '10%' },
  offHand: { top: '46%', left: '90%' },
  gauntlets: { top: '58%', left: '24%' },
  ring1: { top: '74%', left: '10%' },
  ring2: { top: '74%', left: '90%' },
  belt: { top: '50%', left: '50%' },
  chaps: { top: '68%', left: '50%' },
  boots: { top: '83%', left: '50%' },
}

const RAIL: { title: string; slots: EquipmentSlot[] }[] = [
  { title: 'Attuned', slots: ['attuned1', 'attuned2', 'attuned3'] },
  { title: 'Summon', slots: ['summon1', 'summon2'] },
  { title: 'Quick', slots: ['food', 'potion'] },
]

function fitsSlot(itemId: ItemId, slot: EquipmentSlot): boolean {
  const item = getItem(itemId)
  if (!item) return false
  if (slot === 'ammo') return item.category === 'ammo' || item.gear?.slot === 'ammo'
  if (slot === 'food') return item.category === 'food' || item.gear?.slot === 'food'
  if (slot === 'potion') return item.category === 'potion' || item.gear?.slot === 'potion'
  const gear = item.gear
  if (!gear) return false
  if (slot === 'ring1' || slot === 'ring2') return gear.slot === 'ring'
  if (slot === 'attuned1' || slot === 'attuned2' || slot === 'attuned3') return gear.slot === 'attuned'
  if (slot === 'summon1' || slot === 'summon2') return gear.slot === 'summon'
  if (slot === 'offHand') {
    return gear.slot === 'offHand' || Boolean(gear.shield) || Boolean(gear.weapon?.properties.includes('light'))
  }
  if (slot === 'mainHand') return gear.slot === 'mainHand'
  return gear.slot === slot
}

interface PaperDollProps {
  equipment: Equipment
  inventory: Inventory
  classXp: number
  locked: boolean
  onSelectWorn: (slot: EquipmentSlot) => void
  onEquip: (itemId: ItemId) => void
}

export function PaperDoll({
  equipment,
  inventory,
  classXp,
  locked,
  onSelectWorn,
  onEquip,
}: PaperDollProps) {
  const [openSlot, setOpenSlot] = useState<EquipmentSlot | null>(null)
  const classLevel = levelForXp(classXp)

  const candidates = useMemo(() => {
    if (!openSlot) return []
    return Object.entries(inventory)
      .filter(([, qty]) => (qty ?? 0) > 0)
      .map(([id]) => id as ItemId)
      .filter((id) => fitsSlot(id, openSlot))
  }, [inventory, openSlot])

  function handleSlotClick(slot: EquipmentSlot) {
    const worn = equipment[slot]
    if (worn) {
      setOpenSlot(null)
      onSelectWorn(slot)
      return
    }
    if (locked) return
    setOpenSlot((current) => (current === slot ? null : slot))
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="relative h-[440px] w-[320px] shrink-0">
        <svg viewBox="0 0 200 340" className="absolute left-1/2 h-full w-[260px] -translate-x-1/2" aria-hidden>
          <g fill="#3a342f" stroke="#9a7b64" strokeWidth="2">
            <ellipse cx="100" cy="42" rx="26" ry="30" />
            <path d="M88 68 h24 v16 h-24 z" />
            <path d="M62 88 Q100 78 138 88 L148 168 Q100 186 52 168 Z" />
            <path d="M62 100 Q28 130 26 188 Q42 196 50 176 L72 118 Z" />
            <path d="M138 100 Q172 130 174 188 Q158 196 150 176 L128 118 Z" />
            <path d="M78 164 L68 268 Q82 278 94 266 L102 172 Z" />
            <path d="M122 164 L132 268 Q118 278 106 266 L98 172 Z" />
          </g>
        </svg>
        {(Object.keys(BODY_POS) as EquipmentSlot[]).map((slot) => {
          const pos = BODY_POS[slot]
          if (!pos) return null
          return (
            <div
              key={slot}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: pos.top, left: pos.left }}
            >
              <SlotButton
                slot={slot}
                itemId={equipment[slot]}
                open={openSlot === slot}
                onClick={() => handleSlotClick(slot)}
              />
            </div>
          )
        })}
      </div>

      <div className="space-y-3">
        {RAIL.map((group) => (
          <div key={group.title}>
            <p className="mb-1 text-meta text-muted">{group.title}</p>
            <div className="flex flex-wrap gap-2">
              {group.slots.map((slot) => (
                <SlotButton
                  key={slot}
                  slot={slot}
                  itemId={equipment[slot]}
                  open={openSlot === slot}
                  onClick={() => handleSlotClick(slot)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {openSlot && (
        <div
          role="dialog"
          aria-label={`${SLOT_LABEL[openSlot]} items`}
          className="w-56 rounded-lg border border-line bg-ink p-2 shadow-xl"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-meta font-semibold text-gold">{SLOT_LABEL[openSlot]}</p>
            <button type="button" className="text-meta text-sage" onClick={() => setOpenSlot(null)}>
              Close
            </button>
          </div>
          {candidates.length === 0 ? (
            <p className="text-meta text-muted">No fitting items</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {candidates.map((itemId) => {
                const def = getItem(itemId)
                const reason = canEquip(equipment, itemId, classLevel)
                return (
                  <li key={itemId}>
                    <button
                      type="button"
                      disabled={reason != null || locked}
                      onClick={() => {
                        onEquip(itemId)
                        setOpenSlot(null)
                      }}
                      className="flex w-full flex-col rounded px-2 py-1 text-left text-meta hover:bg-panel disabled:cursor-not-allowed disabled:text-muted"
                    >
                      <span className={def ? RARITY_TEXT[def.rarity] : ''}>{def?.name ?? itemId}</span>
                      {reason && <span className="text-lack">{reason}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function SlotButton({
  slot,
  itemId,
  open,
  onClick,
}: {
  slot: EquipmentSlot
  itemId: ItemId | null
  open: boolean
  onClick: () => void
}) {
  const def = itemId ? getItem(itemId) : undefined
  const label = SLOT_LABEL[slot]
  const Icon = SLOT_ICON[slot]
  const lines = def ? itemStatLines(def.id) : []
  const tip = def ? (
    <span className="block max-w-xs">
      <span className="font-semibold text-gold">{def.name}</span>
      {lines.map((line) => (
        <span key={line} className="mt-0.5 block text-parchment">
          {line}
        </span>
      ))}
    </span>
  ) : (
    label
  )
  const button = (
    <button
      type="button"
      aria-label={def ? def.name : `Empty ${label} slot`}
      aria-expanded={open}
      onClick={onClick}
      className={cx(
        'flex h-12 w-12 flex-col items-center justify-center rounded-lg border bg-ink text-muted',
        def ? RARITY_BORDER[def.rarity] : 'border-line',
        open && 'ring-2 ring-gold',
      )}
    >
      {def?.icon ? (
        <img src={def.icon} alt="" className="h-8 w-8 object-contain" />
      ) : def ? (
        <span className={cx('text-card', RARITY_TEXT[def.rarity])}>{def.name.trim().charAt(0).toUpperCase()}</span>
      ) : (
        <>
          <Icon size={16} aria-hidden />
          <span className="max-w-full truncate text-[10px] leading-none">{label}</span>
        </>
      )}
    </button>
  )
  return <Tooltip content={tip}>{button}</Tooltip>
}
