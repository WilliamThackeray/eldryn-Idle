import { activitiesFor, type ActivityDef, type GoldDrop, type LootEntry } from '../../data/activities'
import { getItem } from '../../data/items'
import { SKILLS, type SkillId } from '../../data/skills'
import { deriveAbilities } from '../../engine/abilities'
import { actionIntervalMs, activityIntervalMs, type SkillEvent } from '../../engine/advance'
import type { Inventory } from '../../engine/inventory'
import { checkDc, successChance } from '../../engine/skillCheck'
import { levelForXp, proficiency, progressToNext, tier } from '../../engine/xp'
import { useGameStore } from '../../store/gameStore'
import { SkillCard } from './components/SkillCard'
import { SkillProgress } from './components/SkillProgress'

interface SkillPageProps {
  skillId: SkillId
}

export function SkillPage({ skillId }: SkillPageProps) {
  const xp = useGameStore((state) => state.skills[skillId].xp)
  const skills = useGameStore((state) => state.skills)
  const inventory = useGameStore((state) => state.inventory)
  const activeAction = useGameStore((state) => state.activeAction)
  const log = useGameStore((state) => state.log)
  const startActivity = useGameStore((state) => state.startActivity)
  const stopActivity = useGameStore((state) => state.stopActivity)
  const progress = progressToNext(xp)
  const level = levelForXp(xp)
  const ability = SKILLS.find((skill) => skill.id === skillId)?.ability
  const modifier = deriveAbilities(skills).find((entry) => entry.abbr === ability)?.modifier ?? 0
  const bonus = modifier + proficiency(tier(level))
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
        {activitiesFor(skillId).map((activity) => {
          const active =
            activeAction?.kind === 'skill' &&
            activeAction.skillId === skillId &&
            activeAction.activityId === activity.id
          const interval = activityIntervalMs(skillId, activity.baseIntervalMs, skills)
          const short = lacksInputs(activity, inventory)
          return (
            <SkillCard
              key={activity.id}
              title={activity.name}
              description={activity.description}
              xpGain={activity.xp}
              intervalSeconds={formatInterval(interval)}
              requiredLevel={activity.requiredLevel}
              dc={checkDc(activity.requiredLevel)}
              successPercent={Math.round(successChance(bonus, activity.requiredLevel) * 100)}
              details={activityDetails(activity, inventory)}
              needsMaterials={short}
              locked={level < activity.requiredLevel}
              active={active}
              progress={active && activeInterval > 0 ? Math.min(100, (activeAction.progressMs / activeInterval) * 100) : 0}
              onStart={() =>
                startActivity({
                  skillId,
                  activityId: activity.id,
                  label: activity.name,
                  baseIntervalMs: activity.baseIntervalMs,
                  requiredLevel: activity.requiredLevel,
                  baseXp: activity.xp,
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
                {event.kind === 'materials'
                  ? `Out of materials: ${event.label}. Stopped.`
                  : `${SKILLS.find((skill) => skill.id === event.skillId)?.name ?? event.label}: roll ${event.roll} (${event.total} vs DC ${event.dc}) ${event.outcome} +${formatXp(event.xp)} XP${formatGains(event)}`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function lacksInputs(activity: ActivityDef, inventory: Inventory): boolean {
  return (activity.inputs ?? []).some((stack) => (inventory[stack.itemId] ?? 0) < stack.quantity)
}

function activityDetails(activity: ActivityDef, inventory: Inventory): string[] {
  const lines: string[] = []
  if (activity.inputs?.length) {
    lines.push(
      `Needs ${activity.inputs
        .map((stack) => `${itemName(stack.itemId)} ${inventory[stack.itemId] ?? 0}/${stack.quantity}`)
        .join(', ')}`,
    )
  }
  const yields = [
    ...activity.outputs.map(formatLoot),
    ...(activity.rareTable ?? []).map((entry) => `${formatLoot(entry)} rare`),
    ...(activity.byproducts ?? []).map((entry) => `${formatLoot(entry)} on a fumble`),
    ...(activity.gold ? [formatGold(activity.gold)] : []),
  ]
  if (yields.length > 0) lines.push(`Yields ${yields.join(', ')}`)
  return lines
}

function formatLoot(entry: LootEntry): string {
  const qty = entry.min === entry.max ? `x${entry.min}` : `x${entry.min}-${entry.max}`
  const chance = entry.chance < 1 ? ` (${Math.round(entry.chance * 100)}%)` : ''
  return `${itemName(entry.itemId)} ${qty}${chance}`
}

function formatGold(gold: GoldDrop): string {
  return gold.min === gold.max ? `${gold.min} gp` : `${gold.min}-${gold.max} gp`
}

function itemName(id: string): string {
  return getItem(id)?.name ?? id
}

function formatGains(event: SkillEvent): string {
  const items = event.items.map((item) => `${item.name} x${item.quantity}`).join(', ')
  const gold = event.gold > 0 ? `+${event.gold} gp` : ''
  const parts = [items, gold].filter(Boolean)
  return parts.length > 0 ? ` · ${parts.join(' · ')}` : ''
}

function formatInterval(ms: number): string {
  const seconds = ms / 1000
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`
  return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`
}

function formatXp(xp: number): string {
  return Number.isInteger(xp) ? String(xp) : xp.toFixed(1)
}
