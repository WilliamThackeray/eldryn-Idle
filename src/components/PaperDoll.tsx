import { useMemo, useState } from 'react'
import { getItem, type ItemId } from '../data/items'
import { canEquip, type Equipment, type EquipmentSlot } from '../engine/equipment'
import type { Inventory } from '../engine/inventory'
import { levelForXp } from '../engine/xp'
import { RARITY_BORDER, RARITY_TEXT } from './rarity'

const SLOT_LABEL: Record<EquipmentSlot, string> = {
  helmet: 'Head',
  chest: 'Chest',
  chaps: 'Legs',
  boots: 'Feet',
  gauntlets: 'Gauntlets',
  cloak: 'Cloak',
  belt: 'Belt',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
  necklace: 'Neck',
  mainHand: 'Main hand',
  offHand: 'Offhand',
  ammo: 'Ammo',
  attuned1: 'Attuned 1',
  attuned2: 'Attuned 2',
  attuned3: 'Attuned 3',
  summon1: 'Summon 1',
  summon2: 'Summon 2',
  food: 'Food',
  potion: 'Potion',
}

/** Row-major body grid: head alone on top, then 4×3. */
const BODY_ROWS: (EquipmentSlot | null)[][] = [
  [null, 'helmet', null],
  ['cloak', 'necklace', 'ammo'],
  ['mainHand', 'chest', 'offHand'],
  ['gauntlets', 'chaps', 'belt'],
  ['ring1', 'boots', 'ring2'],
]

const RAIL_SLOTS: EquipmentSlot[] = [
  'attuned1',
  'attuned2',
  'attuned3',
  'summon1',
  'summon2',
  'food',
  'potion',
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

  function SlotButton({ slot, compact = false }: { slot: EquipmentSlot; compact?: boolean }) {
    const id = equipment[slot]
    const def = id ? getItem(id) : undefined
    const label = SLOT_LABEL[slot]
    const initial = def ? def.name.trim().charAt(0).toUpperCase() : ''
    const border = def ? RARITY_BORDER[def.rarity] : 'border-brown/40'
    if (compact) {
      return (
        <button
          type="button"
          title={def?.name ?? label}
          onClick={() => handleSlotClick(slot)}
          className={`flex items-center gap-2 rounded-md border bg-panel/80 px-2 py-1.5 text-left text-xs ${border}`}
        >
          <span
            className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded font-bold ${
              def ? RARITY_TEXT[def.rarity] : 'text-parchment/40'
            }`}
          >
            {def?.icon ? (
              <img src={def.icon} alt="" className="h-7 w-7 object-contain" />
            ) : def ? (
              initial
            ) : (
              '·'
            )}
          </span>
          <span className="text-parchment/80">{def?.name ?? label}</span>
        </button>
      )
    }
    return (
      <button
        type="button"
        title={def?.name ?? label}
        onClick={() => handleSlotClick(slot)}
        className={`relative flex h-[4.5rem] w-[4.5rem] flex-col items-start rounded-lg border bg-panel/90 p-1.5 text-left ${border}`}
      >
        <span className="relative z-10 text-[11px] leading-tight text-parchment/85">{label}</span>
        {def?.icon ? (
          <img src={def.icon} alt="" className="pointer-events-none absolute inset-1 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] object-contain" />
        ) : (
          def && (
            <span className={`mt-auto self-end text-lg font-bold leading-none ${RARITY_TEXT[def.rarity]}`}>
              {initial}
            </span>
          )
        )}
      </button>
    )
  }

  return (
    <div className="relative flex flex-wrap gap-4">
      <div className="grid grid-cols-3 gap-2">
        {BODY_ROWS.flatMap((row, rowIndex) =>
          row.map((slot, colIndex) => {
            const key = `${rowIndex}-${colIndex}`
            if (!slot) return <div key={key} className="h-[4.5rem] w-[4.5rem]" aria-hidden />
            return <SlotButton key={slot} slot={slot} />
          }),
        )}
      </div>

      <div className="flex min-w-[140px] flex-col gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-sage">Rail</h4>
        {RAIL_SLOTS.map((slot) => (
          <SlotButton key={slot} slot={slot} compact />
        ))}
      </div>

      {openSlot && (
        <div className="absolute right-0 top-0 z-30 w-56 rounded-lg border border-brown/40 bg-ink p-2 shadow-xl">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-gold">{SLOT_LABEL[openSlot]}</p>
            <button type="button" className="text-xs text-sage" onClick={() => setOpenSlot(null)}>
              Close
            </button>
          </div>
          {candidates.length === 0 ? (
            <p className="text-xs text-parchment/60">No fitting items</p>
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
                      className="flex w-full flex-col rounded px-2 py-1 text-left text-xs hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className={def ? RARITY_TEXT[def.rarity] : ''}>{def?.name ?? itemId}</span>
                      {reason && <span className="text-crimson">{reason}</span>}
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
