interface SkillCardProps {
  title: string
  description: string
  xpGain: number
  intervalSeconds: string
  requiredLevel: number
  locked: boolean
  active: boolean
  progress: number
  onStart: () => void
  onStop: () => void
}

export function SkillCard({
  title,
  description,
  xpGain,
  intervalSeconds,
  requiredLevel,
  locked,
  active,
  progress,
  onStart,
  onStop,
}: SkillCardProps) {
  return (
    <div className={`bg-[#1f1f1f] p-6 rounded-lg shadow-lg ${locked ? 'opacity-60' : ''}`}>
      <h3 className="text-xl font-bold text-[#F4AC45] mb-2">{title}</h3>
      <p className="text-[#DAD6D6] mb-4">{description}</p>
      <div className="flex justify-between items-center gap-3 mb-3">
        <span className="text-[#92BFB1]">
          +{xpGain} XP · {intervalSeconds}
        </span>
        {locked ? (
          <span className="text-[#DAD6D6]">Requires level {requiredLevel}</span>
        ) : (
          <button
            type="button"
            onClick={active ? onStop : onStart}
            className="px-4 py-2 bg-[#A61C3C] text-[#DAD6D6] rounded-lg hover:bg-[#694A38] transition-colors"
          >
            {active ? 'Stop' : 'Start'}
          </button>
        )}
      </div>
      {active && (
        <div
          className="w-full h-2 bg-[#694A38] rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label={`${title} progress`}
        >
          <div className="h-full bg-[#F4AC45]" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}
