import type { ReactNode } from 'react'
import {
  CLASSES,
  TRADITION_LABEL,
  type ClassDefinition,
  type ClericFocus,
} from '../data/classes'
import type { AbilityAbbr } from '../types/game'
import { Chip } from './ui/Badge'

function Stars({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className="text-gold" aria-label={`${n} difficulty`}>
      {'★'.repeat(n)}
      <span className="text-parchment/30">{'★'.repeat(3 - n)}</span>
    </span>
  )
}

const ABILITY_TONE: Record<AbilityAbbr, 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'> = {
  STR: 'str',
  DEX: 'dex',
  CON: 'con',
  INT: 'int',
  WIS: 'wis',
  CHA: 'cha',
}

function ModifierChips({
  mods,
  focus,
}: {
  mods: Partial<Record<AbilityAbbr, number>>
  focus: ClericFocus | null
}) {
  const parts = (Object.entries(mods) as [AbilityAbbr, number][]).filter(([, value]) => value !== 0)
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {parts.map(([abbr, value]) => {
        const pct = Math.round(value * 100)
        return (
          <Chip key={abbr} tone={ABILITY_TONE[abbr]}>
            {pct > 0 ? `+${pct}` : pct}% {abbr}
          </Chip>
        )
      })}
      {focus && <Chip tone={ABILITY_TONE[focus]}>+10% {focus} focus</Chip>}
    </div>
  )
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
      <p className="mt-2 text-body text-muted">Hit Die 1d{entry.hitDie}</p>
      <ModifierChips mods={entry.xpModifiers} focus={focus} />
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
      className={`rounded-lg border bg-panel p-4 ${
        selected ? 'border-gold ring-2 ring-gold' : 'border-line'
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
