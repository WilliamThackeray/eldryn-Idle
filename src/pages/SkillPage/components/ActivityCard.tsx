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
  masked,
  maskText,
  isNew,
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
  masked: boolean
  maskText: string
  isNew: boolean
  onSelect: () => void
}) {
  if (masked) {
    return (
      <Card variant="muted" selected={selected} onClick={onSelect} className="p-3">
        <div className="flex items-center gap-2 text-muted">
          <Lock size={14} aria-hidden />
          <span className="text-card">{maskText}</span>
        </div>
      </Card>
    )
  }
  const tone = successPct >= 70 ? 'easy' : successPct >= 40 ? 'even' : 'hard'
  return (
    <Card variant={running ? 'highlight' : 'interactive'} selected={selected} onClick={onSelect} className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-card">{activity.name}</span>
        {isNew && <Chip tone="gold">NEW</Chip>}
        <Chip>{intervalLabel}</Chip>
        <Chip tone={tone}>{successPct}%</Chip>
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
