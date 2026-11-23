/** Compact gold/favor: 999 stays, 12400 → 12.4k, 1500000 → 1.5m. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const units = [
    { n: 1e9, suffix: 'b' },
    { n: 1e6, suffix: 'm' },
    { n: 1e3, suffix: 'k' },
  ]
  for (const unit of units) {
    if (abs >= unit.n) {
      const scaled = abs / unit.n
      const digits = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)
      const text = digits.endsWith('.0') ? digits.slice(0, -2) : digits
      return sign + text + unit.suffix
    }
  }
  return sign + String(Math.round(abs))
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
