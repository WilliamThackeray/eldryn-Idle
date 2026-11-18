import { expect, test } from 'vitest'
import { sourcesOf, usesOf } from './itemIndex'

test('Iron Ore is obtained from Mine Iron', () => {
  const sources = sourcesOf('iron-ore')
  expect(sources.some((entry) => entry.kind === 'activity' && entry.activityId === 'mine-iron')).toBe(
    true,
  )
})

test('Iron Ore is used in Smith Iron Bar', () => {
  const uses = usesOf('iron-ore')
  expect(uses.some((entry) => entry.kind === 'activity' && entry.activityId === 'smith-iron')).toBe(
    true,
  )
})
