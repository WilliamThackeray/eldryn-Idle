import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { getItem, type ItemId } from '../data/items'
import { getSkill, type TradeSkillId } from '../data/skills'
import { equipPreview } from '../engine/equipPreview'
import {
  loadoutMissing,
  type Equipment,
  type EquipmentSnapshot,
  type EquipmentSlot,
} from '../engine/equipment'
import type { Inventory } from '../engine/inventory'
import { useGameStore } from '../store/gameStore'
import { Button } from './ui/Button'
import { Drawer } from './ui/Drawer'

const SLOT_ORDER: EquipmentSlot[] = [
  'helmet',
  'chest',
  'chaps',
  'boots',
  'gauntlets',
  'cloak',
  'belt',
  'ring1',
  'ring2',
  'necklace',
  'mainHand',
  'offHand',
  'ammo',
  'attuned1',
  'attuned2',
  'attuned3',
  'summon1',
  'summon2',
  'food',
  'potion',
]

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
  mainHand: 'Main hand',
  offHand: 'Off hand',
  ammo: 'Ammo',
  attuned1: 'Attuned 1',
  attuned2: 'Attuned 2',
  attuned3: 'Attuned 3',
  summon1: 'Summon 1',
  summon2: 'Summon 2',
  food: 'Food',
  potion: 'Potion',
}

type LoadoutKey = TradeSkillId | 'combat'

interface LoadoutDrawerProps {
  loadoutKey: LoadoutKey
  open: boolean
  onClose: () => void
}

function gearSlotOf(itemId: ItemId): string | null {
  const gear = getItem(itemId)?.gear
  if (!gear) {
    const cat = getItem(itemId)?.category
    if (cat === 'ammo' || cat === 'food' || cat === 'potion') return cat
    return null
  }
  return gear.slot
}

function fitsSlot(itemId: ItemId, slot: EquipmentSlot): boolean {
  const gearSlot = gearSlotOf(itemId)
  if (!gearSlot) return false
  if (slot === 'ring1' || slot === 'ring2') return gearSlot === 'ring'
  if (slot === 'attuned1' || slot === 'attuned2' || slot === 'attuned3') return gearSlot === 'attuned'
  if (slot === 'summon1' || slot === 'summon2') return gearSlot === 'summon'
  return gearSlot === slot
}

function skillSortScore(itemId: ItemId, skillId: TradeSkillId): number {
  const stats = getItem(itemId)?.gear?.stats
  if (!stats) return 0
  return (
    (stats.skillCheck?.[skillId] ?? 0) * 1000 +
    (stats.skillXpPct?.[skillId] ?? 0) * 10 +
    (stats.skillSpeedPct?.[skillId] ?? 0)
  )
}

function combatSortScore(
  itemId: ItemId,
  equipment: Equipment,
  inventory: Inventory,
  skills: ReturnType<typeof useGameStore.getState>['skills'],
  classXp: number,
  classId: ReturnType<typeof useGameStore.getState>['classId'],
): number {
  const preview = equipPreview(equipment, inventory, itemId, skills, classXp, classId)
  if (!preview) return 0
  return preview.diffs.toHit * 10 + preview.diffs.ac * 5 - preview.diffs.intervalMs / 1000
}

