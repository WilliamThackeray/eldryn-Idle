import { PanelLeftClose, PanelLeftOpen, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { SKILL_ABILITY_GROUPS, SKILLS } from '../data/skills'
import { levelForXp } from '../engine/xp'
import { useGameStore } from '../store/gameStore'
import { useUiPrefs } from '../store/uiPrefs'
import { SkillIcon } from './skillIcons'
import { cx } from './ui/format'
import { Tooltip } from './ui/Tooltip'

interface SidebarProps {
  currentPage: string
  setCurrentPage: (page: string) => void
}

const ABILITY_TEXT = {
  STR: 'text-ability-str',
  DEX: 'text-ability-dex',
  CON: 'text-ability-con',
  INT: 'text-ability-int',
  WIS: 'text-ability-wis',
  CHA: 'text-ability-cha',
} as const

export function Sidebar({ currentPage, setCurrentPage }: SidebarProps) {
  const expanded = useUiPrefs((state) => state.sidebarExpanded)
  const toggleSidebar = useUiPrefs((state) => state.toggleSidebar)
  const skills = useGameStore((state) => state.skills)
  const activeAction = useGameStore((state) => state.activeAction)
  const runningId = activeAction?.kind === 'skill' ? activeAction.skillId : null
  const unseenUnlocks = useUiPrefs((state) => state.unseenUnlocks)
  const unseenSkills = new Set(unseenUnlocks.map((key) => key.split(':')[0]))

  return (
    <aside
      className={cx(
        'flex h-full shrink-0 flex-col border-r border-line bg-ink py-2',
        expanded ? 'w-52' : 'w-16',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2">
        <NavButton
          expanded={expanded}
          label="Character"
          active={currentPage === 'character'}
          onClick={() => setCurrentPage('character')}
          icon={<User size={20} aria-hidden />}
        />
        {SKILL_ABILITY_GROUPS.map((abbr) => (
          <div key={abbr} className={cx('flex flex-col gap-1', expanded && 'items-stretch')}>
            <span
              className={cx(
                'px-1 font-semibold uppercase tracking-wide',
                ABILITY_TEXT[abbr],
                expanded ? 'text-meta' : 'text-center text-[10px] leading-tight',
              )}
            >
              {abbr}
            </span>
            {SKILLS.filter((skill) => skill.ability === abbr).map((skill) => (
              <NavButton
                key={skill.id}
                expanded={expanded}
                label={skill.name}
                level={levelForXp(skills[skill.id].xp)}
                running={runningId === skill.id}
                attention={unseenSkills.has(skill.id)}
                active={
                  skill.id === 'vitality' ? currentPage === 'character' : currentPage === skill.id
                }
                onClick={() =>
                  setCurrentPage(skill.id === 'vitality' ? 'character' : skill.id)
                }
                icon={<SkillIcon id={skill.id} />}
              />
            ))}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={toggleSidebar}
        aria-pressed={expanded}
        aria-label={expanded ? 'Collapse skill list' : 'Expand skill list'}
        className="mx-2 mt-2 flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-meta text-parchment hover:bg-brown"
      >
        {expanded ? <PanelLeftClose size={18} aria-hidden /> : <PanelLeftOpen size={18} aria-hidden />}
        {expanded && <span>Collapse</span>}
      </button>
    </aside>
  )
}

function NavButton({
  expanded,
  label,
  level,
  running = false,
  attention = false,
  active,
  onClick,
  icon,
}: {
  expanded: boolean
  label: string
  level?: number
  running?: boolean
  attention?: boolean
  active: boolean
  onClick: () => void
  icon: ReactNode
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={
        expanded
          ? undefined
          : `${label}${level != null ? `, level ${level}` : ''}${running ? ', running' : ''}${attention ? ', new unlocks' : ''}`
      }
      className={cx(
        'relative flex rounded-lg text-parchment transition-colors',
        active ? 'bg-crimson' : 'hover:bg-brown',
        expanded ? 'w-full items-center gap-2 px-2 py-1.5' : 'h-12 w-10 flex-col items-center justify-center',
      )}
    >
      <span className="relative">
        {icon}
        {running && <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-sage" />}
        {attention && <span className="absolute -bottom-0.5 -right-1 h-2 w-2 rounded-full bg-gold" />}
      </span>
      {running && <span className="sr-only">running</span>}
      {expanded ? (
        <>
          <span className="min-w-0 flex-1 truncate text-left text-body">{label}</span>
          {level != null && <span className="text-meta text-gold">{level}</span>}
        </>
      ) : (
        level != null && <span className="text-[10px] leading-none text-gold" aria-hidden>{level}</span>
      )}
    </button>
  )
  if (expanded) return button
  return (
    <Tooltip content={label} side="right">
      {button}
    </Tooltip>
  )
}
