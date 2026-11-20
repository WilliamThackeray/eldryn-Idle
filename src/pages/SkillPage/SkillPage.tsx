import { useEffect, useMemo, useState } from 'react'
import { activitiesFor, type ActivityDef, type GoldDrop, type LootEntry } from '../../data/activities'
import { getClass, modifiersFor } from '../../data/classes'
import {
  parseBestiaryItemId,
  parseNoteItemId,
  parseTomeActivityId,
  parseTomeItemId,
} from '../../data/historyContent'
import { getItem, type ItemId } from '../../data/items'
import { intervalBonus } from '../../data/shop'
import { SKILLS, type SkillId } from '../../data/skills'
import { activePerks, deriveAbilities, effectTotal } from '../../engine/abilities'
import { actionIntervalMs, activityIntervalMs, type SkillEvent } from '../../engine/advance'
import { discountTomeInputs, tomeCheckBonus, tomeSpeedBonus, tomeXpPct } from '../../engine/history'
import type { Inventory } from '../../engine/inventory'
import { activityUnlocked } from '../../engine/quest'
import { checkDc, successChance } from '../../engine/skillCheck'
import { levelForXp, proficiency, progressToNext, tier } from '../../engine/xp'
import { useGameStore } from '../../store/gameStore'
import { ActivityDetail } from './components/ActivityDetail'
import { SkillCard } from './components/SkillCard'
import { SkillProgress } from './components/SkillProgress'

interface SkillPageProps {
  skillId: SkillId
  focus?: { kind: 'activity'; skillId: SkillId; activityId: string } | null
  onFocusConsumed?: () => void
}

const HISTORY_GROUPS = [
  { id: 'study', title: 'Study', match: (id: string) => id === 'chronicles' || id === 'lost-runes' },
  { id: 'tomes', title: 'Tomes', match: (id: string) => id.startsWith('craft-tome-') },
  { id: 'notes', title: 'Notes', match: (id: string) => id.startsWith('craft-notes-') },
  { id: 'bestiaries', title: 'Bestiaries', match: (id: string) => id.startsWith('craft-bestiary-') },
] as const

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const

