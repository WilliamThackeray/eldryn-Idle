import { useState } from 'react'
import { Star, Shuffle } from 'lucide-react'
import { CLASSES, type ClassId, type ClericFocus } from '../../data/classes'
import { getItem } from '../../data/items'
import type { AbilityAbbr } from '../../types/game'

const NAMES = [
  'Aelindra',
  'Bram',
  'Corwin',
  'Dara',
  'Elandra',
  'Finn',
  'Gareth',
  'Hesta',
  'Ilya',
  'Jorren',
  'Kael',
  'Lira',
  'Mira',
  'Niall',
  'Orin',
  'Pella',
  'Quinn',
  'Rowan',
  'Sable',
  'Torin',
  'Una',
  'Vesper',
  'Wren',
  'Ysra',
  'Zephyr',
]

export interface CharacterDraft {
  name: string
  classId: ClassId
  clericFocus: ClericFocus
}

interface CharacterCreateProps {
  onCancel: () => void
  onBegin: (draft: CharacterDraft) => void
}

export function CharacterCreate({ onCancel, onBegin }: CharacterCreateProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [classId, setClassId] = useState<ClassId | null>(null)
  const [focus, setFocus] = useState<ClericFocus>('INT')
  const trimmed = name.trim()
  const chosen = classId ? CLASSES.find((entry) => entry.id === classId) : undefined

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8 text-parchment">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-sage">Step {step} of 3</p>
          <h1 className="text-3xl font-bold text-gold">
            {step === 1 ? 'Name' : step === 2 ? 'Class' : 'Confirm'}
          </h1>
        </div>
        <button type="button" onClick={onCancel} className="text-sm text-parchment/70 hover:text-gold">
          Back to slots
        </button>
      </div>

      {step === 1 && (
        <div className="max-w-md space-y-4">
          <label className="block text-sm text-sage" htmlFor="character-name">
            Character name
          </label>
          <div className="flex gap-2">
            <input
              id="character-name"
              value={name}
              maxLength={20}
              autoFocus
              onChange={(event) => setName(event.target.value.slice(0, 20))}
              className="min-w-0 flex-1 rounded-lg border border-brown/40 bg-ink px-3 py-2 text-parchment"
            />
            <button
              type="button"
              aria-label="Random name"
              onClick={() => setName(NAMES[Math.floor(Math.random() * NAMES.length)] ?? 'Rowan')}
              className="flex items-center gap-2 rounded-lg bg-brown px-3 py-2 text-parchment hover:bg-crimson"
            >
              <Shuffle size={16} />
              Random
            </button>
          </div>
          <p className="text-xs text-parchment/60">{trimmed.length}/20</p>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {CLASSES.map((entry) => {
            const selected = entry.id === classId
            return (
              <div
                key={entry.id}
                className={`rounded-lg border p-4 ${
                  selected ? 'border-gold bg-ink/60' : 'border-brown/40 bg-panel'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setClassId(entry.id)}
                  aria-pressed={selected}
                  className="w-full text-left"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-gold">{entry.name}</h2>
                    <Stars n={entry.difficulty} />
                  </div>
                  <p className="text-sm text-parchment">{entry.role}</p>
                  <p className="mt-1 text-sm text-parchment/70">{entry.playstyle}</p>
                  <p className="mt-2 text-sm text-sage">
                    Hit Die 1d{entry.hitDie} · {formatModifiers(entry.xpModifiers, entry.id === 'cleric' ? focus : null)}
                  </p>
                  {entry.tradition && <p className="mt-1 text-sm text-sage">Tradition: {entry.tradition}</p>}
                  <p className="mt-2 text-sm font-semibold">{entry.signatureAbility.name}</p>
                  <p className="mt-1 text-xs text-parchment/70">{entry.signatureAbility.description}</p>
                </button>
                {entry.id === 'cleric' && (
                  <div className="mt-3 flex gap-2">
                    {(['INT', 'STR'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setClassId('cleric')
                          setFocus(option)
                        }}
                        className={`rounded px-2 py-1 text-xs ${
                          focus === option && classId === 'cleric'
                            ? 'bg-crimson text-parchment'
                            : 'bg-brown/60 text-parchment/80'
                        }`}
                      >
                        +10% {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {step === 3 && chosen && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-brown/40 bg-panel p-5">
            <h2 className="text-2xl font-bold text-gold">{trimmed}</h2>
            <p className="mt-1 text-sage">
              {chosen.name}
              {chosen.id === 'cleric' ? ` · ${focus} focus` : ''}
            </p>
            <p className="mt-3 text-sm">{chosen.role}</p>
            <p className="mt-1 text-sm text-parchment/70">{chosen.playstyle}</p>
            <p className="mt-3 text-sm text-sage">
              Hit Die 1d{chosen.hitDie}
              {chosen.tradition ? ` · ${chosen.tradition}` : ''} · {chosen.signatureAbility.name}
            </p>
          </section>
          <section className="rounded-lg border border-brown/40 bg-panel p-5">
            <h2 className="mb-3 font-bold text-gold">Starting kit</h2>
            <ul className="space-y-1 text-sm">
              {chosen.startingKit.map((stack) => (
                <li key={stack.itemId} className="flex justify-between gap-3">
                  <span>{getItem(stack.itemId)?.name ?? stack.itemId}</span>
                  <span className="text-sage">×{stack.quantity}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
            className="rounded-lg bg-brown px-4 py-2 text-parchment hover:bg-crimson"
          >
            Back
          </button>
        )}
        {step < 3 && (
          <button
            type="button"
            disabled={step === 1 ? trimmed.length === 0 : !classId}
            onClick={() => setStep((current) => (current === 1 ? 2 : 3))}
            className="rounded-lg bg-sage px-4 py-2 text-ink hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        )}
        {step === 3 && chosen && (
          <button
            type="button"
            onClick={() => onBegin({ name: trimmed, classId: chosen.id, clericFocus: focus })}
            className="rounded-lg bg-sage px-4 py-2 text-ink hover:bg-gold"
          >
            Begin
          </button>
        )}
      </div>
    </div>
  )
}

function Stars({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className="flex" aria-label={`Difficulty ${n} of 3`}>
      {[1, 2, 3].map((star) => (
        <Star key={star} size={14} className={star <= n ? 'fill-gold text-gold' : 'text-parchment/30'} />
      ))}
    </span>
  )
}

function formatModifiers(mods: Partial<Record<AbilityAbbr, number>>, focus: ClericFocus | null): string {
  const parts = Object.entries(mods).map(([ability, value]) => formatPercent(ability, value ?? 0))
  if (focus) parts.push(formatPercent(focus, 0.1))
  return parts.join(' · ')
}

function formatPercent(ability: string, value: number): string {
  const pct = Math.round(value * 100)
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct}% ${ability}`
}
