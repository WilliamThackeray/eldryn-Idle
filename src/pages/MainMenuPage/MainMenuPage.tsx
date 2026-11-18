import { useState } from 'react'
import { resetLoadCatchup } from '../../hooks/useGameLoop'
import { flushSave, useGameStore } from '../../store/gameStore'
import {
  bindSlot,
  deleteSlot,
  readSlotSave,
  slotSummary,
  writeSlotIndex,
  type SlotId,
} from '../../store/slots'
import { CharacterCreate } from './CharacterCreate'

const SLOTS: SlotId[] = [1, 2, 3]

interface MainMenuPageProps {
  onStart: () => void
}

export function MainMenuPage({ onStart }: MainMenuPageProps) {
  const [creating, setCreating] = useState<SlotId | null>(null)
  const [confirming, setConfirming] = useState<SlotId | null>(null)
  const [tick, setTick] = useState(0)
  const summaries = SLOTS.map((slot) => {
    const save = readSlotSave(localStorage, slot)
    return save ? slotSummary(slot, save) : null
  })

  if (creating != null) {
    return (
      <div className="min-h-screen bg-ink">
        <CharacterCreate
          onCancel={() => setCreating(null)}
          onBegin={(draft) => {
            useGameStore.getState().beginCharacter({ slot: creating, ...draft })
            resetLoadCatchup()
            onStart()
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink px-6 py-10 text-parchment">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold text-gold">Eldryn Idle</h1>
        <p className="mt-2 text-sm text-parchment/70">Three characters. A class, once chosen, stays chosen.</p>
        <div key={tick} className="mt-8 grid gap-4 md:grid-cols-3">
          {SLOTS.map((slot) => {
            const summary = summaries[slot - 1]
            return (
              <section key={slot} aria-label={`Save slot ${slot}`} className="rounded-lg border border-brown/40 bg-panel p-4">
                <h2 className="text-sm uppercase tracking-wide text-sage">Slot {slot}</h2>
                {summary ? (
                  <>
                    <p className="mt-2 text-xl font-bold text-gold">{summary.characterName}</p>
                    <p className="text-sm">{summary.className}</p>
                    <p className="mt-2 text-sm text-sage">Class Level {summary.classLevel}</p>
                    <p className="text-sm text-sage">Total level {summary.totalLevel}</p>
                    <p className="mt-2 text-xs text-parchment/60">Last played {formatPlayed(summary.lastPlayed)}</p>
                    {confirming === slot ? (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm">Delete {summary.characterName}?</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              deleteSlot(localStorage, slot)
                              setConfirming(null)
                              setTick((value) => value + 1)
                            }}
                            className="rounded-lg bg-crimson px-3 py-1.5 text-sm text-parchment"
                          >
                            Confirm delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirming(null)}
                            className="rounded-lg bg-brown px-3 py-1.5 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void continueSlot(slot, onStart)}
                          className="rounded-lg bg-sage px-3 py-1.5 text-sm text-ink hover:bg-gold"
                        >
                          Continue
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(slot)}
                          className="rounded-lg bg-brown px-3 py-1.5 text-sm hover:bg-crimson"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-parchment/60">Empty</p>
                    <button
                      type="button"
                      onClick={() => setCreating(slot)}
                      className="mt-4 rounded-lg bg-sage px-3 py-1.5 text-sm text-ink hover:bg-gold"
                    >
                      New Character
                    </button>
                  </>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

async function continueSlot(slot: SlotId, onStart: () => void) {
  flushSave()
  bindSlot(slot)
  writeSlotIndex(localStorage, { active: slot })
  await useGameStore.persist.rehydrate()
  useGameStore.setState({
    log: [],
    offlineReport: null,
    questMessage: null,
    offlineKills: 0,
    lastDefeat: false,
  })
  resetLoadCatchup()
  onStart()
}

function formatPlayed(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString()
}
