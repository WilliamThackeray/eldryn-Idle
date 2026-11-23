import { Coins, ScrollText } from 'lucide-react'
import { cx, formatCompact } from './format'

export function Currency({ kind, amount }: { kind: 'gp' | 'favor'; amount: number }) {
  const Icon = kind === 'gp' ? Coins : ScrollText
  const name = kind === 'gp' ? 'Gold' : 'Guild Favor'
  const unit = kind === 'gp' ? 'gp' : 'Favor'
  return (
    <span
      className={cx('inline-flex items-center gap-1 text-body', kind === 'gp' ? 'text-gold' : 'text-sage')}
      aria-label={`${name}: ${amount.toLocaleString()} ${unit}`}
    >
      <Icon size={16} aria-hidden />
      <span>{formatCompact(amount)}</span>
      <span className="text-meta">{unit}</span>
    </span>
  )
}
