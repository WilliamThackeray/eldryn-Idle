import { Button } from '../../../components/ui/Button'
import { Collapsible } from '../../../components/ui/Collapsible'
import { ItemChip } from '../../../components/ui/ItemChip'
import { StatTile } from '../../../components/ui/StatTile'
import type { ActivityDef } from '../../../data/activities'
import { SKILLS } from '../../../data/skills'
import type { GameEvent, SkillEvent } from '../../../engine/advance'
import { formatXp } from '../present'

export function ActivityDetail({
  activity,
  bonus,
  successPct,
  dc,
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
  bonus: number
  successPct: number
  dc: number
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
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Bonus" value={bonus >= 0 ? `+${bonus}` : String(bonus)} />
            <StatTile label="Success %" value={`${successPct}%`} />
            <StatTile label="DC" value={dc} />
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
                <li key={`${event.activityId}-${index}`}>
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

function rollLine(event: SkillEvent): string {
  const skill = SKILLS.find((entry) => entry.id === event.skillId)?.name ?? event.label
  const items = event.items.map((item) => `${item.name} x${item.quantity}`).join(', ')
  const gold = event.gold > 0 ? `+${event.gold} gp` : ''
  const gains = [items, gold].filter(Boolean).join(' · ')
  return `${skill}: roll ${event.roll} (${event.total} vs DC ${event.dc}) ${event.outcome} +${formatXp(event.xp)} XP${gains ? ` · ${gains}` : ''}`
}
