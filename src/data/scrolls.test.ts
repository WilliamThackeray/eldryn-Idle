import { expect, test } from 'vitest'
import { ACTIVITIES } from './activities'
import { DUNGEONS } from './dungeons'
import { getItem } from './items'
import { spellScrollId } from './items/scrolls'
import { MONSTERS } from './monsters'
import { SPELLS } from './spells'
import { buildFightSlots, canInscribe } from '../engine/spells'

test('every spell has a scroll with a scribe recipe or a drop', () => {
  const dropped = new Set<string>()
  for (const monster of MONSTERS) {
    for (const loot of monster.lootTable) dropped.add(loot.itemId)
  }
  for (const dungeon of DUNGEONS) {
    for (const loot of dungeon.chest ?? []) dropped.add(loot.itemId)
  }
  for (const spell of SPELLS) {
    const id = spellScrollId(spell.id)
    expect(getItem(id)?.name, spell.id).toBeTruthy()
    if (spell.level <= 1) {
      expect(ACTIVITIES.some((activity) => activity.id === `scribe-${spell.id}`), spell.id).toBe(true)
    } else {
      expect(dropped.has(id), spell.id).toBe(true)
    }
    expect(ACTIVITIES.some((activity) => activity.id === `inscribe-${spell.id}`), spell.id).toBe(true)
  }
})

test('inscribing gates on scribing level and class list', () => {
  expect(canInscribe({ spellId: 'scorching-ray', scribingLevel: 10, classId: 'wizard', known: [] }).ok).toBe(false)
  expect(canInscribe({ spellId: 'scorching-ray', scribingLevel: 11, classId: 'wizard', known: [] }).ok).toBe(true)
  expect(canInscribe({ spellId: 'scorching-ray', scribingLevel: 11, classId: 'fighter', known: [] }).ok).toBe(false)
  expect(
    canInscribe({ spellId: 'fire-bolt', scribingLevel: 1, classId: 'wizard', known: ['fire-bolt'], mode: 'learn' }).ok,
  ).toBe(false)
  const inscribe = ACTIVITIES.find((activity) => activity.id === 'inscribe-scorching-ray')
  expect(inscribe?.requiredLevel).toBe(11)
  expect(inscribe?.inputs?.map((stack) => stack.itemId)).toEqual(
    expect.arrayContaining(['ink', 'parchment', spellScrollId('scorching-ray')]),
  )
})

test('a spell you do not know cannot be slotted', () => {
  const slots = buildFightSlots({
    classId: 'wizard',
    classTier: 5,
    skillLevel: 99,
    knownSpellIds: ['fire-bolt'],
    loadout: { slots: ['fire-bolt', 'magic-missile', null] },
  })
  expect(slots.some((slot) => slot.spellId === 'fire-bolt')).toBe(true)
  expect(slots.some((slot) => slot.spellId === 'magic-missile')).toBe(false)
})
