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
import { useGameStore } from '../../store/gameStore'

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

  useEffect(() => {
    refreshNoticeBoard()
  }, [refreshNoticeBoard])

  const refreshIn = Math.max(0, NOTICE_BOARD_MS - (Date.now() - noticeBoard.refreshedAt))

  return (
    <div className="space-y-8">
      <p className="text-sm text-parchment/70">
        The mile-camp holds while the road forgets itself. Accept work here, then finish it out in the
        world.
      </p>
      {questMessage && (
        <p className="rounded-lg border border-brown/40 bg-panel p-3 text-sm text-gold">{questMessage}</p>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gold">People of the Camp</h2>
        {NPCS.map((npc) => {
          const related = QUESTS.filter(
            (q) => q.giverNpcId === npc.id || q.turnInNpcId === npc.id,
          )
          return (
            <div key={npc.id} className="rounded-lg border border-brown/40 bg-panel p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-bold text-gold">
                  {npc.name} · {npc.title}
                </h3>
              </div>
              <p className="mt-1 text-sm text-parchment/70">{npc.description}</p>
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
            </div>
          )
        })}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gold">Notice Board</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-parchment/70">Refresh in {formatMs(refreshIn)}</span>
            <button
              type="button"
              disabled={favor < NOTICE_BOARD_REROLL_FAVOR}
              onClick={() => rerollNotice()}
              className="rounded bg-crimson px-3 py-1 text-parchment disabled:opacity-40"
            >
              Reroll ({NOTICE_BOARD_REROLL_FAVOR} Favor)
            </button>
          </div>
        </div>
        {noticeBoard.offers.length === 0 && (
          <p className="text-sm text-parchment/70">No postings. Wait for a refresh.</p>
        )}
        {noticeBoard.offers.map((offer) => (
          <div
            key={offer.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brown/40 bg-panel p-3"
          >
            <div>
              <div className="font-bold text-parchment">{noticeOfferLabel(offer)}</div>
              <div className="text-xs text-parchment/70">
                {offer.gold} gp · {offer.favor} Favor
              </div>
            </div>
            <button
              type="button"
              disabled={!noticeOfferReady(offer, inventory)}
              onClick={() => turnInNotice(offer.id)}
              className="rounded bg-crimson px-3 py-1 text-sm text-parchment disabled:opacity-40"
            >
              Turn in
            </button>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gold">Quest Log</h2>
        {QUESTS.filter((q) => questProgress[q.id]).map((quest) => {
          const run = getRun(questProgress, quest.id)!
          return (
            <div key={quest.id} className="rounded-lg border border-brown/40 bg-panel p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-bold text-gold">{quest.title}</h3>
                <span className="text-xs text-parchment/70">
                  {run.done ? 'Complete' : `Stage ${run.stage + 1}`}
                </span>
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
            </div>
          )
        })}
        {!QUESTS.some((q) => questProgress[q.id]) && (
          <p className="text-sm text-parchment/70">No quests accepted yet.</p>
        )}
      </section>

      {checkQuestId && (
        <CheckModal questId={checkQuestId} onClose={() => setCheckQuestId(null)} />
      )}
    </div>
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

  return (
    <div className="rounded border border-brown/30 bg-ink/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-bold text-parchment">{quest.title}</div>
          <p className="text-xs text-parchment/70">{quest.description}</p>
          {active && run && stage && 'objectives' in stage && (
            <ul className="mt-2 space-y-0.5 text-sm text-sage">
              {stage.objectives.map((obj, i) => {
                const prog = objectiveProgress(
                  obj,
                  run.counts[i] ?? 0,
                  inventory,
                  skills,
                  classXp,
                )
                return (
                  <li key={i}>
                    {objectiveLabel(obj)} {Math.min(prog.have, prog.need)}/{prog.need}
                  </li>
                )
              })}
            </ul>
          )}
          {active && isCheck && <p className="mt-2 text-sm text-gold">A check awaits.</p>}
          {done && <p className="mt-2 text-sm text-sage">Complete.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {available && (
            <button
              type="button"
              onClick={props.onAccept}
              className="rounded bg-crimson px-3 py-1 text-sm text-parchment"
            >
              Accept
            </button>
          )}
          {active && ready && (
            <button
              type="button"
              onClick={props.onTurnIn}
              className="rounded bg-crimson px-3 py-1 text-sm text-parchment"
            >
              Turn in
            </button>
          )}
          {active && isCheck && (
            <button
              type="button"
              onClick={props.onOpenCheck}
              className="rounded bg-crimson px-3 py-1 text-sm text-parchment"
            >
              Check
            </button>
          )}
          {active && (
            <button
              type="button"
              onClick={props.onPin}
              className="rounded border border-brown/50 px-3 py-1 text-sm text-parchment"
            >
              {props.pinned ? 'Pinned' : 'Pin'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
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
