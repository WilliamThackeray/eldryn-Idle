import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { resetLoadCatchup } from '../../hooks/useGameLoop'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
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
              <Card key={slot} aria-label={`Save slot ${slot}`} className="flex flex-col">
                <p className="text-meta uppercase tracking-wide text-muted">Slot {slot}</p>
                {summary ? (
                  <>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-card text-gold" aria-hidden>
                        {summary.className.slice(0, 1)}
                      </span>
                      <div>
                        <p className="text-card font-bold text-gold">{summary.characterName}</p>
                        <p className="text-body text-parchment">
                          {summary.className} · Level {summary.classLevel}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-meta text-muted">Last played {formatPlayed(summary.lastPlayed)}</p>
                    {confirming === slot ? (
                      <div className="mt-4 space-y-2">
                        <p className="text-body">Delete {summary.characterName}?</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              deleteSlot(localStorage, slot)
                              setConfirming(null)
                              setTick((value) => value + 1)
                            }}
                          >
                            Confirm delete
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setConfirming(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center gap-2">
                        <Button size="sm" onClick={() => void continueSlot(slot, onStart)}>
                          Continue
                        </Button>
                        <button
                          type="button"
                          aria-label={`Delete ${summary.characterName}`}
                          onClick={() => setConfirming(slot)}
                          className="rounded-lg p-2 text-muted hover:bg-brown hover:text-parchment"
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCreating(slot)}
                    className="mt-4 flex flex-1 flex-col items-start rounded-lg border border-dashed border-line px-3 py-6 text-left hover:border-gold"
                  >
                    <span className="text-card font-semibold text-gold">New Character</span>
                    <span className="text-meta text-muted">Empty slot</span>
                  </button>
                )}
              </Card>
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
