import { describe, expect, it } from 'vitest'
import { ACTIVITIES } from '../data/activities'
import { getItem } from '../data/items'
import { SKILLS } from '../data/skills'
import { activityXp } from '../data/activities/define'
import { presentActivity, presentedActivityLabel, newlyVisible, type Viewer } from './presentActivity'
import { xpForLevel } from './xp'

function viewer(patch: Partial<Viewer> = {}): Viewer {
  const skills: Viewer['skills'] = {}
  for (const skill of SKILLS) skills[skill.id] = { xp: 0 }
  return {
    skills,
    renown: 0,
    classId: 'fighter',
    secondaryClassId: null,
    questProgress: {},
    ...patch,
    ...(patch.skills ? { skills: { ...skills, ...patch.skills } } : {}),
  }
}

describe('presentActivity', () => {
  it('hides the name, inputs, and outputs of a locked activity', () => {
    const activity = ACTIVITIES.find((entry) => entry.skillId === 'smithing' && entry.requiredLevel > 1)
    expect(activity).toBeTruthy()
    const view = presentActivity(activity!, viewer())
    expect(view.visible).toBe(false)
    expect(view.label).toBe(`A Smithing activity (Lv ${activity!.requiredLevel})`)
    expect(view.label).not.toContain(activity!.name)
    for (const input of activity!.inputs ?? []) {
      expect(view.label).not.toContain(getItem(input.itemId)?.name ?? input.itemId)
    }
    for (const output of activity!.outputs) {
      expect(view.label).not.toContain(getItem(output.itemId)?.name ?? output.itemId)
    }
    expect(presentedActivityLabel('smithing', activity!.id, viewer())).toBe(view.label)
  })

  it('names a quest lock without the activity', () => {
    const stew = ACTIVITIES.find((entry) => entry.requiresQuest)
    expect(stew).toBeTruthy()
    const high = viewer({ skills: { cooking: { xp: xpForLevel(99) } } })
    const view = presentActivity(stew!, high)
    expect(view.visible).toBe(false)
    expect(view.label).toBe('Requires a quest')
    expect(view.label).not.toContain(stew!.name)
  })

  it('returns exactly the activities a level-up makes visible, including a tome line', () => {
    const before = viewer({ skills: { scribing: { xp: xpForLevel(14) }, mining: { xp: xpForLevel(9) } } })
    const after = viewer({ skills: { scribing: { xp: xpForLevel(14) }, mining: { xp: xpForLevel(10) } } })
    const ids = newlyVisible(before, after).map((activity) => activity.id)
    const mining = ACTIVITIES.filter(
      (activity) => activity.skillId === 'mining' && activity.requiredLevel > 9 && activity.requiredLevel <= 10,
    ).map((activity) => activity.id)
    expect(ids.slice().sort()).toEqual([...mining, 'craft-tome-mining-2'].sort())
  })
})

describe('activity xp', () => {
  it('rises with required level and a level-1 craft does not beat a level-20 gather', () => {
    for (const kind of ['train', 'gather', 'craft'] as const) {
      for (let level = 1; level < 99; level++) {
        expect(activityXp(level, kind)).toBeLessThanOrEqual(activityXp(level + 1, kind))
      }
    }
    expect(activityXp(1, 'craft')).toBeLessThan(activityXp(20, 'gather'))
    expect(activityXp(1, 'gather')).toBeLessThan(activityXp(20, 'gather'))
  })
})
