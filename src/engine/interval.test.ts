import { expect, test } from 'vitest'
import { intervalMs } from './interval'

test('the interval is base times DEX speed times other speed bonuses', () => {
  expect(intervalMs(6000, 0, 0, true)).toBe(6000)
  // Shortsword 4.8s at DEX +2: 4.8 × (1 − 0.06) = 4.512s
  expect(intervalMs(4800, 2, 0, true)).toBeCloseTo(4512, 5)
  expect(intervalMs(4800, 2, 0.1, true)).toBeCloseTo(4060.8, 5)
})

test('the interval formula respects the floor', () => {
  expect(intervalMs(6000, 100, 0.9, true)).toBe(3000)
  expect(intervalMs(6000, 5, 0, true)).toBeGreaterThanOrEqual(3000)
})

test('DEX is ignored for an INT skill', () => {
  expect(intervalMs(6000, 5, 0, false)).toBe(6000)
  expect(intervalMs(6000, 5, 0.25, false)).toBe(4500)
})
