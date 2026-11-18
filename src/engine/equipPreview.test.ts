import { expect, test } from 'vitest'
import { initialSkillProgress } from '../data/skills'
import { emptyEquipment } from './equipment'
import { equipPreview } from './equipPreview'

test('previewing a different weapon changes the damage label', () => {
  const equipment = { ...emptyEquipment(), mainHand: 'dagger' as const }
  const inventory = { longsword: 1 }
  const preview = equipPreview(equipment, inventory, 'longsword', initialSkillProgress(), 0)
  expect(preview).not.toBeNull()
  expect(preview!.slot).toBe('mainHand')
  expect(preview!.currentItemId).toBe('dagger')
  expect(preview!.diffs.damageBefore).toBe('1d4')
  // Versatile with empty off-hand uses the two-hand dice.
  expect(preview!.diffs.damageAfter).toBe('1d10')
})
