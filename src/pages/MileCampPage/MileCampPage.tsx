import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getItem } from '../../data/items'
import { NPCS, QUESTS, getQuest, type CheckApproach, type QuestDef } from '../../data/quests'
import { SKILLS } from '../../data/skills'
import {
  approachBonus,
  canTurnIn,
  currentStage,
  fixedDcSuccessChance,
  getRun,
  isQuestActive,
  isQuestComplete,
  objectiveLabel,
  objectiveProgress,
  prerequisitesMet,
  visibleApproaches,
} from '../../engine/quest'
import {
  NOTICE_BOARD_MS,
  NOTICE_BOARD_REROLL_FAVOR,
} from '../../engine/config'
import { noticeOfferLabel, noticeOfferReady } from '../../engine/noticeBoard'
import { levelForXp } from '../../engine/xp'
import { useGameStore } from '../../store/gameStore'
import { usePageTab } from '../../store/uiPrefs'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ItemChip } from '../../components/ui/ItemChip'
import { PageLayout } from '../../components/ui/PageLayout'
import { ProgressBar } from '../../components/ProgressBar'
import { TabPanel, Tabs } from '../../components/ui/Tabs'

export function MileCampPage() {
  const inventory = useGameStore((s) => s.inventory)
  const favor = useGameStore((s) => s.favor)
  const questProgress = useGameStore((s) => s.questProgress)
  const noticeBoard = useGameStore((s) => s.noticeBoard)
  const questMessage = useGameStore((s) => s.questMessage)
  const pinnedQuestId = useGameStore((s) => s.pinnedQuestId)
  const acceptQuest = useGameStore((s) => s.acceptQuest)
  const turnInQuest = useGameStore((s) => s.turnInQuest)
  const pinQuest = useGameStore((s) => s.pinQuest)
  const turnInNotice = useGameStore((s) => s.turnInNotice)
  const rerollNotice = useGameStore((s) => s.rerollNotice)
  const refreshNoticeBoard = useGameStore((s) => s.refreshNoticeBoard)
  const [checkQuestId, setCheckQuestId] = useState<string | null>(null)
  const [tab, setTab] = usePageTab('mile-camp', 'people', ['people', 'board', 'log'] as const)

  useEffect(() => {
    refreshNoticeBoard()
  }, [refreshNoticeBoard])

  const refreshIn = Math.max(0, NOTICE_BOARD_MS - (Date.now() - noticeBoard.refreshedAt))

  return (
    <PageLayout>
    <div className="space-y-8">
      <p className="text-sm text-parchment/70">
        The mile-camp holds while the road forgets itself. Accept work here, then finish it out in the
        world.
      </p>
      {questMessage && (
        <p className="rounded-lg border border-brown/40 bg-panel p-3 text-sm text-gold">{questMessage}</p>
      )}

      <Tabs
        name="mile-camp"
        label="Mile-Camp"
        value={tab}
        onChange={(id) => setTab(id as 'people' | 'board' | 'log')}
        tabs={[
          { id: 'people', label: 'People' },
          { id: 'board', label: 'Notice Board' },
          { id: 'log', label: 'Quest Log' },
        ]}
      />

      <TabPanel name="mile-camp" id={tab} active>
      {tab === 'people' && (
      <section className="space-y-4">
        {NPCS.map((npc) => {
          const related = QUESTS.filter(
            (q) => q.giverNpcId === npc.id || q.turnInNpcId === npc.id,
          )
          return (
            <Card key={npc.id}>
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-card text-gold" aria-hidden>
                  {npc.name.slice(0, 1)}
                </span>
                <div>
                  <h3 className="text-card text-gold">
                    {npc.name} <span className="text-meta font-normal text-muted">{npc.title}</span>
                  </h3>
                  <p className="text-body text-muted">{npc.description}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {related.length === 0 && (
                  <p className="text-sm text-parchment/60">No work right now.</p>
                )}
                {related.map((quest) => (
                  <QuestRow
                    key={quest.id}
                    quest={quest}
                    onOpenCheck={() => setCheckQuestId(quest.id)}
                    onAccept={() => acceptQuest(quest.id)}
                    onTurnIn={() => turnInQuest(quest.id)}
                    onPin={() => pinQuest(quest.id)}
                    pinned={pinnedQuestId === quest.id}
                  />
                ))}
              </div>
            </Card>
          )
        })}
      </section>
      )}

      {tab === 'board' && (
      <section className="space-y-3">
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            disabled={favor < NOTICE_BOARD_REROLL_FAVOR}
            disabledReason={favor < NOTICE_BOARD_REROLL_FAVOR ? `Need ${NOTICE_BOARD_REROLL_FAVOR} Favor` : undefined}
            onClick={() => rerollNotice()}
          >
            Reroll ({NOTICE_BOARD_REROLL_FAVOR} Favor)
          </Button>
        </div>
        {noticeBoard.offers.length === 0 && <EmptyState text="No postings. Wait for a refresh." />}
        {noticeBoard.offers.map((offer) => (
          <Card key={offer.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-parchment">{noticeOfferLabel(offer)}</div>
              <div className="text-meta text-muted">
                {offer.gold} gp · {offer.favor} Favor · Refresh in {formatMs(refreshIn)}
              </div>
            </div>
            <Button
              size="sm"
              disabled={!noticeOfferReady(offer, inventory)}
              disabledReason={noticeOfferReady(offer, inventory) ? undefined : 'Requirements not met'}
              onClick={() => turnInNotice(offer.id)}
            >
              Turn in
            </Button>
          </Card>
        ))}
      </section>
      )}

      {tab === 'log' && (
      <section className="space-y-3">
        {QUESTS.filter((q) => questProgress[q.id]).map((quest) => {
          const run = getRun(questProgress, quest.id)!
          return (
            <Card key={quest.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-gold">{quest.title}</h3>
                <Badge tone={run.done ? 'neutral' : 'gold'}>{run.done ? 'Completed' : 'In progress'}</Badge>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-parchment/80">
                {run.history.map((entry, i) => (
                  <li key={`${quest.id}-h-${i}`}>
                    {entry.success === true && <span className="text-sage">✓ </span>}
                    {entry.success === false && <span className="text-crimson">✗ </span>}
                    {entry.text}
                  </li>
                ))}
                {!run.history.length && !run.done && (
                  <li className="text-parchment/60">In progress…</li>
                )}
              </ul>
            </Card>
          )
        })}
        {!QUESTS.some((q) => questProgress[q.id]) && <EmptyState text="No quests accepted yet." />}
      </section>
      )}
      </TabPanel>

      {checkQuestId && (
        <CheckModal questId={checkQuestId} onClose={() => setCheckQuestId(null)} />
      )}
    </div>
    </PageLayout>
  )
}

function QuestRow(props: {
  quest: QuestDef
  onAccept: () => void
  onTurnIn: () => void
  onOpenCheck: () => void
  onPin: () => void
  pinned: boolean
}) {
  const { quest } = props
  const skills = useGameStore((s) => s.skills)
  const inventory = useGameStore((s) => s.inventory)
  const classXp = useGameStore((s) => s.classXp)
  const questProgress = useGameStore((s) => s.questProgress)
  const run = getRun(questProgress, quest.id)
  const available =
    !run &&
    prerequisitesMet(quest, { questProgress, skills, classXp, inventory })
  const active = isQuestActive(questProgress, quest.id)
  const done = isQuestComplete(questProgress, quest.id)
  const stage = run ? currentStage(quest, run) : null
  const ready =
    active && run
      ? canTurnIn(quest.id, questProgress, inventory, skills, classXp)
      : false
  const isCheck = Boolean(stage && 'check' in stage)

  const locked = !available && !active && !done
  const reason = locked
    ? lockReason(quest, questProgress, skills, classXp, inventory)
    : null
  const status = done
    ? { label: 'Completed', tone: 'neutral' as const }
    : ready
      ? { label: 'Ready to turn in', tone: 'sage' as const }
      : active
        ? { label: 'In progress', tone: 'gold' as const }
        : available
          ? { label: 'Available', tone: 'sage' as const }
          : { label: 'Locked', tone: 'crimson' as const }

  return (
    <div className="rounded-lg border border-line bg-ink p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-parchment">{quest.title}</span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="text-meta text-muted">{quest.description}</p>
          {reason && <p className="mt-1 text-meta text-lack">{reason}</p>}
          {active && run && stage && 'objectives' in stage && (
            <ul className="mt-2 space-y-2">
              {stage.objectives.map((obj, i) => {
                const prog = objectiveProgress(obj, run.counts[i] ?? 0, inventory, skills, classXp)
                const itemId = obj.type === 'have' || obj.type === 'deliver' ? obj.itemId : null
                const progress = prog.need > 0 ? Math.min(100, (prog.have / prog.need) * 100) : 0
                return (
                  <li key={i}>
                    {itemId ? (
                      <ItemChip name={getItem(itemId)?.name ?? itemId} owned={prog.have} needed={prog.need} />
                    ) : (
                      <span className="text-body text-parchment">
                        {objectiveLabel(obj)} {Math.min(prog.have, prog.need)}/{prog.need}
                      </span>
                    )}
                    <ProgressBar progress={progress} label={objectiveLabel(obj)} className="mt-1 h-1.5" />
                  </li>
                )
              })}
            </ul>
          )}
          {active && isCheck && <p className="mt-2 text-body text-gold">A check awaits.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {available && (
            <Button size="sm" onClick={props.onAccept}>
              Accept
            </Button>
          )}
          {active && ready && (
            <Button size="sm" onClick={props.onTurnIn}>
              Turn in
            </Button>
          )}
          {active && isCheck && (
            <Button size="sm" onClick={props.onOpenCheck}>
              Check
            </Button>
          )}
          {active && (
            <Button size="sm" variant="secondary" onClick={props.onPin}>
              {props.pinned ? 'Pinned' : 'Pin'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function lockReason(
  quest: QuestDef,
  questProgress: Parameters<typeof prerequisitesMet>[1]['questProgress'],
  skills: Parameters<typeof prerequisitesMet>[1]['skills'],
  classXp: number,
  inventory: Parameters<typeof prerequisitesMet>[1]['inventory'],
): string {
  const missing: string[] = []
  for (const id of quest.prerequisites.quests ?? []) {
    if (!isQuestComplete(questProgress, id)) missing.push(getQuest(id)?.title ?? id)
  }
  const levelReq = quest.prerequisites.level
  if (levelReq) {
    const level =
      levelReq.skillId === 'class'
        ? levelForXp(classXp)
        : levelForXp(skills[levelReq.skillId]?.xp ?? 0)
    if (level < levelReq.level) {
      const name =
        levelReq.skillId === 'class'
          ? 'Class'
          : SKILLS.find((skill) => skill.id === levelReq.skillId)?.name ?? levelReq.skillId
      missing.push(`${name} ${levelReq.level}`)
    }
  }
  for (const stack of quest.prerequisites.items ?? []) {
    if ((inventory[stack.itemId] ?? 0) < stack.quantity) {
      missing.push(`${getItem(stack.itemId)?.name ?? stack.itemId} ×${stack.quantity}`)
    }
  }
  return missing.length ? `Requires: ${missing.join(', ')}` : 'Requirements not met'
}

function CheckModal(props: { questId: string; onClose: () => void }) {
  const quest = getQuest(props.questId)
  const skills = useGameStore((s) => s.skills)
  const inventory = useGameStore((s) => s.inventory)
  const gold = useGameStore((s) => s.gold)
  const tomes = useGameStore((s) => s.tomes)
  const questProgress = useGameStore((s) => s.questProgress)
  const rollQuestCheck = useGameStore((s) => s.rollQuestCheck)
  const resolveQuestCheck = useGameStore((s) => s.resolveQuestCheck)
  const questMessage = useGameStore((s) => s.questMessage)
  const run = quest ? getRun(questProgress, quest.id) : undefined
  const stage = quest && run ? currentStage(quest, run) : null
  const [prepOn, setPrepOn] = useState<Record<string, boolean>>({})
  const [rolled, setRolled] = useState(false)

  const approaches = useMemo(() => {
    if (!stage || !('check' in stage)) return [] as CheckApproach[]
    return visibleApproaches(stage, skills)
  }, [stage, skills])

  if (!quest || !run || !stage || !('check' in stage)) {
    return (
      <Modal onClose={props.onClose}>
        <p className="text-sm">No check available.</p>
      </Modal>
    )
  }

  const pending = Boolean(run.pendingCheck)
  const hasInspiration = (inventory.inspiration ?? 0) > 0

  return (
    <Modal onClose={props.onClose}>
      <h3 className="text-lg font-bold text-gold">{quest.title}</h3>
      <p className="mt-2 text-sm text-parchment/80">{stage.check.prompt}</p>

      {!rolled && !pending && (
        <div className="mt-4 space-y-3">
          {approaches.map((approach) => {
            const usePrep =
              (prepOn[approach.id] ?? true) &&
              Boolean(approach.prep) &&
              (inventory[approach.prep!.itemId] ?? 0) > 0
            const { bonus, mode, autoPass } = approachBonus(approach, skills, tomes, usePrep)
            const chance =
              approach.goldCost != null
                ? gold >= approach.goldCost
                  ? 1
                  : 0
                : autoPass
                  ? 1
                  : fixedDcSuccessChance(bonus, approach.dc, mode)
            const skillName = SKILLS.find((s) => s.id === approach.skillId)?.name ?? approach.skillId
            return (
              <div key={approach.id} className="rounded border border-brown/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-parchment">{approach.label}</div>
                    <div className="text-xs text-parchment/70">
                      {skillName}
                      {approach.goldCost != null
                        ? ` · ${approach.goldCost} gp`
                        : ` · DC ${approach.dc} · ${Math.round(chance * 100)}%`}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={approach.goldCost != null && gold < approach.goldCost}
                    onClick={() => {
                      rollQuestCheck(props.questId, approach.id, prepOn[approach.id] ?? true)
                      setRolled(true)
                    }}
                    className="rounded bg-crimson px-3 py-1 text-sm text-parchment disabled:opacity-40"
                  >
                    Attempt
                  </button>
                </div>
                {approach.prep && (inventory[approach.prep.itemId] ?? 0) > 0 && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-parchment/80">
                    <input
                      type="checkbox"
                      checked={prepOn[approach.id] ?? true}
                      onChange={(e) =>
                        setPrepOn((prev) => ({ ...prev, [approach.id]: e.target.checked }))
                      }
                    />
                    Use {getItem(approach.prep.itemId)?.name ?? approach.prep.itemId} (
                    {approach.prep.effect})
                  </label>
                )}
              </div>
            )
          })}
        </div>
      )}

      {(rolled || pending) && (
        <div className="mt-4 space-y-3">
          {questMessage && <p className="text-sm text-gold">{questMessage}</p>}
          {pending && (
            <div className="flex flex-wrap gap-2">
              {hasInspiration && (
                <button
                  type="button"
                  onClick={() => {
                    resolveQuestCheck(props.questId, true)
                    setRolled(true)
                  }}
                  className="rounded bg-crimson px-3 py-1 text-sm text-parchment"
                >
                  Spend Inspiration
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  resolveQuestCheck(props.questId, false)
                  setRolled(true)
                }}
                className="rounded border border-brown/50 px-3 py-1 text-sm text-parchment"
              >
                Accept failure
              </button>
            </div>
          )}
          {!pending && (
            <button
              type="button"
              onClick={props.onClose}
              className="rounded bg-crimson px-3 py-1 text-sm text-parchment"
            >
              Close
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}

function Modal(props: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg border border-brown/50 bg-panel p-5 shadow-xl">
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={props.onClose} className="text-sm text-parchment/70 hover:text-gold">
            Close
          </button>
        </div>
        {props.children}
      </div>
    </div>
  )
}

function formatMs(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
