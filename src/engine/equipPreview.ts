import type { ItemId } from '../data/items'
import type { SkillId } from '../data/skills'
import type { SkillProgress } from '../types/game'
import { playerToHitBonus } from './combat/attack'
import { computePlayerIntervalMs } from './combat/state'
import {
  armorClass,
  equip,
  targetSlot,
  weaponDamageLabel,
  type Equipment,
  type EquipmentSlot,
} from './equipment'
import { deriveAbilities } from './abilities'
import type { Inventory } from './inventory'

export interface EquipPreviewDiffs {
  ac: number
  toHit: number
  damageBefore: string
  damageAfter: string
  intervalMs: number
}

export interface EquipPreview {
  slot: EquipmentSlot
  currentItemId: ItemId | null
  diffs: EquipPreviewDiffs
}

export function equipPreview(
  equipment: Equipment,
  inventory: Inventory,
  itemId: ItemId,
  skills: Record<SkillId, SkillProgress>,
  classXp: number,
): EquipPreview | null {
  const slot = targetSlot(equipment, itemId)
  if (!slot) return null
  const next = equip(equipment, inventory, itemId)
  if (!next) return null

  const dexMod = deriveAbilities(skills).find((a) => a.abbr === 'DEX')?.modifier ?? 0
  const acBefore = armorClass(equipment, dexMod)
  const acAfter = armorClass(next.equipment, dexMod)
  const toHitBefore = playerToHitBonus(skills, equipment, classXp)
  const toHitAfter = playerToHitBonus(skills, next.equipment, classXp)
  const intervalBefore = computePlayerIntervalMs(skills, equipment)
  const intervalAfter = computePlayerIntervalMs(skills, next.equipment)

  return {
    slot,
    currentItemId: equipment[slot],
    diffs: {
      ac: acAfter - acBefore,
      toHit: toHitAfter - toHitBefore,
      damageBefore: weaponDamageLabel(equipment),
      damageAfter: weaponDamageLabel(next.equipment),
      intervalMs: intervalAfter - intervalBefore,
    },
  }
}
