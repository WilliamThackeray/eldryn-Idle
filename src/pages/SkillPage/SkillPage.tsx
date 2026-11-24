import { useEffect, useMemo, useState } from 'react'
import { LoadoutButton } from '../../components/LoadoutDrawer'
import { SkillIcon } from '../../components/skillIcons'
import { ProgressBar } from '../../components/ProgressBar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageLayout } from '../../components/ui/PageLayout'
import { SubHeading } from '../../components/ui/SectionHeading'
import { TabPanel, Tabs } from '../../components/ui/Tabs'
import { activitiesFor, type ActivityDef } from '../../data/activities'
import { compareActivities, parseGroup, tabsFor, visibleActivities } from '../../data/activities/display'
import { getClass, modifiersFor } from '../../data/classes'
import {
  parseBestiaryItemId,
  parseNoteItemId,
  parseTomeItemId,
} from '../../data/historyContent'
import type { ItemId } from '../../data/items'
import { intervalBonus } from '../../data/shop'
import { SKILLS, type TradeSkillId } from '../../data/skills'
import { activePerks, deriveAbilities, effectTotal } from '../../engine/abilities'
import { actionIntervalMs, activityIntervalMs } from '../../engine/advance'
import { totalItemStats } from '../../engine/equipment'
import { tomeSpeedBonus, tomeXpPct } from '../../engine/history'
import type { Inventory } from '../../engine/inventory'
import { presentActivity, activityIsListed, type Viewer } from '../../engine/presentActivity'
import {
  activityBonusParts,
  activityRollMode,
  checkDc,
  formatCheckLine,
  qualityOdds,
} from '../../engine/skillCheck'
import { levelForXp, progressToNext, tier, xpForLevel } from '../../engine/xp'
import { useGameStore } from '../../store/gameStore'
import { useUiPrefs } from '../../store/uiPrefs'
import { ActivityCard } from './components/ActivityCard'
import { ActivityDetail } from './components/ActivityDetail'
import { ActivityGroup } from './components/ActivityGroup'
import { TomeCatalog } from './components/TomeCatalog'
import {
  KIND_LABEL,
  formatInterval,
  formatXp,
  goldNote,
  inputChips,
  itemName,
  lockLabel,
  lootNote,
} from './present'

interface SkillPageProps {
  skillId: TradeSkillId
  focus?: { kind: 'activity'; skillId: TradeSkillId; activityId: string } | null
  onFocusConsumed?: () => void
}

