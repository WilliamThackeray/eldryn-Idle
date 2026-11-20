import { ProgressBar } from '../../../components/ProgressBar'

interface ActivityDetailProps {
  title: string
  description: string
  xpGain: number
  xpMultiplierLabel: string | null
  intervalSeconds: string
  requiredLevel: number
  dc: number
  successPercent: number
  bonus: number
  details: string[]
  needsMaterials: boolean
  locked: boolean
  active: boolean
  progress: number
  onStart: () => void
  onStop: () => void
  secondaryLabel?: string | null
  secondaryDisabled?: boolean
  onSecondary?: (() => void) | null
}

export function ActivityDetail({
  title,
  description,
  xpGain,
  xpMultiplierLabel,
  intervalSeconds,
  requiredLevel,
  dc,
  successPercent,
  bonus,
  details,
  needsMaterials,
  locked,
  active,
  progress,
  onStart,
  onStop,
  secondaryLabel = null,
  secondaryDisabled = false,
  onSecondary = null,
}: ActivityDetailProps) {
  return (
    <aside className="rounded-lg border border-brown/40 bg-panel p-5 shadow-lg lg:sticky lg:top-4">
      <h2 className="mb-2 text-2xl font-bold text-gold">{title}</h2>
      <p className="mb-4 text-parchment/90">{description}</p>

      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <Stat label="Bonus" value={bonus >= 0 ? `+${bonus}` : String(bonus)} />
        <Stat label="Success" value={`${successPercent}%`} />
        <Stat label="DC" value={String(dc)} />
        <Stat label="XP" value={`+${xpGain}`} />
        <Stat label="Interval" value={intervalSeconds} />
        <Stat label="Required" value={`Lv ${requiredLevel}`} />
      </dl>
      {xpMultiplierLabel && <p className="mb-4 text-sm text-sage">{xpMultiplierLabel}</p>}

      {details.length > 0 && (
        <ul className="mb-4 space-y-1 text-sm text-sage">
          {details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      {active && <ProgressBar progress={progress} className="mb-4 h-2.5" label={`${title} progress`} />}

      {locked ? (
        <p className="text-sm text-parchment/70">Requires level {requiredLevel}</p>
      ) : needsMaterials && !active ? (
        <p className="text-sm text-parchment/70">Need materials</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={active ? onStop : onStart}
            className="rounded-lg bg-crimson px-4 py-2 text-parchment transition-colors hover:bg-brown"
          >
            {active ? 'Stop' : 'Start'}
          </button>
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              disabled={secondaryDisabled}
              onClick={onSecondary}
              className="rounded-lg border border-gold/50 px-4 py-2 text-gold transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </aside>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-ink/50 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-sage/80">{label}</dt>
      <dd className="font-semibold text-parchment">{value}</dd>
    </div>
  )
}
