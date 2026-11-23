import { BookOpen, Menu, MoreHorizontal, Package, ShoppingCart, Swords, Tent, User } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getActivity } from '../data/activities'
import { getClass } from '../data/classes'
import { getMonster, type BiomeId } from '../data/monsters'
import { getQuest } from '../data/quests'
import { SKILLS, isSkillId } from '../data/skills'
import { actionIntervalMs } from '../engine/advance'
import { deriveAbilities } from '../engine/abilities'
import { RESPAWN_MS } from '../engine/config'
import { sourcesOf } from '../engine/itemIndex'
import { currentStage, getRun, objectiveLabel, objectiveProgress } from '../engine/quest'
import { levelForXp } from '../engine/xp'
import type { PageFocus } from '../pages/pageFocus'
import { useGameStore } from '../store/gameStore'
import { CreditsModal } from './CreditsModal'
import { ProgressBar } from './ProgressBar'
import { SkillIcon } from './skillIcons'
import { Button } from './ui/Button'
import { Chip } from './ui/Badge'
import { Currency } from './ui/Currency'
import { Tooltip } from './ui/Tooltip'

interface HeaderProps {
  title: string
  currentPage: string
  setCurrentPage: (page: string) => void
  onNavigate: (page: string, focus?: PageFocus) => void
  onMainMenu: () => void
}

const NAV = [
  { id: 'shop', label: 'Shop', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'monsterHunting', label: 'Combat', icon: Swords },
  { id: 'mile-camp', label: 'Mile-Camp', icon: Tent },
] as const

export function Header({ title, currentPage, setCurrentPage, onNavigate, onMainMenu }: HeaderProps) {
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
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
  const stopActivity = useGameStore((state) => state.stopActivity)
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

  useEffect(() => {
    if (!moreOpen) return
    const onPointer = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  return (
    <header
      id="app-header"
      className="relative z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-panel px-4 py-2 text-parchment"
    >
      <CreditsModal open={creditsOpen} onClose={() => setCreditsOpen(false)} />
      <h1 className="text-page text-gold">{title}</h1>

      <div className="flex min-w-0 flex-1 items-center gap-3" aria-label="Active action">
        {activeAction ? (
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setCurrentPage(activeAction.kind === 'skill' ? activeAction.skillId : 'monsterHunting')
              }
              className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-raised py-1 pl-2 pr-2 hover:border-gold"
              aria-label={`Open ${activeAction.label}`}
            >
              {activeAction.kind === 'skill' ? (
                <SkillIcon id={activeAction.skillId} size={16} />
              ) : (
                <Swords size={16} aria-hidden />
              )}
              <span className="max-w-[10rem] truncate text-body">{activeAction.label}</span>
              <span className="w-16 shrink-0">
                <ProgressBar progress={actionProgress} className="h-1" label="Active action progress" />
              </span>
            </button>
            <Button size="sm" variant="danger" onClick={() => stopActivity()}>
              Stop
            </Button>
          </div>
        ) : (
          <span className="text-body text-muted">Idle</span>
        )}
        {pinnedQuest && pinnedRun && pinnedStage && 'objectives' in pinnedStage && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 border-l border-line pl-3" aria-label="Quest tracker">
            <span className="truncate text-meta text-gold">{pinnedQuest.title}</span>
            {pinnedStage.objectives.map((obj, i) => {
              const prog = objectiveProgress(obj, pinnedRun.counts[i] ?? 0, inventory, skills, classXp)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => jumpObjective(obj, onNavigate)}
                  className="truncate text-meta text-sage hover:underline"
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
            className="border-l border-line pl-3 text-meta text-gold hover:underline"
          >
            {pinnedQuest.title}: check ready
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {activeBuffs.length > 0 && (
          <div className="flex items-center gap-1" aria-label="Active buffs">
            {activeBuffs.map((buff) => (
              <Tooltip key={buff.id} content={`${buffLabel(buff.id)} · ${formatBuffTime(buff.remainingMs)} left`}>
                <Chip tone="sage">
                  <BookOpen size={12} aria-hidden />
                  {formatBuffTime(buff.remainingMs)}
                </Chip>
              </Tooltip>
            ))}
          </div>
        )}
        <Currency kind="gp" amount={gold} />
        <Currency kind="favor" amount={favor} />

        <Tooltip content={abilityTip}>
          <button
            type="button"
            onClick={() => setCurrentPage('character')}
            aria-current={currentPage === 'character' ? 'page' : undefined}
            className={`flex max-w-[14rem] items-center gap-2 rounded-lg px-2 py-1.5 text-body ${
              currentPage === 'character' ? 'bg-crimson text-parchment' : 'text-parchment hover:bg-brown'
            }`}
          >
            <User size={18} className="shrink-0" aria-hidden />
            <span className="truncate">{summary}</span>
          </button>
        </Tooltip>

        <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = currentPage === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentPage(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-meta font-semibold ${
                  active ? 'bg-crimson text-parchment' : 'text-parchment hover:bg-brown'
                }`}
              >
                <Icon size={16} aria-hidden />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="relative" ref={moreRef}>
          <button
            type="button"
            aria-label="More actions"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            onClick={() => setMoreOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-parchment hover:bg-brown"
          >
            <MoreHorizontal size={18} aria-hidden />
          </button>
          {moreOpen && (
            <div role="menu" className="absolute right-0 z-40 mt-1 w-40 rounded-lg border border-line bg-raised p-1 shadow-lg">
              <MenuItem
                onClick={() => {
                  setMoreOpen(false)
                  setCreditsOpen(true)
                }}
              >
                About
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMoreOpen(false)
                  saveGame()
                }}
              >
                Save
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMoreOpen(false)
                  onMainMenu()
                }}
              >
                <Menu size={14} aria-hidden />
                Main Menu
              </MenuItem>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function MenuItem({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body text-parchment hover:bg-brown"
    >
      {children}
    </button>
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
