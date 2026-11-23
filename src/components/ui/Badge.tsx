import type { ReactNode } from 'react'
import { cx } from './format'

type Tone =
  | 'neutral'
  | 'gold'
  | 'sage'
  | 'crimson'
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'very-rare'
  | 'legendary'
  | 'artifact'
  | 'easy'
  | 'even'
  | 'hard'
  | 'deadly'
  | 'str'
  | 'dex'
  | 'con'
  | 'int'
  | 'wis'
  | 'cha'

const TONE: Record<Tone, string> = {
  neutral: 'bg-raised text-parchment',
  gold: 'bg-ink text-gold',
  sage: 'bg-ink text-sage',
  crimson: 'bg-ink text-lack',
  common: 'bg-ink text-rarity-common',
  uncommon: 'bg-ink text-rarity-uncommon',
  rare: 'bg-ink text-rarity-rare',
  'very-rare': 'bg-ink text-rarity-very-rare',
  legendary: 'bg-ink text-rarity-legendary',
  artifact: 'bg-ink text-rarity-artifact',
  easy: 'bg-ink text-difficulty-easy',
  even: 'bg-ink text-difficulty-even',
  hard: 'bg-ink text-difficulty-hard',
  deadly: 'bg-ink text-difficulty-deadly',
  str: 'bg-ink text-ability-str',
  dex: 'bg-ink text-ability-dex',
  con: 'bg-ink text-ability-con',
  int: 'bg-ink text-ability-int',
  wis: 'bg-ink text-ability-wis',
  cha: 'bg-ink text-ability-cha',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center rounded px-1.5 py-0.5 text-meta font-semibold', TONE[tone])}>
      {children}
    </span>
  )
}

export function Chip({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-meta font-semibold',
        TONE[tone],
      )}
    >
      {children}
    </span>
  )
}
