import { expect, test } from 'vitest'
import { mulberry32 } from './rng'

test('mulberry32 repeats the same seed and stays inside [0, 1)', () => {
  const first = mulberry32(1)
  const second = mulberry32(1)
  const sample = [first(), first(), first()]

  expect([second(), second(), second()]).toEqual(sample)
  for (const roll of sample) {
    expect(roll).toBeGreaterThanOrEqual(0)
    expect(roll).toBeLessThan(1)
  }
  expect(mulberry32(2)()).not.toBe(sample[0])
})
