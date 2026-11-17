import { QUESTS } from '../../data/quests'
import { getItem } from '../../data/items'
import { getDungeon } from '../../data/dungeons'
import { getMonster } from '../../data/monsters'
import {
  currentStep,
  getProgress,
  isQuestUnlocked,
} from '../../engine/quest'
import { useGameStore } from '../../store/gameStore'

export function QuestPage() {
  const activeClassId = useGameStore((s) => s.activeClassId)
  const classes = useGameStore((s) => s.classes)
  const inventory = useGameStore((s) => s.inventory)
  const questProgress = useGameStore((s) => s.questProgress)
  const questMessage = useGameStore((s) => s.questMessage)
  const chooseQuestChoice = useGameStore((s) => s.chooseQuestChoice)
  const tryQuestCheck = useGameStore((s) => s.tryQuestCheck)
  const deliverQuest = useGameStore((s) => s.deliverQuest)
  const startQuestCombat = useGameStore((s) => s.startQuestCombat)
  const startQuestDungeon = useGameStore((s) => s.startQuestDungeon)
  const isInDungeonOrQuest = useGameStore((s) => s.isInDungeonOrQuest)
  const activeAction = useGameStore((s) => s.activeAction)

  return (
    <div className="space-y-6">
      <p className="text-sm text-parchment/70">
        Quests use your real skill levels for dialogue and checks. Story copy is temporary.
      </p>
      {questMessage && (
        <p className="rounded-lg border border-brown/40 bg-panel p-3 text-sm text-gold">{questMessage}</p>
      )}
      {QUESTS.map((quest) => {
        const unlocked = isQuestUnlocked(quest, {
          activeClassId,
          classXp: classes,
          inventory,
        })
        const progress = getProgress(questProgress, quest.id)
        const step = currentStep(quest, questProgress)
        return (
          <div key={quest.id} className="space-y-3 rounded-lg border border-brown/40 bg-panel p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-bold text-gold">{quest.title}</h2>
              <span className="text-xs text-parchment/70">Chapter {quest.chapter}</span>
            </div>
            {!unlocked && (
              <p className="text-sm text-parchment/70">
                Locked
                {quest.unlock.type === 'classLevel'
                  ? ` — needs class level ${quest.unlock.level}.`
                  : ` — needs ${getItem(quest.unlock.itemId)?.name ?? quest.unlock.itemId}.`}
              </p>
            )}
            {unlocked && progress.done && <p className="text-sm text-sage">Complete.</p>}
            {unlocked && !progress.done && step && (
              <StepView
                questId={quest.id}
                step={step}
                busy={Boolean(activeAction) || isInDungeonOrQuest}
                onChoice={chooseQuestChoice}
                onCheck={tryQuestCheck}
                onDeliver={deliverQuest}
                onCombat={startQuestCombat}
                onDungeon={startQuestDungeon}
                inventory={inventory}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function StepView(props: {
  questId: string
  step: NonNullable<ReturnType<typeof currentStep>>
  busy: boolean
  onChoice: (questId: string, choiceId: string) => void
  onCheck: (questId: string) => void
  onDeliver: (questId: string) => void
  onCombat: (questId: string) => void
  onDungeon: (questId: string) => void
  inventory: Record<string, number | undefined>
}) {
  const { questId, step, busy } = props
  if (step.type === 'dialogue') {
    return (
      <div className="space-y-3">
        <p className="text-sm">{step.text}</p>
        <div className="flex flex-wrap gap-2">
          {step.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={busy}
              onClick={() => props.onChoice(questId, choice.id)}
              className="rounded-lg bg-crimson px-3 py-1.5 text-sm text-parchment hover:bg-brown disabled:opacity-50"
            >
              {choice.text}
              {choice.check ? ` (${choice.check.skillId})` : ''}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (step.type === 'skillCheck') {
    return (
      <div className="space-y-3">
        <p className="text-sm">{step.label}</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => props.onCheck(questId)}
          className="rounded-lg bg-crimson px-3 py-1.5 text-sm text-parchment hover:bg-brown disabled:opacity-50"
        >
          Attempt ({step.skillId})
        </button>
      </div>
    )
  }
  if (step.type === 'combat') {
    const monster = getMonster(step.monsterId)
    return (
      <div className="space-y-3">
        <p className="text-sm">Fight {monster?.name ?? step.monsterId} once.</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => props.onCombat(questId)}
          className="rounded-lg bg-crimson px-3 py-1.5 text-sm text-parchment hover:bg-brown disabled:opacity-50"
        >
          Start fight
        </button>
      </div>
    )
  }
  if (step.type === 'deliver') {
    const have = props.inventory[step.itemId] ?? 0
    return (
      <div className="space-y-3">
        <p className="text-sm">
          {step.label} ({have}/{step.quantity} {getItem(step.itemId)?.name ?? step.itemId})
        </p>
        <button
          type="button"
          disabled={busy || have < step.quantity}
          onClick={() => props.onDeliver(questId)}
          className="rounded-lg bg-crimson px-3 py-1.5 text-sm text-parchment hover:bg-brown disabled:opacity-50"
        >
          Deliver
        </button>
      </div>
    )
  }
  if (step.type === 'dungeon') {
    const dungeon = getDungeon(step.dungeonId)
    return (
      <div className="space-y-3">
        <p className="text-sm">Clear {dungeon?.name ?? step.dungeonId} once.</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => props.onDungeon(questId)}
          className="rounded-lg bg-crimson px-3 py-1.5 text-sm text-parchment hover:bg-brown disabled:opacity-50"
        >
          Enter dungeon
        </button>
      </div>
    )
  }
  return null
}
