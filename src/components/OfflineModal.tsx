import { SKILLS } from '../data/skills'
import type { OfflineReport } from '../engine/advance'
import { useGameStore } from '../store/gameStore'

export function OfflineModal() {
  const report = useGameStore((state) => state.offlineReport)
  const dismissOffline = useGameStore((state) => state.dismissOffline)
  if (!report) return null

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-title"
        className="w-full max-w-md rounded-lg border border-brown/40 bg-panel p-6 text-parchment shadow-lg"
      >
        <h2 id="offline-title" className="mb-2 text-xl font-bold text-gold">
          While you were away
        </h2>
        <AwayTime report={report} />
        {report.defeated && <p className="mt-2 text-sm text-crimson">You were defeated and returned to town.</p>}
        {(report.kills > 0 || report.classXp > 0) && (
          <>
            <h3 className="mb-1 mt-4 font-bold">Combat</h3>
            <ul className="space-y-1 text-sm">
              {report.kills > 0 && <li>Kills: {report.kills}</li>}
              {report.classXp > 0 && <li>Class XP: +{formatXp(report.classXp)}</li>}
            </ul>
          </>
        )}
        <h3 className="mb-1 mt-4 font-bold">XP</h3>
        {report.skills.length === 0 ? (
          <p className="text-sm">No XP gained.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {report.skills.map((gain) => {
              const name = SKILLS.find((skill) => skill.id === gain.skillId)?.name ?? gain.skillId
              const levels = gain.levels > 0 ? ` · ${gain.levels} level${gain.levels === 1 ? '' : 's'}` : ''
              return (
                <li key={gain.skillId}>
                  {name}: +{formatXp(gain.xp)} XP{levels}
                </li>
              )
            })}
          </ul>
        )}
        {report.gold > 0 && (
          <>
            <h3 className="mb-1 mt-4 font-bold">Gold</h3>
            <p className="text-sm">+{report.gold} gp</p>
          </>
        )}
        <h3 className="mb-1 mt-4 font-bold">Items</h3>
        {report.items.length === 0 ? (
          <p className="text-sm">No items gained.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {report.items.map((item) => (
              <li key={item.id}>
                {item.name} ×{item.quantity}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={dismissOffline}
          className="mt-6 rounded-lg bg-sage px-4 py-2 text-ink transition-colors hover:bg-gold"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function AwayTime({ report }: { report: OfflineReport }) {
  if (report.cappedMs <= 0) return <p>Away for {formatDuration(report.awayMs)}.</p>
  return (
    <p>
      Away for {formatDuration(report.awayMs)}. Progress counted {formatDuration(report.awayMs - report.cappedMs)} (
      {formatDuration(report.cappedMs)} capped).
    </p>
  )
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

function formatXp(xp: number): string {
  return Math.floor(xp).toLocaleString()
}
