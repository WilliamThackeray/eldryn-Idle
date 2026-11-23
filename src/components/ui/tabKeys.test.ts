import { expect, test } from 'vitest'
import { moveTab } from './tabKeys'

test('arrow keys move between tabs and wrap', () => {
  expect(moveTab(0, 3, 'ArrowRight')).toBe(1)
  expect(moveTab(2, 3, 'ArrowRight')).toBe(0)
  expect(moveTab(0, 3, 'ArrowLeft')).toBe(2)
})

test('Home and End jump to the ends', () => {
  expect(moveTab(1, 4, 'Home')).toBe(0)
  expect(moveTab(1, 4, 'End')).toBe(3)
})

test('ignores other keys', () => {
  expect(moveTab(1, 3, 'Enter')).toBeNull()
})
