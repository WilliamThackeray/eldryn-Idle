import { ProgressBar } from '../../../components/ProgressBar'

interface SkillCardProps {
  title: string
  description: string
  intervalSeconds: string
  requiredLevel: number
  needsMaterials: boolean
  locked: boolean
  selected: boolean
  active: boolean
  progress: number
  onSelect: () => void
}

export function SkillCard({
  title,
  description,
  intervalSeconds,
  requiredLevel,
  needsMaterials,
  locked,
  selected,
  active,
  progress,
  onSelect,
}: SkillCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border p-4 text-left shadow-lg transition-colors ${
        selected ? 'border-gold bg-panel' : 'border-brown/40 bg-panel/80 hover:border-brown'
      } ${locked ? 'opacity-60' : ''}`}
    >
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-gold">{title}</h3>
        <span className="shrink-0 text-sm text-sage">{intervalSeconds}</span>
      </div>
      <p className="mb-2 line-clamp-2 text-sm text-parchment/90">{description}</p>
      {locked ? (
        <p className="text-sm text-parchment/70">Requires level {requiredLevel}</p>
      ) : needsMaterials ? (
        <p className="text-sm text-parchment/70">Need materials</p>
      ) : null}
      {active && <ProgressBar progress={progress} className="mt-3 h-1.5" label={`${title} progress`} />}
    </button>
  )
}