export function SkillPage({ skillId, focus = null, onFocusConsumed }: SkillPageProps) {
  const xp = useGameStore((state) => state.skills[skillId].xp)
  const skills = useGameStore((state) => state.skills)
  const inventory = useGameStore((state) => state.inventory)
  const equipment = useGameStore((state) => state.equipment)
  const upgrades = useGameStore((state) => state.upgrades)
  const tomes = useGameStore((state) => state.tomes)
  const activeBuffs = useGameStore((state) => state.activeBuffs)
  const bestiaries = useGameStore((state) => state.bestiaries)
  const activeAction = useGameStore((state) => state.activeAction)
  const classId = useGameStore((state) => state.classId)
  const secondaryClassId = useGameStore((state) => state.secondaryClassId)
  const clericFocus = useGameStore((state) => state.clericFocus)
  const log = useGameStore((state) => state.log)
  const startActivity = useGameStore((state) => state.startActivity)
  const stopActivity = useGameStore((state) => state.stopActivity)
  const readTome = useGameStore((state) => state.readTome)
  const readBestiary = useGameStore((state) => state.readBestiary)
  const activateNotes = useGameStore((state) => state.useNotes)
  const renown = useGameStore((state) => state.renown)
  const questProgress = useGameStore((state) => state.questProgress)
  const hideLocked = useUiPrefs((state) => state.hideLocked)
  const setHideLocked = useUiPrefs((state) => state.setHideLocked)
  const unseenUnlocks = useUiPrefs((state) => state.unseenUnlocks)
  const markSeen = useUiPrefs((state) => state.markSeen)
  const savedTab = useUiPrefs((state) => state.lastTab[`skill:${skillId}`])
  const setLastTab = useUiPrefs((state) => state.setLastTab)

  const progress = progressToNext(xp)
  const level = levelForXp(xp)
  const skill = SKILLS.find((entry) => entry.id === skillId)
  const ability = skill?.ability
  const derived = deriveAbilities(skills).find((entry) => entry.abbr === ability)
  const rank = derived?.rank
  const checkState = { skills, equipment, tomes, activeBuffs }
  const checkParts = activityBonusParts(checkState, skillId)
  const rollMode = activityRollMode(checkState, skillId)
  const checkBonus = checkParts.find((part) => part.label === 'History')?.value ?? 0
  const classMods = modifiersFor(classId, clericFocus)
  const className = classId ? getClass(classId).name : null
  const tomePct = tomeXpPct(tomes, skillId)
  const classFrac = ability ? (classMods[ability] ?? 0) : 0
  const tomeSpeed = tomeSpeedBonus(tomes, skillId)
  const pageDiscount = effectTotal(activePerks({ skills }), 'historyTomePages')

  const viewer: Viewer = useMemo(
    () => ({ skills, renown, classId, secondaryClassId, questProgress }),
    [skills, renown, classId, secondaryClassId, questProgress],
  )
  const activities = useMemo(
    () => activitiesFor(skillId).filter((activity) => activityIsListed(activity, viewer)),
    [skillId, viewer],
  )
  const tabs = useMemo(() => tabsFor(skillId, activities), [skillId, activities])
  const running =
    activeAction?.kind === 'skill' && activeAction.skillId === skillId ? activeAction : null
  const runningActivity = running
    ? activities.find((activity) => activity.id === running.activityId)
    : undefined

  const [pickedTab, setPickedTab] = useState<string | null>(null)
  const [pickedSub, setPickedSub] = useState<{ category: string; id: string } | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [tabSkill, setTabSkill] = useState(skillId)
  const switching = tabSkill !== skillId
  if (switching) {
    setTabSkill(skillId)
    setPickedTab(null)
    setPickedSub(null)
    setSelectedId('')
  }
  const activePicked = switching ? null : pickedTab
  const activeSub = switching ? null : pickedSub
  const activeSelected = switching ? '' : selectedId

  const tab =
    activePicked && tabs.includes(activePicked)
      ? activePicked
      : runningActivity?.category && tabs.includes(runningActivity.category)
        ? runningActivity.category
        : savedTab && tabs.includes(savedTab)
          ? savedTab
          : (tabs[0] ?? '')

  const inTab = (tabs.length > 0 ? activities.filter((activity) => activity.category === tab) : activities)
    .slice()
    .sort(compareActivities)
  const useSubtabs = inTab.length > 0 && inTab.every((activity) => parseGroup(activity.group).subtab)
  const subMap = new Map<string, ActivityDef[]>()
  if (useSubtabs) {
    for (const activity of inTab) {
      const sub = parseGroup(activity.group).subtab ?? ''
      const list = subMap.get(sub) ?? []
      list.push(activity)
      subMap.set(sub, list)
    }
  }
  const subIds = [...subMap.keys()]
  const runningSub =
    runningActivity?.category === tab ? parseGroup(runningActivity.group).subtab : undefined
  const unlockedSub = subIds.find((id) => {
    const rows = subMap.get(id) ?? []
    return rows.some((activity) => level >= activity.requiredLevel)
  })
  const sub =
    subIds.length === 0
      ? ''
      : activeSub?.category === tab && subIds.includes(activeSub.id)
        ? activeSub.id
        : runningSub && subIds.includes(runningSub)
          ? runningSub
          : (unlockedSub ?? subIds[0] ?? '')
  const listed = sub ? (subMap.get(sub) ?? []) : inTab

  useEffect(() => {
    if (!focus || focus.skillId !== skillId) return
    const activity = activities.find((entry) => entry.id === focus.activityId)
    if (activity) {
      setSelectedId(activity.id)
      if (activity.category && tabs.includes(activity.category)) {
        setPickedTab(activity.category)
        setLastTab(`skill:${skillId}`, activity.category)
        const nextSub = parseGroup(activity.group).subtab
        if (nextSub) setPickedSub({ category: activity.category, id: nextSub })
      }
    }
    onFocusConsumed?.()
  }, [activities, focus, onFocusConsumed, setLastTab, skillId, tabs])

  const selected =
    activities.find((activity) => activity.id === activeSelected) ?? runningActivity ?? listed[0] ?? activities[0] ?? null

  const modifiers = modifierLine({
    className,
    classFrac,
    tomePct,
    tomeSpeed,
    checkBonus,
    ability,
    rank,
    toolName: skill && 'toolName' in skill ? skill.toolName : undefined,
    renown: skillId === 'performance' ? renown : null,
  })

  function chooseTab(next: string) {
    setPickedTab(next)
    setLastTab(`skill:${skillId}`, next)
  }

  function intervalOf(activity: ActivityDef): number {
    const gearSpeed = (totalItemStats(equipment).skillSpeedPct[skillId] ?? 0) / 100
    const speed = intervalBonus(upgrades, activity.id) + tomeSpeed + gearSpeed
    if (activeAction?.kind === 'skill' && activeAction.activityId === activity.id) {
      return actionIntervalMs(activeAction, skills, equipment, null, speed)
    }
    return activityIntervalMs(skillId, activity.baseIntervalMs, skills, equipment, speed)
  }

  function start(activity: ActivityDef) {
    setSelectedId(activity.id)
    startActivity({
      skillId,
      activityId: activity.id,
      label: activity.name,
      baseIntervalMs: activity.baseIntervalMs,
      requiredLevel: activity.requiredLevel,
      baseXp: activity.xp,
    })
  }

  function renderCard(activity: ActivityDef) {
    const view = presentActivity(activity, viewer)
    const odds = qualityOdds(checkState, activity)
    const success = Math.round(100 - odds.fail - odds.fumble)
    const runningThis = running?.activityId === activity.id
    const interval = intervalOf(activity)
    const maskText =
      view.lock === 'quest'
        ? 'Requires a quest'
        : view.lock === 'renown'
          ? `Requires Renown ${activity.renownRequired}`
          : `Requires ${skill?.name ?? skillId} level ${activity.requiredLevel}`
    return (
      <ActivityCard
        activity={activity}
        selected={selected?.id === activity.id}
        running={runningThis}
        progress={runningThis && interval > 0 ? Math.min(100, ((running?.progressMs ?? 0) / interval) * 100) : 0}
        intervalLabel={formatInterval(interval)}
        successPct={success}
        inputs={inputChips(activity, inventory, pageDiscount)}
        output={mainOutput(activity)}
        masked={!view.visible}
        maskText={maskText}
        isNew={view.visible && unseenUnlocks.includes(`${skillId}:${activity.id}`)}
        onSelect={() => {
          setSelectedId(activity.id)
          if (view.visible) markSeen(`${skillId}:${activity.id}`)
        }}
      />
    )
  }

  const detailFor = (activity: ActivityDef) => {
    const dc = checkDc(activity.requiredLevel)
    const odds = qualityOdds(checkState, activity)
    const mult = 1 + classFrac + tomePct
    const parts = [
      `Base ${formatXp(activity.xp)}`,
      className ? `${className} ×${(1 + classFrac).toFixed(2)}` : null,
      tomePct > 0 ? `History +${Math.round(tomePct * 100)}%` : null,
      `Grants ${formatXp(activity.xp * mult)} XP`,
    ].filter(Boolean)
    const required = [`Lv ${activity.requiredLevel}`]
    if (activity.renownRequired != null) required.push(`Renown ${activity.renownRequired}`)
    return {
      dc,
      odds,
      checkLine: formatCheckLine(checkParts, dc, rollMode),
      checkParts,
      xpLabel: formatXp(activity.xp),
      xpBreakdown: parts.join(' · '),
      requiredLabel: required.join(' · '),
    }
  }

  const renderGrouped = (list: ActivityDef[]) => {
    const marked = list.map((activity) => ({
      activity,
      locked: !presentActivity(activity, viewer).visible,
      level: activity.requiredLevel,
    }))
    const { shown, moreMax } = visibleActivities(marked, hideLocked)
    const headings = new Map<string, Map<string, ActivityDef[]>>()
    for (const item of shown) {
      const parts = parseGroup(item.activity.group)
      const heading = parts.heading ?? ''
      const subheading = parts.subheading ?? ''
      const bucket = headings.get(heading) ?? new Map<string, ActivityDef[]>()
      const rows = bucket.get(subheading) ?? []
      rows.push(item.activity)
      bucket.set(subheading, rows)
      headings.set(heading, bucket)
    }
    return (
      <>
        {[...headings.entries()].map(([heading, subs]) => {
          const rows = [...subs.values()].flat()
          const headingLocked = rows.every((activity) => !presentActivity(activity, viewer).visible)
          return (
            <section key={heading || 'all'} className="space-y-3">
              {heading && !headingLocked && <SubHeading title={heading} />}
              {[...subs.entries()].map(([subheading, groupRows]) => {
                const groupLocked = groupRows.every((activity) => !presentActivity(activity, viewer).visible)
                return (
                  <ActivityGroup
                    key={subheading || heading || 'all'}
                    title={subheading && !groupLocked ? subheading : undefined}
                    activities={groupRows}
                    locked={(activity) => !presentActivity(activity, viewer).visible}
                    hideLocked={false}
                    preview={false}
                  >
                    {renderCard}
                  </ActivityGroup>
                )
              })}
            </section>
          )
        })}
        {moreMax != null && <p className="text-meta text-muted">More unlocks up to level {moreMax}</p>}
      </>
    )
  }

  const detail = selected ? detailFor(selected) : null
  function lockPanelFor(activity: ActivityDef | null) {
    if (!activity) return null
    const view = presentActivity(activity, viewer)
    if (view.visible) return null
    if (view.lock === 'quest') return { title: 'Requires a quest', level, progress: 0 }
    const end = xpForLevel(activity.requiredLevel)
    const start = xpForLevel(level)
    const span = Math.max(1, end - start)
    return {
      title:
        view.lock === 'renown'
          ? `Requires Renown ${activity.renownRequired}`
          : `Unlocks at ${skill?.name ?? skillId} level ${activity.requiredLevel}`,
      level,
      progress: activity.requiredLevel <= level ? 1 : Math.min(1, Math.max(0, (xp - start) / span)),
    }
  }
  const nextUnlock = activities.reduce<number | null>((best, activity) => {
    if (activity.requiredLevel <= level) return best
    if (!activityIsListed(activity, viewer)) return best
    return best == null || activity.requiredLevel < best ? activity.requiredLevel : best
  }, null)
  const nextStart = xpForLevel(level)
  const nextEnd = nextUnlock == null ? nextStart : xpForLevel(nextUnlock)
  const nextProgress =
    nextUnlock == null ? 0 : Math.min(1, Math.max(0, (xp - nextStart) / Math.max(1, nextEnd - nextStart)))

  return (
    <PageLayout
      side={
        <ActivityDetail
          activity={selected}
          checkLine={detail?.checkLine ?? ''}
          checkParts={detail?.checkParts ?? []}
          odds={detail?.odds ?? null}
          xpLabel={detail?.xpLabel ?? ''}
          xpBreakdown={detail?.xpBreakdown ?? ''}
          intervalLabel={detail ? formatInterval(intervalOf(selected!)) : ''}
          requiredLabel={detail?.requiredLabel ?? ''}
          lockedReason={selected ? lockLabel(selected, level, renown) : null}
          lockPanel={lockPanelFor(selected)}
          inputs={selected ? inputChips(selected, inventory, pageDiscount) : []}
          outputs={selected ? outputChips(selected) : []}
          running={running?.activityId === selected?.id}
          onStart={() => selected && start(selected)}
          onStop={stopActivity}
          secondary={selected ? secondaryAction(selected, inventory, tomes, bestiaries, readTome, readBestiary, activateNotes) : null}
          log={log}
        />
      }
    >
      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-3">
            <span className="text-gold">
              <SkillIcon id={skillId} size={36} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-page text-gold">{skill?.name ?? skillId}</h1>
                <LoadoutButton loadoutKey={skillId} />
              </div>
              {modifiers && <p className="text-meta text-muted">{modifiers}</p>}
            </div>
          </div>
          <div className="mt-3 flex justify-between text-meta text-muted">
            <span>Level {level}</span>
            <span>Tier {tier(level)}</span>
            <span>{progress.capped ? `${xp} XP` : `${xp} / ${progress.xpToNextLevel} XP`}</span>
          </div>
          <div className="mt-2">
            <ProgressBar progress={progress.progress} className="h-3" label="Skill XP progress" />
          </div>
          {nextUnlock != null && (
            <div className="mt-2">
              <p className="text-meta text-muted">Next unlock at level {nextUnlock}</p>
              <ProgressBar progress={nextProgress} className="mt-1 h-1.5" label="Progress toward next unlock" />
            </div>
          )}
        </Card>

        <div className="flex flex-wrap items-end justify-between gap-2">
          {tabs.length > 0 ? (
            <Tabs
              name={`skill-${skillId}`}
              label={`${skill?.name ?? 'Skill'} categories`}
              variant="underline"
              value={tab}
              onChange={chooseTab}
              tabs={tabs.map((id) => {
                const rows = activities.filter((activity) => activity.category === id)
                const unlocked = rows.filter((activity) => presentActivity(activity, viewer).visible).length
                const min = Math.min(...rows.map((activity) => activity.requiredLevel))
                const locked = rows.length > 0 && unlocked === 0
                return {
                  id,
                  label: id,
                  count: locked ? undefined : `${unlocked}/${rows.length}`,
                  running: runningActivity?.category === id,
                  locked,
                  lockLevel: locked ? min : undefined,
                }
              })}
            />
          ) : (
            <span />
          )}
          <Button variant="ghost" size="sm" onClick={() => setHideLocked(!hideLocked)}>
            {hideLocked ? 'Show locked' : 'Hide locked'}
          </Button>
        </div>

        <TabPanel name={`skill-${skillId}`} id={tab || 'all'} active>
          {tab === 'Tomes' ? (
            <TomeCatalog
              activities={inTab}
              tomes={tomes}
              inventory={inventory}
              pageDiscount={pageDiscount}
              level={level}
              renown={renown}
              selectedId={selected?.id ?? ''}
              onSelect={(activity) => setSelectedId(activity.id)}
              onCraft={start}
            />
          ) : tabs.length === 0 ? (
            <div className="space-y-4">
              {kindGroups(activities).map((group) => (
                <ActivityGroup
                  key={group.kind}
                  title={group.title}
                  activities={group.activities}
                  locked={(activity) => !presentActivity(activity, viewer).visible}
                  hideLocked={hideLocked}
                >
                  {renderCard}
                </ActivityGroup>
              ))}
            </div>
          ) : listed.length === 0 ? (
            <EmptyState text="Nothing in this tab" />
          ) : (
            <div className="space-y-4">
              {subIds.length > 0 && (
                <Tabs
                  name={`skill-${skillId}-${tab}`}
                  label={`${tab} tiers`}
                  variant="pill"
                  value={sub}
                  onChange={(id) => setPickedSub({ category: tab, id })}
                  tabs={subIds.map((id) => {
                    const rows = subMap.get(id) ?? []
                    const min = Math.min(...rows.map((activity) => activity.requiredLevel))
                    const locked = rows.every((activity) => !presentActivity(activity, viewer).visible)
                    return {
                      id,
                      label: id,
                      locked,
                      lockLevel: locked ? min : undefined,
                      running: runningActivity?.category === tab && parseGroup(runningActivity.group).subtab === id,
                    }
                  })}
                />
              )}
              {renderGrouped(listed)}
            </div>
          )}
        </TabPanel>
      </div>
    </PageLayout>
  )
}

