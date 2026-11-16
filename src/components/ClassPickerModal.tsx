import { useState } from 'react'
import { CLASSES, type ClassId, type ClericFocus } from '../data/classes'
import type { AbilityAbbr } from '../types/game'
import { useGameStore } from '../store/gameStore'

export function ClassPickerModal() {
  const activeClassId = useGameStore((state) => state.activeClassId)
  const setActiveClass = useGameStore((state) => state.setActiveClass)
  const setClericFocus = useGameStore((state) => state.setClericFocus)
  const [focus, setFocus] = useState<ClericFocus>('INT')

  if (activeClassId) return null

  const pick = (classId: ClassId) => {
    if (classId === 'cleric') setClericFocus(focus)
    setActiveClass(classId)
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-picker-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-brown/40 bg-panel text-parchment shadow-lg"
      >
        <div className="border-b border-brown/40 px-6 py-4">
          <h2 id="class-picker-title" className="text-xl font-bold text-gold">
            Choose your class
          </h2>
          <p className="mt-1 text-sm text-parchment/80">
            You can switch later outside dungeons and quests. Each class keeps its own XP.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {CLASSES.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-brown/40 bg-ink/40 p-4">
                <h3 className="mb-2 text-lg font-bold text-gold">{entry.name}</h3>
                <p className="mb-2 text-sm text-sage">
                  Hit Die 1d{entry.hitDie} · Saves {entry.saveProficiencies.join(', ')}
                </p>
                <p className="mb-2 text-sm">
                  {formatModifiers(entry.xpModifiers, entry.id === 'cleric' ? focus : null)}
                </p>
                {entry.id === 'cleric' && (
                  <div className="mb-2 flex gap-2">
                    {(['INT', 'STR'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFocus(option)}
                        className={`rounded px-2 py-1 text-xs ${
                          focus === option ? 'bg-crimson text-parchment' : 'bg-brown/60 text-parchment/80'
                        }`}
                      >
                        +10% {option}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-sm font-semibold text-parchment">{entry.signatureAbility.name}</p>
                <p className="mt-1 text-xs text-parchment/80">{entry.signatureAbility.description}</p>
                <button
                  type="button"
                  onClick={() => pick(entry.id)}
                  className="mt-3 rounded-lg bg-sage px-3 py-1.5 text-sm text-ink transition-colors hover:bg-gold"
                >
                  Choose {entry.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatModifiers(
  mods: Partial<Record<AbilityAbbr, number>>,
  focus: ClericFocus | null,
): string {
  const parts = Object.entries(mods).map(([ability, value]) => formatPercent(ability, value ?? 0))
  if (focus) parts.push(formatPercent(focus, 0.1))
  return parts.join(' · ')
}

function formatPercent(ability: string, value: number): string {
  const pct = Math.round(value * 100)
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct}% ${ability}`
}
