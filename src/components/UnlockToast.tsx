import { useEffect, useRef, useState } from 'react'
import { SKILLS } from '../data/skills'
import { newlyVisible, type Viewer } from '../engine/presentActivity'
import { useGameStore } from '../store/gameStore'
import { useUiPrefs } from '../store/uiPrefs'

/** Toasts activities that became visible because a skill leveled. */
export function UnlockToast() {
  const skills = useGameStore((state) => state.skills)
  const characterName = useGameStore((state) => state.characterName)
  const prev = useRef<{ name: string; skills: Viewer['skills'] } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const state = useGameStore.getState()
    const before = prev.current
    prev.current = { name: characterName, skills }
    if (!before || before.name !== characterName) return

    const viewer = (snapshot: Viewer['skills']): Viewer => ({
      skills: snapshot,
      renown: state.renown,
      classId: state.classId,
      secondaryClassId: state.secondaryClassId,
      questProgress: state.questProgress,
    })
    const unlocked = newlyVisible(viewer(before.skills), viewer(skills))
    if (unlocked.length === 0) return
    useUiPrefs.getState().noteUnlocks(unlocked.map((activity) => `${activity.skillId}:${activity.id}`))
    const lines = SKILLS.map((skill) => {
      const names = unlocked.filter((activity) => activity.skillId === skill.id).map((activity) => activity.name)
      return names.length ? `New in ${skill.name}: ${names.join(', ')}` : null
    }).filter(Boolean)
    setMessage(lines.join(' · '))
    const timer = window.setTimeout(() => setMessage(null), 5000)
    return () => window.clearTimeout(timer)
  }, [skills, characterName])

  if (!message) return null
  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-16 left-1/2 z-[60] max-w-lg -translate-x-1/2 rounded-lg border border-gold/50 bg-panel px-4 py-2 text-sm text-parchment shadow-lg"
    >
      {message}
    </div>
  )
}
