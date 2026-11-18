import { useEffect } from 'react'
import { cappedAway, summarizeGains } from '../engine/advance'
import { currentSlot } from '../store/slots'
import { enableSaveWrites, flushSave, useGameStore } from '../store/gameStore'

const TICK_MS = 100
const AUTOSAVE_MS = 30_000
const CHUNK_MS = 60 * 60 * 1000
const REPORT_AFTER_MS = 5_000

let gate: Promise<void> = Promise.resolve()
let loadCatchup: Promise<void> | null = null

export function resetLoadCatchup() {
  loadCatchup = null
}

function exclusive(task: () => Promise<void>): Promise<void> {
  const run = gate.then(task, task)
  gate = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function delay(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

async function play(elapsedMs: number, trace: boolean) {
  useGameStore.getState().setCombatTrace(trace)
  let left = elapsedMs
  while (left > 0) {
    const slice = Math.min(CHUNK_MS, left)
    const tick = useGameStore.getState().lastTick + slice
    useGameStore.getState().applyElapsed(slice, tick)
    left -= slice
    if (left > 0) await delay()
  }
  useGameStore.getState().setCombatTrace(true)
}

async function catchUp(showReport: boolean) {
  const started = Date.now()
  const state = useGameStore.getState()
  const awayMs = started - state.lastTick
  const { elapsedMs, cappedMs } = cappedAway(awayMs)
  const beforeSkills = state.skills
  const beforeItems = state.inventory
  const beforeGold = state.gold
  const beforeClassXp = state.classXp
  useGameStore.getState().clearOfflineCombatFlags()
  if (elapsedMs > 0) await play(elapsedMs, false)
  const after = useGameStore.getState()
  const afterClassXp = after.classXp
  const gains = summarizeGains(
    beforeSkills,
    after.skills,
    beforeItems,
    after.inventory,
    beforeGold,
    after.gold,
    beforeClassXp,
    afterClassXp,
    after.offlineKills,
    after.lastDefeat,
  )
  useGameStore.setState({
    lastTick: Date.now(),
    offlineReport:
      showReport && awayMs >= REPORT_AFTER_MS
        ? {
            awayMs,
            cappedMs,
            skills: gains.skills,
            items: gains.items,
            gold: gains.gold,
            kills: gains.kills,
            classXp: gains.classXp,
            defeated: gains.defeated,
          }
        : after.offlineReport,
  })
  useGameStore.getState().clearOfflineCombatFlags()
}

function ensureLoadCatchup(): Promise<void> {
  if (!loadCatchup) {
    loadCatchup = exclusive(async () => {
      enableSaveWrites()
      await catchUp(true)
      flushSave()
    })
  }
  return loadCatchup
}

export function useGameLoop(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let stopped = false
    let timer = 0
    let lastFrame = 0

    const arm = () => {
      if (stopped || document.hidden || timer) return
      lastFrame = performance.now()
      timer = window.setTimeout(step, TICK_MS)
    }

    const step = () => {
      timer = 0
      if (stopped || document.hidden || !currentSlot()) return
      const now = performance.now()
      const delta = now - lastFrame
      lastFrame = now
      // A performance.now() jump can be hours while lastTick is current. Only count time both clocks agree on.
      const wall = Date.now() - useGameStore.getState().lastTick
      const elapsed = cappedAway(Math.min(delta > 0 ? delta : 0, wall > 0 ? wall : 0)).elapsedMs
      if (elapsed > 0) useGameStore.getState().applyElapsed(elapsed, Date.now())
      timer = window.setTimeout(step, TICK_MS)
    }

    const onVisibility = () => {
      window.clearTimeout(timer)
      timer = 0
      if (document.hidden || stopped) return
      void exclusive(() => catchUp(false)).then(arm)
    }

    const onLeave = () => flushSave()
    window.addEventListener('beforeunload', onLeave)
    const autosave = window.setInterval(onLeave, AUTOSAVE_MS)
    document.addEventListener('visibilitychange', onVisibility)

    const boot = () => {
      void ensureLoadCatchup().then(arm)
    }
    const unsubscribe = useGameStore.persist.hasHydrated() ? undefined : useGameStore.persist.onFinishHydration(boot)
    if (!unsubscribe) boot()

    return () => {
      stopped = true
      flushSave()
      window.clearTimeout(timer)
      window.clearInterval(autosave)
      window.removeEventListener('beforeunload', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      unsubscribe?.()
    }
  }, [enabled])
}
