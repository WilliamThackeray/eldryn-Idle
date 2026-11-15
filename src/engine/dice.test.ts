import { expect, test } from 'vitest'
import type { Rng } from './rng'
import { mulberry32 } from './rng'
import { resolveRollMode, roll, rollD20 } from './dice'

function scripted(...values: number[]): Rng {
  let index = 0
  return () => values[index++]
}

test('advantage and disadvantage do not stack and cancel each other', () => {
  expect(resolveRollMode([])).toBe('normal')
  expect(resolveRollMode(['advantage'])).toBe('advantage')
  expect(resolveRollMode(['advantage', 'advantage'])).toBe('advantage')
  expect(resolveRollMode(['disadvantage'])).toBe('disadvantage')
  expect(resolveRollMode(['disadvantage', 'disadvantage'])).toBe('disadvantage')
  expect(resolveRollMode(['advantage', 'disadvantage'])).toBe('normal')
  expect(resolveRollMode(['disadvantage', 'advantage', 'advantage'])).toBe('normal')
})

test('rollD20 keeps the higher die, the lower die, or the only die', () => {
  expect(rollD20(scripted(0.45), 'normal')).toBe(10)
  expect(rollD20(scripted(0, 0.95), 'advantage')).toBe(20)
  expect(rollD20(scripted(0, 0.95), 'disadvantage')).toBe(1)
  expect(rollD20(mulberry32(4), 'advantage')).toBe(rollD20(mulberry32(4), 'advantage'))
})

test('roll parses NdM plus a modifier', () => {
  expect(roll('2d6+3', scripted(0, 0.5))).toBe(8)
  expect(roll('1d8-1', scripted(0.99))).toBe(7)
  expect(roll('2d6+1d4', mulberry32(9))).toBe(roll('2d6+1d4', mulberry32(9)))
  expect(() => roll('nope', scripted(0))).toThrow()
})
