import { ProgressBar } from '../../../components/ProgressBar'

interface SkillProgressProps {
  level: number
  tier: number
  xp: number
  xpToNextLevel: number
  progress: number
  capped: boolean
}

export function SkillProgress({ level, tier, xp, xpToNextLevel, progress, capped }: SkillProgressProps) {
  return (
    <div className="rounded-lg border border-brown/40 bg-panel p-4 text-parchment">
      <div className="mb-2 flex justify-between text-sm">
        <span>Level {level}</span>
        <span>Tier {tier}</span>
        <span>{capped ? `${xp} XP` : `${xp} / ${xpToNextLevel} XP`}</span>
      </div>
      <ProgressBar progress={progress} className="h-3" label="Skill XP progress" />
    </div>
  )
}
