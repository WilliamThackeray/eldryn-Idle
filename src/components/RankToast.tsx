import { useEffect, useRef, useState } from 'react'
import { ABILITY_PERKS } from '../data/abilityPerks'
import { deriveAbilities } from '../engine/abilities'
import { useGameStore } from '../store/gameStore'

/** Watches skill XP and toasts when an Ability Rank rises or a milestone perk unlocks. */
export function RankToast() {
  const skills = useGameStore((state) => state.skills)
  const characterName = useGameStore((state) => state.characterName)
  const prevRanks = useRef<Record<string, number> | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    prevRanks.current = null
  }, [characterName])

  useEffect(() => {
    const derived = deriveAbilities(skills)
    const next: Record<string, number> = {}
    for (const ability of derived) next[ability.abbr] = ability.rank

    const prev = prevRanks.current
    prevRanks.current = next
    if (!prev) return

    const notes: string[] = []
    for (const ability of derived) {
      const before = prev[ability.abbr] ?? 1
      if (ability.rank <= before) continue
      notes.push(`${ability.name} Rank ${ability.rank}`)
      for (const perk of ABILITY_PERKS) {
        if (perk.ability !== ability.abbr || perk.rank < 5) continue
        if (perk.rank > before && perk.rank <= ability.rank) notes.push(perk.name)
      }
    }
    if (notes.length === 0) return
    setMessage(notes.join(' · '))
    const timer = window.setTimeout(() => setMessage(null), 4000)
    return () => window.clearTimeout(timer)
  }, [skills])

  if (!message) return null
  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-gold/50 bg-panel px-4 py-2 text-sm text-parchment shadow-lg"
    >
      {message}
    </div>
  )
}