export function LoadoutDrawer({ loadoutKey, open, onClose }: LoadoutDrawerProps) {
  const equipment = useGameStore((state) => state.equipment)
  const inventory = useGameStore((state) => state.inventory)
  const skillLoadouts = useGameStore((state) => state.skillLoadouts)
  const skills = useGameStore((state) => state.skills)
  const classXp = useGameStore((state) => state.classXp)
  const classId = useGameStore((state) => state.classId)
  const copyCurrentToLoadout = useGameStore((state) => state.copyCurrentToLoadout)
  const clearSkillLoadout = useGameStore((state) => state.clearSkillLoadout)
  const equipSkillLoadout = useGameStore((state) => state.equipSkillLoadout)
  const setLoadoutSlot = useGameStore((state) => state.setLoadoutSlot)
  const [pickedSlot, setPickedSlot] = useState<EquipmentSlot | null>(null)

  const snapshot: EquipmentSnapshot = skillLoadouts[loadoutKey] ?? {}
  const missing = loadoutMissing(equipment, inventory, snapshot)
  const title =
    loadoutKey === 'combat' ? 'Combat loadout' : `${getSkill(loadoutKey).name} loadout`

  const candidates = useMemo(() => {
    if (!pickedSlot) return []
    const ids = Object.keys(inventory).filter(
      (id): id is ItemId => (inventory[id as ItemId] ?? 0) > 0 && fitsSlot(id as ItemId, pickedSlot),
    )
    if (loadoutKey === 'combat') {
      return ids.sort(
        (a, b) =>
          combatSortScore(b, equipment, inventory, skills, classXp, classId) -
          combatSortScore(a, equipment, inventory, skills, classXp, classId),
      )
    }
    return ids.sort((a, b) => skillSortScore(b, loadoutKey) - skillSortScore(a, loadoutKey))
  }, [pickedSlot, inventory, loadoutKey, equipment, skills, classXp, classId])

  return (
    <Drawer open={open} title={title} onClose={onClose}>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => copyCurrentToLoadout(loadoutKey)}>
          Copy current gear
        </Button>
        <Button size="sm" variant="ghost" onClick={() => clearSkillLoadout(loadoutKey)}>
          Clear
        </Button>
        <Button size="sm" onClick={() => equipSkillLoadout(loadoutKey)}>
          Equip now
        </Button>
      </div>

      <ul className="space-y-1">
        {SLOT_ORDER.map((slot) => {
          const itemId = snapshot[slot]
          const isMissing = missing.includes(slot)
          return (
            <li key={slot}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-ink px-2 py-1.5 text-left text-meta hover:border-gold"
                onClick={() => setPickedSlot(slot === pickedSlot ? null : slot)}
              >
                <span className="text-muted">{SLOT_LABEL[slot]}</span>
                <span className="flex items-center gap-1 text-parchment">
                  {isMissing && <AlertTriangle className="h-3.5 w-3.5 text-crimson" aria-label="Missing" />}
                  {itemId ? getItem(itemId)?.name ?? itemId : '—'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {pickedSlot && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-meta text-muted">Fit for {SLOT_LABEL[pickedSlot]}</p>
            <Button size="sm" variant="ghost" onClick={() => setLoadoutSlot(loadoutKey, pickedSlot, null)}>
              Clear slot
            </Button>
          </div>
          {candidates.length === 0 ? (
            <p className="text-meta text-muted">Nothing in inventory fits.</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {candidates.map((itemId) => (
                <li key={itemId}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-1 text-left text-body text-parchment hover:bg-ink"
                    onClick={() => {
                      setLoadoutSlot(loadoutKey, pickedSlot, itemId)
                      setPickedSlot(null)
                    }}
                  >
                    {getItem(itemId)?.name ?? itemId}
                    {loadoutKey !== 'combat' && skillSortScore(itemId, loadoutKey) > 0
                      ? ` (+${skillSortScore(itemId, loadoutKey)})`
                      : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Drawer>
  )
}

export function LoadoutButton({ loadoutKey }: { loadoutKey: LoadoutKey }) {
  const [open, setOpen] = useState(false)
  const equipment = useGameStore((state) => state.equipment)
  const inventory = useGameStore((state) => state.inventory)
  const snapshot = useGameStore((state) => state.skillLoadouts[loadoutKey])
  const missing = loadoutMissing(equipment, inventory, snapshot)

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Loadout
        {missing.length > 0 && (
          <AlertTriangle className="h-3.5 w-3.5 text-crimson" aria-label="Missing items" />
        )}
      </Button>
      <LoadoutDrawer loadoutKey={loadoutKey} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
