interface SkillProgressProps {
  level: number
  xp: number
  xpToNextLevel: number
  progress: number
  capped: boolean
}

export function SkillProgress({ level, xp, xpToNextLevel, progress, capped }: SkillProgressProps) {
  return (
    <div className="bg-[#1f1f1f] text-[#DAD6D6] p-4 rounded-lg">
      <div className="flex justify-between mb-2">
        <span>Level {level}</span>
        <span>{capped ? `${xp} XP` : `${xp} / ${xpToNextLevel} XP`}</span>
      </div>
      <div className="w-full h-4 bg-[#694A38] rounded-full overflow-hidden">
        <div className="h-full bg-[#F4AC45]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
