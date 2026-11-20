import { BookOpen, Coins, Info, Menu, Package, Save, ScrollText, ShoppingCart, Swords, Tent, User } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getActivity } from '../data/activities'
import { getClass } from '../data/classes'
import { getMonster, type BiomeId } from '../data/monsters'
import { getQuest } from '../data/quests'
import { SKILLS, isSkillId } from '../data/skills'
import { actionIntervalMs } from '../engine/advance'
import { deriveAbilities } from '../engine/abilities'
import { RESPAWN_MS } from '../engine/config'
import { sourcesOf } from '../engine/itemIndex'
import {
  currentStage,
  getRun,
  objectiveLabel,
  objectiveProgress,
} from '../engine/quest'
import { levelForXp } from '../engine/xp'
import type { PageFocus } from '../pages/pageFocus'
import { useGameStore } from '../store/gameStore'
import { CreditsModal } from './CreditsModal'
import { Link } from './Link'
import { ProgressBar } from './ProgressBar'

interface HeaderProps {
  title: string
  currentPage: string
  setCurrentPage: (page: string) => void
  onNavigate: (page: string, focus?: PageFocus) => void
  onMainMenu: () => void
}

export function Header({ title, currentPage, setCurrentPage, onNavigate, onMainMenu }: HeaderProps) {
  const [charTip, setCharTip] = useState<{ top: number; left: number } | null>(null)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const charRef = useRef<HTMLButtonElement>(null)
  const characterName = useGameStore((state) => state.characterName)
  const classId = useGameStore((state) => state.classId)
  const classXp = useGameStore((state) => state.classXp)
  const secondaryClassId = useGameStore((state) => state.secondaryClassId)
  const secondaryClassXp = useGameStore((state) => state.secondaryClassXp)
  const skills = useGameStore((state) => state.skills)
  const equipment = useGameStore((state) => state.equipment)
  const inventory = useGameStore((state) => state.inventory)
  const gold = useGameStore((state) => state.gold)
  const favor = useGameStore((state) => state.favor)
  const activeAction = useGameStore((state) => state.activeAction)
  const activeBuffs = useGameStore((state) => state.activeBuffs)
  const combat = useGameStore((state) => state.combat)
  const pinnedQuestId = useGameStore((state) => state.pinnedQuestId)
  const questProgress = useGameStore((state) => state.questProgress)
  const saveGame = useGameStore((state) => state.saveGame)
  const pinnedQuest = pinnedQuestId ? getQuest(pinnedQuestId) : undefined
  const pinnedRun = pinnedQuestId ? getRun(questProgress, pinnedQuestId) : undefined
  const pinnedStage =
    pinnedQuest && pinnedRun && !pinnedRun.done ? currentStage(pinnedQuest, pinnedRun) : null
  const actionInterval =
    activeAction?.kind === 'combat' && combat?.phase === 'rest'
      ? RESPAWN_MS
      : activeAction
        ? actionIntervalMs(activeAction, skills, equipment, combat)
        : 0
  const actionProgress =
    activeAction && actionInterval > 0
      ? Math.min(
          100,
          ((activeAction.kind === 'combat' && combat?.phase === 'rest'
            ? combat.restProgressMs
            : activeAction.progressMs) /
            actionInterval) *
            100,
        )
      : 0
  const actionLabel = activeAction
    ? activeAction.kind === 'skill'
      ? `${SKILLS.find((skill) => skill.id === activeAction.skillId)?.name ?? 'Skill'} · ${activeAction.label}`
      : activeAction.label
    : 'Idle'
  const tipHost = typeof document !== 'undefined' ? document.getElementById('tooltip-root') : null
  const classLevel = classId ? levelForXp(classXp) : null
  const secondaryLabel =
    secondaryClassId != null
      ? ` / ${getClass(secondaryClassId).name} ${levelForXp(secondaryClassXp)}`
      : ''
  const classLabel = classId ? `${getClass(classId).name} ${classLevel}${secondaryLabel}` : 'No class'
  const summary = `${characterName} · ${classLabel}`
  const abilityTip = deriveAbilities(skills)
    .map((ability) => `${ability.abbr} ${ability.score} (R${ability.rank})`)
    .join(' · ')

  const showCharTip = () => {
    const rect = charRef.current?.getBoundingClientRect()
    if (!rect) return
    setCharTip({ top: rect.bottom + 8, left: rect.left + rect.width / 2 })
  }

  return (
    <div className="flex items-center justify-between border-b border-brown/40 bg-panel px-4 py-3 text-parchment">
      <CreditsModal open={creditsOpen} onClose={() => setCreditsOpen(false)} />
      <h1 className="text-2xl font-bold text-gold">{title}</h1>

      <div className="mx-4 flex min-w-0 flex-1 items-center gap-3" aria-label="Active action">
        <div className="flex min-w-0 items-center gap-2">
          {activeAction ? (
            <button
              type="button"
              onClick={() =>
                setCurrentPage(activeAction.kind === 'skill' ? activeAction.skillId : 'monsterHunting')
              }
              className="truncate text-sm hover:text-gold hover:underline"
            >
              {actionLabel}
            </button>
          ) : (
            <span className="truncate text-sm">{actionLabel}</span>
          )}
          {activeAction && (
            <div className="w-24 shrink-0">
              <ProgressBar progress={actionProgress} className="h-2" label="Active action progress" />
            </div>
          )}
        </div>
        {pinnedQuest && pinnedRun && pinnedStage && 'objectives' in pinnedStage && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 border-l border-brown/40 pl-3" aria-label="Quest tracker">
            <span className="truncate text-xs text-gold">{pinnedQuest.title}</span>
            {pinnedStage.objectives.map((obj, i) => {
              const prog = objectiveProgress(
                obj,
                pinnedRun.counts[i] ?? 0,
                inventory,
                skills,
                classXp,
              )
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => jumpObjective(obj, onNavigate)}
                  className="truncate text-xs text-sage hover:underline"
                >
                  {objectiveLabel(obj)} {Math.min(prog.have, prog.need)}/{prog.need}
                </button>
              )
            })}
          </div>
        )}
        {pinnedQuest && pinnedStage && 'check' in pinnedStage && (
          <button
            type="button"
            onClick={() => onNavigate('mile-camp', { kind: 'quest', questId: pinnedQuest.id })}
            className="border-l border-brown/40 pl-3 text-xs text-gold hover:underline"
          >
            {pinnedQuest.title}: check ready
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {activeBuffs.length > 0 && (
          <div className="flex items-center gap-1" aria-label="Active buffs">
            {activeBuffs.map((buff) => (
              <span
                key={buff.id}
                title={`${buffLabel(buff.id)} · ${formatBuffTime(buff.remainingMs)} left`}
                className="inline-flex items-center gap-0.5 rounded bg-ink/60 px-1.5 py-0.5 text-[10px] text-sage"
              >
                <BookOpen size={12} />
                {formatBuffTime(buff.remainingMs)}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 text-gold" aria-label="Gold">
          <Coins size={18} />
          <span>{gold.toLocaleString()} gp</span>
        </div>
        <div className="flex items-center gap-1 text-sage" aria-label="Guild Favor">
          <ScrollText size={18} />
          <span>{favor.toLocaleString()} Favor</span>
        </div>

        <Link
          icon={<ShoppingCart size={20} />}
          label="Shop"
          tipSide="below"
          onClick={() => setCurrentPage('shop')}
          active={currentPage === 'shop'}
        />
        <Link
          icon={<Package size={20} />}
          label="Inventory"
          tipSide="below"
          onClick={() => setCurrentPage('inventory')}
          active={currentPage === 'inventory'}
        />
        <Link
          icon={<Swords size={20} />}
          label="Combat"
          tipSide="below"
          onClick={() => setCurrentPage('monsterHunting')}
          active={currentPage === 'monsterHunting'}
        />
        <Link
          icon={<Tent size={20} />}
          label="Mile-Camp"
          tipSide="below"
          onClick={() => setCurrentPage('mile-camp')}
          active={currentPage === 'mile-camp'}
        />

        <div className="relative">
          <button
            ref={charRef}
            type="button"
            onClick={() => setCurrentPage('character')}
            onMouseEnter={showCharTip}
            onFocus={showCharTip}
            onMouseLeave={() => setCharTip(null)}
            onBlur={() => setCharTip(null)}
            aria-label="Character"
            aria-current={currentPage === 'character' ? 'page' : undefined}
            className={`flex max-w-[14rem] items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
              currentPage === 'character' ? 'bg-crimson text-parchment' : 'text-parchment hover:bg-brown'
            }`}
          >
            <User size={20} className="shrink-0" />
            <span className="truncate">{summary}</span>
          </button>
          {charTip &&
            tipHost &&
            createPortal(
              <span
                role="tooltip"
                className="absolute -translate-x-1/2 whitespace-nowrap rounded-md bg-panel px-2 py-1 text-xs text-parchment shadow-lg ring-1 ring-brown/60"
                style={{ top: charTip.top, left: charTip.left }}
              >
                {abilityTip}
              </span>,
              tipHost,
            )}
        </div>

        <Link
          icon={<Info size={20} />}
          label="About"
          tipSide="below"
          onClick={() => setCreditsOpen(true)}
          active={false}
        />

        <button
          type="button"
          onClick={onMainMenu}
          className="flex items-center gap-2 rounded-lg bg-brown px-3 py-2 text-parchment transition-colors hover:bg-crimson"
        >
          <Menu size={20} />
          <span>Main Menu</span>
        </button>

        <button
          type="button"
          onClick={saveGame}
          className="flex items-center gap-2 rounded-lg bg-sage px-4 py-2 text-ink transition-colors hover:bg-gold"
        >
          <Save size={20} />
          <span>Save Game</span>
        </button>
      </div>
    </div>
  )
}

function jumpObjective(
  obj: import('../data/quests').Objective,
  onNavigate: (page: string, focus?: PageFocus) => void,
) {
  if (obj.type === 'kill') {
    if ('monsterId' in obj) {
      const monster = getMonster(obj.monsterId)
      const biome = (monster?.biomes[0] ?? 'forest') as BiomeId
      onNavigate('monsterHunting', { kind: 'monster', monsterId: obj.monsterId, biome })
      return
    }
    onNavigate('monsterHunting')
    return
  }
  if (obj.type === 'gather' || obj.type === 'craft') {
    const activity = SKILLS.map((skill) => getActivity(skill.id, obj.activityId)).find(Boolean)
    if (activity) {
      onNavigate(activity.skillId, {
        kind: 'activity',
        skillId: activity.skillId,
        activityId: activity.id,
      })
      return
    }
  }
  if (obj.type === 'reachLevel') {
    if (obj.skillId === 'class') {
      onNavigate('character')
      return
    }
    if (isSkillId(obj.skillId)) onNavigate(obj.skillId)
    return
  }
  if (obj.type === 'clearDungeon') {
    onNavigate('monsterHunting', { kind: 'dungeon', dungeonId: obj.dungeonId })
    return
  }
  if (obj.type === 'have' || obj.type === 'deliver') {
    const source = sourcesOf(obj.itemId)[0]
    if (source?.kind === 'activity') {
      onNavigate(source.skillId, {
        kind: 'activity',
        skillId: source.skillId,
        activityId: source.activityId,
      })
      return
    }
    if (source?.kind === 'monster') {
      const monster = getMonster(source.monsterId)
      onNavigate('monsterHunting', {
        kind: 'monster',
        monsterId: source.monsterId,
        biome: (monster?.biomes[0] ?? 'forest') as BiomeId,
      })
      return
    }
    onNavigate('inventory')
  }
}

function formatBuffTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  if (hours > 0) return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`
  if (minutes > 0) return `${minutes}m`
  return `${totalSec}s`
}

function buffLabel(id: string): string {
  if (id.startsWith('notes-')) return `Notes: ${id.slice(6)}`
  return id.replace(/-/g, ' ')
}
