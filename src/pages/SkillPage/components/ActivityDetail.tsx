import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Collapsible } from '../../../components/ui/Collapsible'
import { ItemChip } from '../../../components/ui/ItemChip'
import { StatTile } from '../../../components/ui/StatTile'
import { Tooltip } from '../../../components/ui/Tooltip'
import type { ActivityDef } from '../../../data/activities'
import { SKILLS } from '../../../data/skills'
import type { GameEvent, SkillEvent } from '../../../engine/advance'
import type { BonusPart, QualityTier } from '../../../engine/skillCheck'
import { formatXp } from '../present'

const TIER_TONE: Record<QualityTier, 'quality-fail' | 'quality-fumble' | 'quality-standard' | 'quality-fine' | 'quality-masterwork' | 'quality-exceptional'> = {
  fail: 'quality-fail',
  fumble: 'quality-fumble',
  standard: 'quality-standard',
  fine: 'quality-fine',
  masterwork: 'quality-masterwork',
  exceptional: 'quality-exceptional',
}

const TIER_LABEL: Record<QualityTier, string> = {
  fail: 'Fail',
  fumble: 'Fumble',
  standard: 'Standard',
  fine: 'Fine',
  masterwork: 'Masterwork',
  exceptional: 'Exceptional',
}

const BAR: { key: string; label: string; className: string; pick: (odds: Record<QualityTier, number>) => number }[] = [
  { key: 'fail', label: 'Fail', className: 'bg-crimson', pick: (odds) => odds.fail + odds.fumble },
  { key: 'standard', label: 'Standard', className: 'bg-brown', pick: (odds) => odds.standard },
  { key: 'fine', label: 'Fine', className: 'bg-sage', pick: (odds) => odds.fine },
  { key: 'masterwork', label: 'Masterwork', className: 'bg-gold', pick: (odds) => odds.masterwork },
  { key: 'exceptional', label: 'Exceptional', className: 'bg-ability-dex', pick: (odds) => odds.exceptional },
]

function formatPct(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`
}

export function ActivityDetail({
  activity,
  checkLine,
  checkParts,
  odds,
  xpLabel,
  xpBreakdown,
  intervalLabel,
  requiredLabel,
  lockedReason,
  inputs,
  outputs,
  running,
  onStart,
  onStop,
  secondary,
  log,
}: {
  activity: ActivityDef | null
  checkLine: string
  checkParts: BonusPart[]
  odds: Record<QualityTier, number> | null
  xpLabel: string
  xpBreakdown: string
  intervalLabel: string
  requiredLabel: string
  lockedReason: string | null
  inputs: { name: string; owned: number; needed: number; note?: string }[]
  outputs: { name: string; note?: string }[]
  running: boolean
  onStart: () => void
  onStop: () => void
  secondary: { label: string; ready: boolean; reason: string | null; onClick: () => void } | null
  log: GameEvent[]
}) {
  return (
    <div className="space-y-3 rounded-lg border border-line bg-panel p-4 text-parchment">
      {activity == null ? (
        <p className="text-body text-muted">Select an activity.</p>
      ) : (
        <>
          <h2 className="text-card text-gold">{activity.name}</h2>
          <p className="text-body text-muted">{activity.description}</p>
          <Tooltip
            content={checkParts.map((part) => `${part.label} ${part.value >= 0 ? '+' : ''}${part.value}`).join(' · ')}
            className="w-full"
          >
            <p className="text-body text-parchment">{checkLine}</p>
          </Tooltip>
          {odds && <OddsBar odds={odds} />}
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="XP" value={xpLabel} breakdown={xpBreakdown} />
            <StatTile label="Interval" value={intervalLabel} />
            <StatTile label="Required" value={requiredLabel} />
          </div>
          {inputs.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-meta text-muted">Inputs</h3>
              <div className="flex flex-wrap gap-1.5">
                {inputs.map((input) => (
                  <ItemChip key={input.name} name={input.name} owned={input.owned} needed={input.needed} note={input.note} />
                ))}
              </div>
            </div>
          )}
          {outputs.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-meta text-muted">Outputs</h3>
              <div className="flex flex-wrap gap-1.5">
                {outputs.map((output) => (
                  <ItemChip key={`${output.name}-${output.note ?? ''}`} name={output.name} note={output.note} />
                ))}
              </div>
            </div>
          )}
          <Button
            className="w-full"
            variant={running ? 'danger' : 'primary'}
            disabled={!running && lockedReason != null}
            disabledReason={lockedReason ? `Requires ${lockedReason}` : undefined}
            onClick={running ? onStop : onStart}
          >
            {running ? 'Stop' : 'Start'}
          </Button>
          {secondary && (
            <Button
              className="w-full"
              variant="secondary"
              disabled={!secondary.ready}
              disabledReason={secondary.reason ?? undefined}
              onClick={secondary.onClick}
            >
              {secondary.label}
            </Button>
          )}
        </>
      )}
      <Collapsible title="Recent rolls" defaultOpen>
        {log.length === 0 ? (
          <p className="text-meta">No rolls yet.</p>
        ) : (
          <ul className="space-y-1 text-meta">
            {[...log].reverse().map((event, index) => {
              if (event.kind === 'materials') {
                return <li key={`materials-${index}`}>Out of materials: {event.label}. Stopped.</li>
              }
              if (event.kind !== 'skill') return null
              return (
                <li
                  key={`${event.activityId}-${index}`}
                  className={event.tier === 'exceptional' ? 'animate-quality-flash rounded px-1' : undefined}
                >
                  {rollLine(event)}
                </li>
              )
            })}
          </ul>
        )}
      </Collapsible>
    </div>
  )
}

function rollLine(event: SkillEvent) {
  const skill = SKILLS.find((entry) => entry.id === event.skillId)?.name ?? event.label
  const items = event.items.map((item) => `${item.name} x${item.quantity}`).join(', ')
  const gold = event.gold > 0 ? `+${event.gold} gp` : ''
  const gains = [items, gold].filter(Boolean).join(' · ')
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span>
        {skill}: d20 {event.roll} ({event.total} vs DC {event.dc})
      </span>
      <Badge tone={TIER_TONE[event.tier]}>{TIER_LABEL[event.tier]}</Badge>
      <span>
        +{formatXp(event.xp)} XP{gains ? ` · ${gains}` : ''}
      </span>
    </span>
  )
}

function OddsBar({ odds }: { odds: Record<QualityTier, number> }) {
  return (
    <div className="space-y-1">
      <div className="flex h-3 overflow-hidden rounded bg-ink">
        {BAR.map((segment) => {
          const pct = segment.pick(odds)
          if (pct <= 0) return null
          return (
            <div
              key={segment.key}
              className={segment.className}
              style={{ width: `${pct}%` }}
              title={`${segment.label} ${formatPct(pct)}`}
            />
          )
        })}
      </div>
      <p className="flex flex-wrap gap-x-2 text-meta text-muted">
        {BAR.map((segment) => (
          <span key={segment.key}>
            {segment.label} {formatPct(segment.pick(odds))}
          </span>
        ))}
      </p>
    </div>
  )
}
