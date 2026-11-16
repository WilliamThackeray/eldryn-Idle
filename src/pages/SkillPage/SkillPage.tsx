import { useEffect, useState } from 'react'
import { activitiesFor, type ActivityDef, type GoldDrop, type LootEntry } from '../../data/activities'
import { getClass, modifiersFor } from '../../data/classes'
import { getItem } from '../../data/items'
import { SKILLS, type SkillId } from '../../data/skills'
import { deriveAbilities } from '../../engine/abilities'
import { actionIntervalMs, activityIntervalMs, type SkillEvent } from '../../engine/advance'
import type { Inventory } from '../../engine/inventory'
import { checkDc, successChance } from '../../engine/skillCheck'
import { levelForXp, proficiency, progressToNext, tier } from '../../engine/xp'
import { useGameStore } from '../../store/gameStore'
import { ActivityDetail } from './components/ActivityDetail'
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
  const activeClassId = useGameStore((state) => state.activeClassId)
  const clericFocus = useGameStore((state) => state.clericFocus)
  const log = useGameStore((state) => state.log)
  const startActivity = useGameStore((state) => state.startActivity)
  const stopActivity = useGameStore((state) => state.stopActivity)
  const progress = progressToNext(xp)
  const level = levelForXp(xp)
  const ability = SKILLS.find((skill) => skill.id === skillId)?.ability
  const modifier = deriveAbilities(skills).find((entry) => entry.abbr === ability)?.modifier ?? 0
  const bonus = modifier + proficiency(tier(level))
  const classMods = modifiersFor(activeClassId, clericFocus)
  const className = activeClassId ? getClass(activeClassId).name : null
  const xpMultiplierLabel =
    ability && className
      ? `XP ×${(1 + (classMods[ability] ?? 0)).toFixed(2)} (${className})`
      : null
  const activities = activitiesFor(skillId)
  const activeInterval =
    activeAction?.kind === 'skill' && activeAction.skillId === skillId ? actionIntervalMs(activeAction, skills) : 0

  const [selectedId, setSelectedId] = useState(() => defaultActivityId(skillId, activeAction?.kind === 'skill' ? activeAction : null, activities))

  useEffect(() => {
    const running = useGameStore.getState().activeAction
    setSelectedId(
      defaultActivityId(skillId, running?.kind === 'skill' ? running : null, activitiesFor(skillId)),
    )
  }, [skillId])

  const selected = activities.find((activity) => activity.id === selectedId) ?? activities[0]

  return (
    <div className="space-y-6">
      <SkillProgress
        level={progress.level}
        tier={tier(progress.level)}
        xp={progress.xp}
        xpToNextLevel={progress.xpToNextLevel}
        progress={progress.progress}
        capped={progress.capped}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {activities.map((activity) => {
            const active =
              activeAction?.kind === 'skill' &&
              activeAction.skillId === skillId &&
              activeAction.activityId === activity.id
            const interval = activityIntervalMs(skillId, activity.baseIntervalMs, skills)
            return (
              <SkillCard
                key={activity.id}
                title={activity.name}
                description={activity.description}
                intervalSeconds={formatInterval(interval)}
                xpMultiplierLabel={xpMultiplierLabel}
                requiredLevel={activity.requiredLevel}
                needsMaterials={lacksInputs(activity, inventory)}
                locked={level < activity.requiredLevel}
                selected={selected?.id === activity.id}
                active={active}
                progress={active && activeInterval > 0 ? Math.min(100, (activeAction.progressMs / activeInterval) * 100) : 0}
                onSelect={() => setSelectedId(activity.id)}
              />
            )
          })}
        </div>

        {selected && (
          <ActivityDetail
            title={selected.name}
            description={selected.description}
            xpGain={selected.xp}
            xpMultiplierLabel={xpMultiplierLabel}
            intervalSeconds={formatInterval(activityIntervalMs(skillId, selected.baseIntervalMs, skills))}
            requiredLevel={selected.requiredLevel}
            dc={checkDc(selected.requiredLevel)}
            successPercent={Math.round(successChance(bonus, selected.requiredLevel) * 100)}
            bonus={bonus}
            details={activityDetails(selected, inventory)}
            needsMaterials={lacksInputs(selected, inventory)}
            locked={level < selected.requiredLevel}
            active={
              activeAction?.kind === 'skill' &&
              activeAction.skillId === skillId &&
              activeAction.activityId === selected.id
            }
            progress={
              activeAction?.kind === 'skill' &&
              activeAction.skillId === skillId &&
              activeAction.activityId === selected.id &&
              activeInterval > 0
                ? Math.min(100, (activeAction.progressMs / activeInterval) * 100)
                : 0
            }
            onStart={() =>
              startActivity({
                skillId,
                activityId: selected.id,
                label: selected.name,
                baseIntervalMs: selected.baseIntervalMs,
                requiredLevel: selected.requiredLevel,
                baseXp: selected.xp,
              })
            }
            onStop={stopActivity}
          />
        )}
      </div>

      <section className="rounded-lg border border-brown/40 bg-panel p-4 text-parchment">
        <h2 className="mb-2 font-bold text-gold">Recent rolls</h2>
        {log.length === 0 ? (
          <p className="text-sm text-parchment/70">No rolls yet.</p>
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

function defaultActivityId(
  skillId: SkillId,
  activeAction: { skillId: SkillId; activityId: string } | null,
  activities: ActivityDef[],
): string {
  if (activeAction?.skillId === skillId) {
    const running = activities.find((activity) => activity.id === activeAction.activityId)
    if (running) return running.id
  }
  return activities[0]?.id ?? ''
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
