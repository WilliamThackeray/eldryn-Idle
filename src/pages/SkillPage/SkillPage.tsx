import type { SkillId } from '../../data/skills'
import { describeXp } from '../../engine/experience'
import { useGameStore } from '../../store/gameStore'
import { SkillCard } from './components/SkillCard'
import { SkillProgress } from './components/SkillProgress'

const TRAININGS = [
  { title: 'Basic Training', description: 'Practice the fundamentals', xp: 10 },
  { title: 'Advanced Training', description: 'Push your limits', xp: 25 },
  { title: 'Expert Training', description: 'Master complex techniques', xp: 50 },
] as const

interface SkillPageProps {
  skillId: SkillId
}

export function SkillPage({ skillId }: SkillPageProps) {
  const xp = useGameStore((state) => state.skills[skillId].xp)
  const addSkillXp = useGameStore((state) => state.addSkillXp)
  const progress = describeXp(xp)

  return (
    <div>
      <div className="mb-6">
        <SkillProgress
          level={progress.level}
          xp={progress.xp}
          xpToNextLevel={progress.xpToNextLevel}
          progress={progress.progress}
          capped={progress.capped}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TRAININGS.map((training) => (
          <SkillCard
            key={training.title}
            title={training.title}
            description={training.description}
            xpGain={training.xp}
            onClick={() => addSkillXp(skillId, training.xp)}
          />
        ))}
      </div>
    </div>
  )
}
