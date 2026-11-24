import { getItem, type DamageType } from '../../data/items'
import type { MonsterDef } from '../../data/monsters'
import { applyDamageModifiers, applyTriangle, triangleNote } from '../damage'
import { rollD20, rollDamageParts } from '../dice'
import type { Equipment } from '../equipment'
import type { Rng } from '../rng'
import { modifiedAc } from './monsterMods'
import { type CombatFight, pushLog } from './state'

export type SummonSlotId = 'summon1' | 'summon2'

/** Read summon stats from an equipped summon item. */
export function summonOf(equipment: Equipment, slot: SummonSlotId) {
  const itemId = equipment[slot]
  if (!itemId) return null
  const gear = getItem(itemId)?.gear
  if (!gear?.summon) return null
  return { itemId, name: getItem(itemId)?.name ?? itemId, ...gear.summon }
}

function damageTypeFor(itemId: string): { damageType: DamageType; style: 'melee' | 'magic' } {
  const tags = getItem(itemId)?.tags ?? []
  if (tags.includes('fire')) return { damageType: 'fire', style: 'magic' }
  if (tags.includes('earth')) return { damageType: 'bludgeoning', style: 'melee' }
  if (tags.includes('shadow')) return { damageType: 'necrotic', style: 'magic' }
  if (tags.includes('undead') || tags.includes('piercing')) return { damageType: 'piercing', style: 'melee' }
  return { damageType: 'slashing', style: 'melee' }
}

/**
 * One summon swing. Monsters do not target summons.
 * TODO(design): should monsters target summons?
 */
export function resolveSummonAttack(input: {
  fight: CombatFight
  monster: MonsterDef
  equipment: Equipment
  slot: SummonSlotId
  rng: Rng
  trace: boolean
}): { killed: boolean } {
  const { fight, monster, equipment, slot, rng, trace } = input
  const summon = summonOf(equipment, slot)
  if (!summon) return { killed: false }

  const { damageType, style } = damageTypeFor(summon.itemId)
  const natural = rollD20(rng)
  const total = natural + summon.toHit
  const autoMiss = natural === 1
  const hit = !autoMiss && (natural === 20 || total >= modifiedAc(monster, fight.monsterMods, fight.toHitPenaltyLeft > 0 ? fight.toHitPenalty : 0))
  let line = `${summon.name}: to hit ${total} - ${hit ? 'hits' : 'misses'}.`
  if (!hit) {
    pushLog(fight, line, trace)
    return { killed: false }
  }

  const parts = rollDamageParts(summon.damage, rng, natural === 20)
  const resisted = applyDamageModifiers(
    parts.total,
    damageType,
    monster.resistances,
    monster.vulnerabilities,
    monster.immunities,
  )
  const dealt = applyTriangle(resisted, style, monster.archetype)
  fight.monsterHp = Math.max(0, fight.monsterHp - dealt)
  line += ` [${summon.damage}] ${dealt} ${damageType}${triangleNote(style, monster.archetype)}.`
  pushLog(fight, line, trace)
  return { killed: fight.monsterHp <= 0 }
}
