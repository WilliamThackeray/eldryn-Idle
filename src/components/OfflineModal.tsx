import { baseItemId, getItem, qualityLabel, qualityOf } from '../data/items'
import { SKILLS } from '../data/skills'
import type { ItemGain, OfflineReport } from '../engine/advance'
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
        {report.favor > 0 && (
          <>
            <h3 className="mb-1 mt-4 font-bold">Guild Favor</h3>
            <p className="text-sm">+{report.favor} Favor</p>
          </>
        )}
        <h3 className="mb-1 mt-4 font-bold">Items</h3>
        {report.items.length === 0 ? (
          <p className="text-sm">No items gained.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {groupByQuality(report.items).map((group) => (
              <li key={group.base}>
                {group.rows.length === 1 && !qualityLabel(qualityOf(group.rows[0].id)) ? (
                  <>
                    {group.rows[0].name} ×{group.rows[0].quantity}
                  </>
                ) : (
                  <>
                    {group.name}
                    <ul className="ml-4">
                      {group.rows.map((row) => (
                        <li key={row.id}>
                          {qualityLabel(qualityOf(row.id)) ?? 'Standard'} ×{row.quantity}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
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

function groupByQuality(items: ItemGain[]): { base: string; name: string; rows: ItemGain[] }[] {
  const groups = new Map<string, ItemGain[]>()
  for (const item of items) {
    const base = baseItemId(item.id)
    const rows = groups.get(base) ?? []
    rows.push(item)
    groups.set(base, rows)
  }
  return [...groups.entries()].map(([base, rows]) => ({
    base,
    name: getItem(base)?.name ?? rows[0]?.name ?? base,
    rows,
  }))
}

function formatXp(xp: number): string {
  return Math.floor(xp).toLocaleString()
}
