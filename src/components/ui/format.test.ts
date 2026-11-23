import { expect, test } from 'vitest'
import { formatCompact } from './format'

test('leaves amounts under 1000 as whole numbers', () => {
  expect(formatCompact(0)).toBe('0')
  expect(formatCompact(999)).toBe('999')
})

test('compacts thousands and millions like 12.4k', () => {
  expect(formatCompact(1000)).toBe('1k')
  expect(formatCompact(12400)).toBe('12.4k')
  expect(formatCompact(12000)).toBe('12k')
  expect(formatCompact(1_500_000)).toBe('1.5m')
})
