import { Lock } from 'lucide-react'
import { ProgressBar } from '../../../components/ProgressBar'
import { Chip } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { ItemChip } from '../../../components/ui/ItemChip'
import type { ActivityDef } from '../../../data/activities'

export function ActivityCard({
  activity,
  selected,
  running,
  progress,
  intervalLabel,
  successPct,
  inputs,
  output,
  lockedLabel,
  onSelect,
}: {
  activity: ActivityDef
  selected: boolean
  running: boolean
  progress: number
  intervalLabel: string
  successPct: number
  inputs: { name: string; owned: number; needed: number }[]
  output: { name: string; note?: string } | null
  lockedLabel: string | null
  onSelect: () => void
}) {
  const tone = successPct >= 70 ? 'easy' : successPct >= 40 ? 'even' : 'hard'
  return (
    <Card
      variant={lockedLabel ? 'muted' : running ? 'highlight' : 'interactive'}
      selected={selected}
      onClick={onSelect}
      className="p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        {lockedLabel && <Lock size={14} aria-hidden />}
        <span className="text-card">{activity.name}</span>
        <Chip>{intervalLabel}</Chip>
        <Chip tone={tone}>{successPct}%</Chip>
        {lockedLabel && <Chip>{lockedLabel}</Chip>}
      </div>
      <p className="mt-1 truncate text-meta text-muted">{activity.description}</p>
      {(inputs.length > 0 || output) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {inputs.map((input) => (
            <ItemChip key={input.name} name={input.name} owned={input.owned} needed={input.needed} />
          ))}
          {output && <ItemChip name={output.name} note={output.note} />}
        </div>
      )}
      {running && (
        <div className="mt-2">
          <ProgressBar progress={progress} className="h-1.5" label={`${activity.name} progress`} />
        </div>
      )}
    </Card>
  )
}
