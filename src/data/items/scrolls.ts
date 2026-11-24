import { SPELLS } from '../spells'
import type { ItemDef } from './types'

const TRADITION = {
  wizard: 'arcane',
  sorcererWarlock: 'arcane',
  cleric: 'divine',
  paladin: 'divine',
  druid: 'primal',
  ranger: 'primal',
  bard: 'bardic',
} as const

const SCROLL_WORD = {
  arcane: 'Arcane Scroll',
  divine: 'Prayer Scroll',
  primal: 'Druidic Rune',
  bardic: 'Bardic Score',
} as const

export function spellScrollId(spellId: string): string {
  return `spell_scroll:${spellId}`
}

function traditionOf(classId: string): keyof typeof SCROLL_WORD {
  return TRADITION[classId as keyof typeof TRADITION] ?? 'arcane'
}

export const SPELL_SCROLLS: ItemDef[] = SPELLS.map((spell) => {
  const tradition = traditionOf(spell.classes[0] ?? 'wizard')
  const word = SCROLL_WORD[tradition]
  const rarity = spell.level >= 3 ? 'rare' : spell.level === 2 ? 'uncommon' : 'common'
  return {
    id: spellScrollId(spell.id),
    name: `${word}: ${spell.name}`,
    description: `A ${word.toLowerCase()} of ${spell.name}. Inscribe it in Scribing to learn the spell.`,
    category: 'misc',
    rarity,
    stackable: true,
    sellValue: 4 + spell.level * 4,
    tags: ['spell-scroll', tradition],
  }
})