export function SkillPage({ skillId, focus = null, onFocusConsumed }: SkillPageProps) {
  const xp = useGameStore((state) => state.skills[skillId].xp)
  const skills = useGameStore((state) => state.skills)
  const inventory = useGameStore((state) => state.inventory)
  const equipment = useGameStore((state) => state.equipment)
  const upgrades = useGameStore((state) => state.upgrades)
  const tomes = useGameStore((state) => state.tomes)
  const bestiaries = useGameStore((state) => state.bestiaries)
  const activeAction = useGameStore((state) => state.activeAction)
  const classId = useGameStore((state) => state.classId)
  const clericFocus = useGameStore((state) => state.clericFocus)
  const log = useGameStore((state) => state.log)
  const startActivity = useGameStore((state) => state.startActivity)
  const stopActivity = useGameStore((state) => state.stopActivity)
  const readTome = useGameStore((state) => state.readTome)
  const readBestiary = useGameStore((state) => state.readBestiary)
  const activateNotes = useGameStore((state) => state.useNotes)
  const renown = useGameStore((state) => state.renown)
  const questProgress = useGameStore((state) => state.questProgress)
  const progress = progressToNext(xp)
  const level = levelForXp(xp)
  const ability = SKILLS.find((skill) => skill.id === skillId)?.ability
  const modifier = deriveAbilities(skills).find((entry) => entry.abbr === ability)?.modifier ?? 0
  const checkBonus = tomeCheckBonus(tomes, skillId)
  const bonus = modifier + proficiency(tier(level)) + checkBonus
  const classMods = modifiersFor(classId, clericFocus)
  const className = classId ? getClass(classId).name : null
  const tomePct = tomeXpPct(tomes, skillId)
  const classFrac = ability ? (classMods[ability] ?? 0) : 0
  const xpMultiplierLabel =
    ability && className
      ? `XP ×${(1 + classFrac + tomePct).toFixed(2)} (${className}${tomePct > 0 ? ' + History' : ''})`
      : tomePct > 0
        ? `XP ×${(1 + tomePct).toFixed(2)} (History)`
        : null
  const historyLine = historyBonusLine(tomes[skillId] ?? 0)
  const activities = useMemo(
    () =>
      activitiesFor(skillId).filter((activity) =>
        activityUnlocked(activity.requiresQuest, questProgress),
      ),
    [skillId, questProgress],
  )
  const pageDiscount = effectTotal(activePerks({ skills }), 'historyTomePages')
  const tomeSpeed = tomeSpeedBonus(tomes, skillId)
  const activeSpeed =
    (activeAction?.kind === 'skill' ? intervalBonus(upgrades, activeAction.activityId) : 0) +
    (activeAction?.kind === 'skill' && activeAction.skillId === skillId ? tomeSpeed : 0)
  const activeInterval =
    activeAction?.kind === 'skill' && activeAction.skillId === skillId
      ? actionIntervalMs(activeAction, skills, equipment, null, activeSpeed)
      : 0

  const [selectedId, setSelectedId] = useState(() =>
    defaultActivityId(skillId, activeAction?.kind === 'skill' ? activeAction : null, activities),
  )

  useEffect(() => {
    const running = useGameStore.getState().activeAction
    setSelectedId(
      defaultActivityId(skillId, running?.kind === 'skill' ? running : null, activitiesFor(skillId)),
    )
  }, [skillId])

  useEffect(() => {
    if (!focus || focus.skillId !== skillId) return
    if (activitiesFor(skillId).some((activity) => activity.id === focus.activityId)) {
      setSelectedId(focus.activityId)
    }
    onFocusConsumed?.()
  }, [focus, skillId, onFocusConsumed])

  const selected = activities.find((activity) => activity.id === selectedId) ?? activities[0]
  const secondary = selected ? secondaryAction(selected, inventory, tomes, bestiaries) : null

  const renderCard = (activity: ActivityDef) => {
    const active =
      activeAction?.kind === 'skill' &&
      activeAction.skillId === skillId &&
      activeAction.activityId === activity.id
    const interval = activityIntervalMs(
      skillId,
      activity.baseIntervalMs,
      skills,
      equipment,
      intervalBonus(upgrades, activity.id) + tomeSpeed,
    )
    return (
      <SkillCard
        key={activity.id}
        title={activity.name}
        description={activity.description}
        intervalSeconds={formatInterval(interval)}
        xpMultiplierLabel={xpMultiplierLabel}
        requiredLevel={activity.requiredLevel}
        needsMaterials={lacksInputs(activity, inventory, pageDiscount)}
        locked={
          level < activity.requiredLevel ||
          (activity.renownRequired != null && renown < activity.renownRequired)
        }
        selected={selected?.id === activity.id}
        active={active}
        progress={active && activeInterval > 0 ? Math.min(100, (activeAction.progressMs / activeInterval) * 100) : 0}
        onSelect={() => setSelectedId(activity.id)}
      />
    )
  }

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

      {historyLine && skillId !== 'history' && (
        <p className="text-sm text-sage">{historyLine}</p>
      )}
      {skillId === 'performance' && (
        <p className="text-sm text-sage">Renown: {renown}</p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
        <div className="space-y-6">
          {skillId === 'history'
            ? HISTORY_GROUPS.map((group) => {
                const groupActivities = activities.filter((activity) => group.match(activity.id))
                if (groupActivities.length === 0) return null
                return (
                  <section key={group.id}>
                    <h2 className="mb-3 font-bold text-gold">{group.title}</h2>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {groupActivities.map(renderCard)}
                    </div>
                  </section>
                )
              })
            : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{activities.map(renderCard)}</div>
            )}
        </div>

        {selected && (
          <ActivityDetail
            title={selected.name}
            description={selected.description}
            xpGain={selected.xp}
            xpMultiplierLabel={xpMultiplierLabel}
            intervalSeconds={formatInterval(
              activityIntervalMs(
                skillId,
                selected.baseIntervalMs,
                skills,
                equipment,
                intervalBonus(upgrades, selected.id) + tomeSpeed,
              ),
            )}
            requiredLevel={selected.requiredLevel}
            dc={checkDc(selected.requiredLevel)}
            successPercent={Math.round(successChance(bonus, selected.requiredLevel) * 100)}
            bonus={bonus}
            details={activityDetails(selected, inventory, pageDiscount, renown)}
            needsMaterials={lacksInputs(selected, inventory, pageDiscount)}
            locked={
              level < selected.requiredLevel ||
              (selected.renownRequired != null && renown < selected.renownRequired)
            }
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
            secondaryLabel={secondary?.label ?? null}
            secondaryDisabled={secondary ? !secondary.ready : false}
            onSecondary={
              secondary
                ? () => {
                    if (secondary.kind === 'tome') readTome(secondary.itemId)
                    else if (secondary.kind === 'bestiary') readBestiary(secondary.itemId)
                    else activateNotes(secondary.itemId)
                  }
                : null
            }
          />
        )}
      </div>

      <section className="rounded-lg border border-brown/40 bg-panel p-4 text-parchment">
        <h2 className="mb-2 font-bold text-gold">Recent rolls</h2>
        {log.length === 0 ? (
          <p className="text-sm text-parchment/70">No rolls yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {[...log].reverse().map((event, index) => {
              if (event.kind === 'materials') {
                return (
                  <li key={`materials-${index}`}>Out of materials: {event.label}. Stopped.</li>
                )
              }
              if (event.kind !== 'skill') return null
              return (
                <li key={`${event.activityId}-${index}`}>
                  {`${SKILLS.find((skill) => skill.id === event.skillId)?.name ?? event.label}: roll ${event.roll} (${event.total} vs DC ${event.dc}) ${event.outcome} +${formatXp(event.xp)} XP${formatGains(event)}`}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function historyBonusLine(volumes: number): string | null {
  if (volumes <= 0) return null
  const roman = ROMAN[Math.min(volumes, 10) - 1] ?? String(volumes)
  const parts = [`History: Vol. ${roman} (+${Math.min(volumes, 10)}% XP)`]
  if (volumes >= 5) parts.push('−5% interval')
  if (volumes >= 10) parts.push('+1 check')
  return parts.join(' · ')
}

function secondaryAction(
  activity: ActivityDef,
  inventory: Inventory,
  tomes: Record<SkillId, number>,
  bestiaries: Record<string, number>,
): { kind: 'tome' | 'bestiary' | 'notes'; itemId: ItemId; label: string; ready: boolean } | null {
  const outputId = activity.outputs[0]?.itemId
  if (!outputId) return null
  const tome = parseTomeItemId(outputId)
  if (tome) {
    const current = tomes[tome.skillId] ?? 0
    return {
      kind: 'tome',
      itemId: outputId,
      label: 'Read',
      ready: (inventory[outputId] ?? 0) > 0 && tome.volume === current + 1,
    }
  }
  const bestiary = parseBestiaryItemId(outputId)
  if (bestiary) {
    const current = bestiaries[bestiary.type] ?? 0
    return {
      kind: 'bestiary',
      itemId: outputId,
      label: 'Read',
      ready: (inventory[outputId] ?? 0) > 0 && bestiary.volume === current + 1,
    }
  }
  if (parseNoteItemId(outputId)) {
    return {
      kind: 'notes',
      itemId: outputId,
      label: 'Use',
      ready: (inventory[outputId] ?? 0) > 0,
    }
  }
  return null
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

function craftInputs(activity: ActivityDef, pageDiscount: number) {
  if (!activity.inputs?.length) return []
  if (!parseTomeActivityId(activity.id)) return activity.inputs
  return discountTomeInputs(activity.id, activity.inputs, pageDiscount).filter((stack) => stack.quantity > 0)
}

function lacksInputs(activity: ActivityDef, inventory: Inventory, pageDiscount: number): boolean {
  return craftInputs(activity, pageDiscount).some((stack) => (inventory[stack.itemId] ?? 0) < stack.quantity)
}

function activityDetails(
  activity: ActivityDef,
  inventory: Inventory,
  pageDiscount: number,
  renown: number,
): string[] {
  const lines: string[] = []
  const inputs = craftInputs(activity, pageDiscount)
  if (inputs.length) {
    lines.push(
      `Needs ${inputs
        .map((stack) => `${itemName(stack.itemId)} ${inventory[stack.itemId] ?? 0}/${stack.quantity}`)
        .join(', ')}`,
    )
  }
  if (activity.renownRequired != null) {
    lines.push(`Requires Renown ${activity.renownRequired} (have ${renown})`)
  }
  const yields = [
    ...activity.outputs.map(formatLoot),
    ...(activity.rareTable ?? []).map((entry) => `${formatLoot(entry)} rare`),
    ...(activity.byproducts ?? []).map((entry) => `${formatLoot(entry)} on a fumble`),
    ...(activity.gold ? [formatGold(activity.gold)] : []),
    ...(activity.favor ? [`${formatGold(activity.favor).replace(' gp', '')} Favor`] : []),
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
