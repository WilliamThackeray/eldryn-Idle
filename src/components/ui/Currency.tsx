import { Coins, ScrollText, Target } from 'lucide-react'
import { cx, formatCompact } from './format'

export function Currency({ kind, amount }: { kind: 'gp' | 'favor' | 'marks'; amount: number }) {
  const Icon = kind === 'gp' ? Coins : kind === 'marks' ? Target : ScrollText
  const name = kind === 'gp' ? 'Gold' : kind === 'marks' ? 'Marks' : 'Guild Favor'
  const unit = kind === 'gp' ? 'gp' : kind === 'marks' ? 'Marks' : 'Favor'
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 text-body',
        kind === 'gp' ? 'text-gold' : kind === 'marks' ? 'text-rarity-rare' : 'text-sage',
      )}
      aria-label={`${name}: ${amount.toLocaleString()} ${unit}`}
    >
      <Icon size={16} aria-hidden />
      <span>{formatCompact(amount)}</span>
      <span className="text-meta">{unit}</span>
    </span>
  )
}