function kindGroups(activities: ActivityDef[]) {
  return (['train', 'gather', 'craft'] as const)
    .map((kind) => ({
      kind,
      title: KIND_LABEL[kind],
      activities: activities.filter((activity) => activity.kind === kind).sort(compareActivities),
    }))
    .filter((group) => group.activities.length > 0)
}

function modifierLine(input: {
  className: string | null
  classFrac: number
  tomePct: number
  tomeSpeed: number
  checkBonus: number
  ability?: string
  rank?: number
  toolName?: string
  renown: number | null
}): string {
  const parts: string[] = []
  if (input.className) parts.push(`${input.className} ×${(1 + input.classFrac).toFixed(2)} XP`)
  if (input.tomePct > 0) {
    const history = [`Scribing +${Math.round(input.tomePct * 100)}%`]
    if (input.tomeSpeed !== 0) history.push('−5% interval')
    if (input.checkBonus > 0) history.push('+1 check')
    parts.push(history.join(', '))
  }
  if (input.ability && input.rank != null) parts.push(`${input.ability} Rank ${input.rank}`)
  if (input.toolName) parts.push(input.toolName)
  if (input.renown != null) parts.push(`Renown ${input.renown}`)
  return parts.join(' · ')
}

function mainOutput(activity: ActivityDef): { name: string; note?: string } | null {
  const entry = activity.outputs[0]
  if (entry) return { name: itemName(entry.itemId), note: lootNote(entry) }
  if (activity.gold) return { name: goldNote(activity.gold) }
  if (activity.favor) return { name: goldNote(activity.favor).replace(/ gp/g, ' Favor') }
  return null
}

