import { TRADITION_REAGENT, getClass, type ClassId } from '../classes'
import type { ItemId } from '../items'
import { spellScrollId } from '../items/scrolls'
import { SPELLS } from '../spells'
import { unlockSkillLevel } from '../../engine/spells'
import { activity, drop, stack } from './define'
import type { ActivityDef } from './types'

const SCROLL_WORD = {
  arcane: 'Arcane Scroll',
  divine: 'Prayer Scroll',
  primal: 'Druidic Rune',
  bardic: 'Bardic Score',
} as const

function reagentFor(classId: ClassId): ItemId {
  const casting = getClass(classId).spellcasting
  if (casting.casterType === 'none') return 'arcane-dust'
  return TRADITION_REAGENT[casting.tradition]
}

export const scrollActivities: ActivityDef[] = SPELLS.flatMap((spell, index) => {
  const scroll = spellScrollId(spell.id) as ItemId
  const caster = spell.classes[0] ?? 'wizard'
  const word = SCROLL_WORD[reagentTradition(caster)]
  const need = unlockSkillLevel(spell.level)
  const inscribe = activity({
    skillId: 'scribing',
    id: `inscribe-${spell.id}`,
    name: `Inscribe ${spell.name}`,
    description: `Spend the ${word.toLowerCase()}, ink, and parchment to learn ${spell.name}.`,
    requiredLevel: need,
    inputs: [stack(scroll), stack('ink'), stack('parchment')],
    outputs: [],
    category: 'Inscribing',
    group: spell.level === 0 ? 'Cantrips' : `Level ${spell.level}`,
    sortOrder: 1000 + spell.level * 100 + index,
    learnSpell: spell.id,
  })
  if (spell.level > 1) return [inscribe]
  const scribe = activity({
    skillId: 'scribing',
    id: `scribe-${spell.id}`,
    name: `Scribe ${spell.name}`,
    description: `Copy ${spell.name} onto parchment.`,
    requiredLevel: need,
    inputs: [stack('parchment'), stack('ink'), stack(reagentFor(caster))],
    outputs: [drop(scroll)],
    category: 'Scrolls',
    group: spell.level === 0 ? 'Cantrips' : 'Level 1',
    sortOrder: spell.level * 100 + index,
  })
  return [scribe, inscribe]
})

function reagentTradition(classId: ClassId): keyof typeof SCROLL_WORD {
  const casting = getClass(classId).spellcasting
  if (casting.casterType === 'none') return 'arcane'
  return casting.tradition
}
