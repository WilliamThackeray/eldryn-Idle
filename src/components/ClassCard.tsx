import type { ReactNode } from 'react'
import {
  CLASSES,
  TRADITION_LABEL,
  type ClassDefinition,
  type ClericFocus,
} from '../data/classes'
import type { AbilityAbbr } from '../types/game'

function Stars({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className="text-gold" aria-label={`${n} difficulty`}>
      {'★'.repeat(n)}
      <span className="text-parchment/30">{'★'.repeat(3 - n)}</span>
    </span>
  )
}

function formatModifiers(
  mods: Partial<Record<AbilityAbbr, number>>,
  focus: ClericFocus | null,
): string {
  const parts = (Object.entries(mods) as [AbilityAbbr, number][])
    .filter(([, value]) => value !== 0)
    .map(([abbr, value]) => {
      const pct = Math.round(value * 100)
      const sign = pct > 0 ? '+' : ''
      return `${sign}${pct}% ${abbr}`
    })
  if (focus) parts.push(`+10% ${focus} focus`)
  return parts.join(' · ')
}

export function ClassCard({
  entry,
  selected,
  onSelect,
  clericFocus = 'INT',
  onClericFocus,
  footer,
  disabled,
}: {
  entry: ClassDefinition | (typeof CLASSES)[number]
  selected?: boolean
  onSelect?: () => void
  clericFocus?: ClericFocus
  onClericFocus?: (focus: ClericFocus) => void
  footer?: ReactNode
  disabled?: boolean
}) {
  const focus = entry.id === 'cleric' ? clericFocus : null
  const body = (
    <>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-gold">{entry.name}</h2>
        <Stars n={entry.difficulty} />
      </div>
      <p className="text-sm text-parchment">{entry.role}</p>
      <p className="mt-1 text-sm text-parchment/70">{entry.playstyle}</p>
      <p className="mt-2 text-sm text-sage">
        Hit Die 1d{entry.hitDie} · {formatModifiers(entry.xpModifiers, focus)}
      </p>
      {entry.spellcasting.casterType !== 'none' && (
        <p className="mt-1 text-sm text-sage">
          Tradition: {TRADITION_LABEL[entry.spellcasting.tradition]}
        </p>
      )}
      <p className="mt-2 text-sm font-semibold">{entry.signatureAbility.name}</p>
      <p className="mt-1 text-xs text-parchment/70">{entry.signatureAbility.description}</p>
    </>
  )

  return (
    <div
      className={`rounded-lg border p-4 ${
        selected ? 'border-gold bg-ink/60' : 'border-brown/40 bg-panel'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          aria-pressed={selected}
          className="w-full text-left disabled:cursor-not-allowed"
        >
          {body}
        </button>
      ) : (
        <div>{body}</div>
      )}
      {entry.id === 'cleric' && onClericFocus && (
        <div className="mt-3 flex gap-2">
          {(['INT', 'STR'] as const).map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => {
                onSelect?.()
                onClericFocus(option)
              }}
              className={`rounded px-2 py-1 text-xs ${
                clericFocus === option
                  ? 'bg-crimson text-parchment'
                  : 'bg-brown/60 text-parchment/80'
              }`}
            >
              +10% {option}
            </button>
          ))}
        </div>
      )}
      {footer}
    </div>
  )
}
