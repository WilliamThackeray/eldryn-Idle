import { expect, test } from 'vitest'
import { formatPacingReport } from './pacing'

test('prints hours to 10 / 30 / 50 / 70 / 99', () => {
  const report = formatPacingReport()
  console.log(`\n${report}\n`)
  expect(report).toContain('Smithing')
  expect(report).toContain('Lv 99')
})