function outputChips(activity: ActivityDef): { name: string; note?: string }[] {
  const chips = [
    ...activity.outputs.map((entry) => ({ name: itemName(entry.itemId), note: lootNote(entry) })),
    ...(activity.rareTable ?? []).map((entry) => ({
      name: itemName(entry.itemId),
      note: [lootNote(entry), 'rare'].filter(Boolean).join(' · '),
    })),
    ...(activity.byproducts ?? []).map((entry) => ({
      name: itemName(entry.itemId),
      note: [lootNote(entry), 'fumble'].filter(Boolean).join(' · '),
    })),
  ]
  if (activity.gold) chips.push({ name: goldNote(activity.gold), note: undefined })
  if (activity.favor) chips.push({ name: goldNote(activity.favor).replace(/ gp/g, ' Favor'), note: undefined })
  return chips
}

function secondaryAction(
  activity: ActivityDef,
  inventory: Inventory,
  tomes: Partial<Record<TradeSkillId, number>>,
  bestiaries: Record<string, number>,
  readTome: (itemId: ItemId) => void,
  readBestiary: (itemId: ItemId) => void,
  activateNotes: (itemId: ItemId) => void,
): { label: string; ready: boolean; reason: string | null; onClick: () => void } | null {
  const outputId = activity.outputs[0]?.itemId
  if (!outputId) return null
  const owned = (inventory[outputId] ?? 0) > 0
  const tome = parseTomeItemId(outputId)
  if (tome) {
    const ready = owned && tome.volume === (tomes[tome.skillId] ?? 0) + 1
    return {
      label: 'Read',
      ready,
      reason: ready ? null : 'Read tomes in order, and only from one you hold',
      onClick: () => readTome(outputId),
    }
  }
  const bestiary = parseBestiaryItemId(outputId)
  if (bestiary) {
    const ready = owned && bestiary.volume === (bestiaries[bestiary.type] ?? 0) + 1
    return {
      label: 'Read',
      ready,
      reason: ready ? null : 'Read bestiaries in order, and only from one you hold',
      onClick: () => readBestiary(outputId),
    }
  }
  if (parseNoteItemId(outputId)) {
    return {
      label: 'Use',
      ready: owned,
      reason: owned ? null : 'Need the notes in your pack',
      onClick: () => activateNotes(outputId),
    }
  }
  return null
}
