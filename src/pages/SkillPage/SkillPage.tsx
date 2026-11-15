import { SKILLS, type SkillId } from '../../data/skills'
import { actionIntervalMs, activityIntervalMs } from '../../engine/advance'
import { levelForXp, progressToNext, tier } from '../../engine/xp'
import { useGameStore } from '../../store/gameStore'
import { SkillCard } from './components/SkillCard'
import { SkillProgress } from './components/SkillProgress'

const ACTIVITIES = [
  {
    id: 'basic',
    title: 'Basic Training',
    description: 'Practice the fundamentals',
    baseXp: 10,
    baseIntervalMs: 6_000,
    requiredLevel: 1,
  },
  {
    id: 'advanced',
    title: 'Advanced Training',
    description: 'Push your limits',
    baseXp: 25,
    baseIntervalMs: 8_000,
    requiredLevel: 5,
  },
  {
    id: 'expert',
    title: 'Expert Training',
    description: 'Master complex techniques',
    baseXp: 50,
    baseIntervalMs: 12_000,
    requiredLevel: 10,
  },
] as const

interface SkillPageProps {
  skillId: SkillId
}

export function SkillPage({ skillId }: SkillPageProps) {
  const xp = useGameStore((state) => state.skills[skillId].xp)
  const skills = useGameStore((state) => state.skills)
  const activeAction = useGameStore((state) => state.activeAction)
  const log = useGameStore((state) => state.log)
  const startActivity = useGameStore((state) => state.startActivity)
  const stopActivity = useGameStore((state) => state.stopActivity)
  const progress = progressToNext(xp)
  const level = levelForXp(xp)
  const activeInterval =
    activeAction?.kind === 'skill' && activeAction.skillId === skillId ? actionIntervalMs(activeAction, skills) : 0

  return (
    <div>
      <div className="mb-6">
        <SkillProgress
          level={progress.level}
          tier={tier(progress.level)}
          xp={progress.xp}
          xpToNextLevel={progress.xpToNextLevel}
          progress={progress.progress}
          capped={progress.capped}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ACTIVITIES.map((activity) => {
          const active =
            activeAction?.kind === 'skill' &&
            activeAction.skillId === skillId &&
            activeAction.activityId === activity.id
          const interval = activityIntervalMs(skillId, activity.baseIntervalMs, skills)
          return (
            <SkillCard
              key={activity.id}
              title={activity.title}
              description={activity.description}
              xpGain={activity.baseXp}
              intervalSeconds={formatSeconds(interval)}
              requiredLevel={activity.requiredLevel}
              locked={level < activity.requiredLevel}
              active={active}
              progress={active && activeInterval > 0 ? Math.min(100, (activeAction.progressMs / activeInterval) * 100) : 0}
              onStart={() =>
                startActivity({
                  skillId,
                  activityId: activity.id,
                  label: activity.title,
                  baseIntervalMs: activity.baseIntervalMs,
                  requiredLevel: activity.requiredLevel,
                  baseXp: activity.baseXp,
                })
              }
              onStop={stopActivity}
            />
          )
        })}
      </div>
      <section className="mt-6 bg-[#1f1f1f] text-[#DAD6D6] rounded-lg p-4">
        <h2 className="font-bold mb-2">Recent rolls</h2>
        {log.length === 0 ? (
          <p className="text-sm">No rolls yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {[...log].reverse().map((event, index) => (
              <li key={`${event.activityId}-${index}`}>
                {SKILLS.find((skill) => skill.id === event.skillId)?.name ?? event.label}: roll {event.roll} (
                {event.total} vs DC {event.dc}) {event.outcome} +{formatXp(event.xp)} XP
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function formatSeconds(ms: number): string {
  const seconds = ms / 1000
  return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`
}

function formatXp(xp: number): string {
  return Number.isInteger(xp) ? String(xp) : xp.toFixed(1)
}
