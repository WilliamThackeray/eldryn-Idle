import { expect, test } from 'vitest'
import { SKILLS } from '../skills'
import { activitiesFor } from './index'
import { skillUsesTabs, SKILL_TABS, visibleActivities } from './display'

test('tabbed skills categorize every activity and leave no empty tab', () => {
  for (const skill of SKILLS) {
    const activities = activitiesFor(skill.id)
    if (!skillUsesTabs(skill.id, activities)) {
      expect(SKILL_TABS[skill.id]).toBeUndefined()
      continue
    }
    expect(activities.every((activity) => activity.category), skill.id).toBe(true)
    const declared = SKILL_TABS[skill.id]
    expect(declared, skill.id).toBeTruthy()
    for (const tab of declared!) {
      expect(
        activities.some((activity) => activity.category === tab),
        `${skill.id} ${tab}`,
      ).toBe(true)
    }
    for (const activity of activities) {
      expect(declared, activity.id).toContain(activity.category)
    }
  }

  const tiers = new Set(['Iron', 'Steel', 'Silvered', 'Mithral', 'Adamantine'])
  const sections = new Set(['Weapons', 'Armor', 'Shields', 'Ammo/Other'])
  for (const activity of activitiesFor('smithing').filter((entry) => entry.category === 'Armor')) {
    const [tier, section] = activity.group?.split(' / ') ?? []
    expect(tiers.has(tier ?? ''), activity.id).toBe(true)
    expect(sections.has(section ?? ''), activity.id).toBe(false)
    expect(section).toBeTruthy()
  }

  expect(skillUsesTabs('vitality', activitiesFor('vitality'))).toBe(false)
})

test('locked activities keep the next one and collapse the rest', () => {
  const items = [
    { id: 'a', locked: false },
    { id: 'b', locked: true },
    { id: 'c', locked: true },
  ]
  expect(visibleActivities(items, false, false)).toEqual({
    shown: [items[0], items[1]],
    hiddenLocked: 1,
  })
  expect(visibleActivities(items, true, false).shown).toEqual([items[0]])
  expect(visibleActivities(items, false, true).hiddenLocked).toBe(0)
})
