import { Coins, Package, Save, ShoppingCart, Swords, User } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getClass } from '../data/classes'
import { SKILLS } from '../data/skills'
import { actionIntervalMs } from '../engine/advance'
import { levelForXp } from '../engine/xp'
import { useGameStore } from '../store/gameStore'
import { Link } from './Link'
import { ProgressBar } from './ProgressBar'

interface HeaderProps {
  title: string
  currentPage: string
  setCurrentPage: (page: string) => void
}

export function Header({ title, currentPage, setCurrentPage }: HeaderProps) {
  const [charTip, setCharTip] = useState<{ top: number; left: number } | null>(null)
  const charRef = useRef<HTMLButtonElement>(null)
  const characterName = useGameStore((state) => state.characterName)
  const activeClassId = useGameStore((state) => state.activeClassId)
  const classes = useGameStore((state) => state.classes)
  const skills = useGameStore((state) => state.skills)
  const gold = useGameStore((state) => state.gold)
  const activeAction = useGameStore((state) => state.activeAction)
  const saveGame = useGameStore((state) => state.saveGame)
  const actionInterval = activeAction ? actionIntervalMs(activeAction, skills) : 0
  const actionProgress =
    activeAction && actionInterval > 0 ? Math.min(100, (activeAction.progressMs / actionInterval) * 100) : 0
  const actionLabel = activeAction
    ? activeAction.kind === 'skill'
      ? `${SKILLS.find((skill) => skill.id === activeAction.skillId)?.name ?? 'Skill'} · ${activeAction.label}`
      : activeAction.label
    : 'Idle'
  const tipHost = typeof document !== 'undefined' ? document.getElementById('tooltip-root') : null
  const classLevel = activeClassId ? levelForXp(classes[activeClassId].xp) : null
  const classLabel = activeClassId ? `${getClass(activeClassId).name} ${classLevel}` : 'No class'
  const summary = `${characterName} · ${classLabel}`

  const showCharTip = () => {
    const rect = charRef.current?.getBoundingClientRect()
    if (!rect) return
    setCharTip({ top: rect.bottom + 8, left: rect.left + rect.width / 2 })
  }

  return (
    <div className="flex items-center justify-between border-b border-brown/40 bg-panel px-4 py-3 text-parchment">
      <h1 className="text-2xl font-bold text-gold">{title}</h1>

      <div className="mx-4 flex min-w-0 items-center gap-2" aria-label="Active action">
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

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-gold" aria-label="Gold">
          <Coins size={18} />
          <span>{gold.toLocaleString()} gp</span>
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
          label="Monster Hunting"
          tipSide="below"
          onClick={() => setCurrentPage('monsterHunting')}
          active={currentPage === 'monsterHunting'}
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
                Character
              </span>,
              tipHost,
            )}
        </div>

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
