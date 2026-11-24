import { describe, expect, it } from 'vitest'
import { ACTIVITIES } from '.'
import { getItem } from '../items'
import { SKILLS, type TradeSkillId } from '../skills'
import { SPELLS } from '../spells'
import { MATERIAL_ITEM_BAND, MATERIAL_LEVEL } from '../../engine/config'
import { TOME_FIRST_LEVEL, TOME_LEVEL_STEP, TOME_SKILL_GATE_STEP } from '../../engine/config'
import { unlockSkillLevel } from '../../engine/spells'
import { countsTowardCap } from './capLevels'

const TRADE = SKILLS.map((skill) => skill.id).filter((id) => id !== 'vitality')

function ladder(skillId: TradeSkillId) {
  return ACTIVITIES.filter((activity) => activity.skillId === skillId && countsTowardCap(activity))
}

function levelsOf(skillId: TradeSkillId): number[] {
  return [...new Set(ladder(skillId).map((activity) => activity.requiredLevel))].sort((a, b) => a - b)
}

function bandOf(itemId: string): number | undefined {
  const mapped = MATERIAL_ITEM_BAND[itemId as keyof typeof MATERIAL_ITEM_BAND]
  if (mapped) return mapped
  const material = getItem(itemId)?.gear?.material
  return material ? MATERIAL_LEVEL[material] : undefined
}

describe('unlock pacing', () => {
  for (const skillId of TRADE) {
    it(`${skillId} stays inside the ladder rules`, () => {
      const rows = ladder(skillId)
      const at1 = rows.filter((activity) => activity.requiredLevel === 1)
      expect(at1.length, `${skillId} level 1 has ${at1.map((a) => a.name).join(', ')}`).toBeGreaterThanOrEqual(1)
      expect(at1.length, `${skillId} level 1 has ${at1.map((a) => a.name).join(', ')}`).toBeLessThanOrEqual(3)

      const byLevel = new Map<number, string[]>()
      for (const activity of rows) {
        const names = byLevel.get(activity.requiredLevel) ?? []
        names.push(activity.name)
        byLevel.set(activity.requiredLevel, names)
      }
      for (const [level, names] of byLevel) {
        expect(names.length, `${skillId} level ${level}: ${names.join(', ')}`).toBeLessThanOrEqual(4)
      }

      const levels = levelsOf(skillId)
      expect(levels[0], skillId).toBe(1)
      for (let i = 1; i < levels.length; i++) {
        const gap = levels[i] - levels[i - 1]
        const limit = levels[i - 1] < 50 ? 6 : 10
        expect(gap, `${skillId} gap ${levels[i - 1]} → ${levels[i]}`).toBeLessThanOrEqual(limit)
      }
      expect(Math.max(...levels), `${skillId} never reaches 80`).toBeGreaterThanOrEqual(80)

      for (const activity of rows) {
        for (const input of activity.inputs ?? []) {
          const band = bandOf(input.itemId)
          if (band) {
            expect(activity.requiredLevel, `${skillId} ${activity.id} input ${input.itemId}`).toBeGreaterThanOrEqual(band)
          }
        }
        for (const output of activity.outputs) {
          const band = bandOf(output.itemId)
          if (band) {
            expect(activity.requiredLevel, `${skillId} ${activity.id} output ${output.itemId}`).toBeGreaterThanOrEqual(band)
          }
        }
      }
    })
  }

  it('tome volumes follow 5, 14, 23… and every target skill has the line', () => {
    const targets = new Set(
      ACTIVITIES.filter((activity) => activity.id.startsWith('craft-tome-')).map((activity) => {
        const match = activity.id.match(/^craft-tome-(.+)-(\d+)$/)
        return match?.[1] ?? ''
      }),
    )
    expect(targets.size).toBeGreaterThan(0)
    for (let volume = 1; volume <= 10; volume++) {
      const level = TOME_FIRST_LEVEL + (volume - 1) * TOME_LEVEL_STEP
      expect((volume - 1) * TOME_SKILL_GATE_STEP).toBe((volume - 1) * 10)
      for (const target of targets) {
        const row = ACTIVITIES.find((activity) => activity.id === `craft-tome-${target}-${volume}`)
        expect(row?.requiredLevel, `tome ${target} vol ${volume}`).toBe(level)
      }
    }
  })

  it('scrolls and reagents are not earlier than the spell', () => {
    for (const spell of SPELLS) {
      const floor = unlockSkillLevel(spell.level)
      for (const activity of ACTIVITIES) {
      if (!activity.id.startsWith('scribe-') && !activity.id.startsWith('inscribe-')) continue
        const spellId = activity.id.replace(/^(scribe|inscribe)-/, '')
        if (spellId !== spell.id) continue
        expect(activity.requiredLevel, activity.id).toBeGreaterThanOrEqual(floor)
      }
      for (const activity of ACTIVITIES) {
        if (activity.skillId !== 'alchemy' || !activity.id.startsWith('craft-')) continue
        if (!activity.outputs.some((output) => spell.components.some((part) => part.itemId === output.itemId))) continue
        expect(activity.requiredLevel, `${activity.id} for ${spell.name}`).toBeGreaterThanOrEqual(floor)
      }
    }
  })
})
