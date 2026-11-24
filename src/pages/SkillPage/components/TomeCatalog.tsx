import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { SkillIcon } from '../../../components/skillIcons'
import { Button } from '../../../components/ui/Button'
import { ItemChip } from '../../../components/ui/ItemChip'
import { cx } from '../../../components/ui/format'
import type { ActivityDef } from '../../../data/activities'
import { TOME_SKILLS, parseTomeActivityId } from '../../../data/historyContent'
import { SKILLS, type SkillId } from '../../../data/skills'
import type { Inventory } from '../../../engine/inventory'
import { useGameStore } from '../../../store/gameStore'
import { presentActivity } from '../../../engine/presentActivity'
import { ROMAN, inputChips, lockLabel } from '../present'

export function TomeCatalog({
  activities,
  tomes,
  inventory,
  pageDiscount,
  level,
  renown,
  selectedId,
  onSelect,
  onCraft,
}: {
  activities: ActivityDef[]
  tomes: Partial<Record<SkillId, number>>
  inventory: Inventory
  pageDiscount: number
  level: number
  renown: number
  selectedId: string
  onSelect: (activity: ActivityDef) => void
  onCraft: (activity: ActivityDef) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const skills = useGameStore((state) => state.skills)
  const classId = useGameStore((state) => state.classId)
  const secondaryClassId = useGameStore((state) => state.secondaryClassId)
  const questProgress = useGameStore((state) => state.questProgress)
  const viewer = { skills, renown, classId, secondaryClassId, questProgress }
  const bySkill = new Map<string, ActivityDef[]>()
  for (const activity of activities) {
    const parsed = parseTomeActivityId(activity.id)
    if (!parsed) continue
    const list = bySkill.get(parsed.skillId) ?? []
    list.push(activity)
    bySkill.set(parsed.skillId, list)
  }

  return (
    <div className="space-y-2">
      {TOME_SKILLS.map((skillId) => {
        const skill = SKILLS.find((entry) => entry.id === skillId)
        const volumes = [...(bySkill.get(skillId) ?? [])].sort(
          (a, b) => (parseTomeActivityId(a.id)?.volume ?? 0) - (parseTomeActivityId(b.id)?.volume ?? 0),
        )
        if (!skill || volumes.length === 0) return null
        const read = Math.min(volumes.length, tomes[skillId] ?? 0)
        const next = volumes[read] ?? null
        const expanded = open === skillId
        const roman = read > 0 ? ROMAN[read - 1] : null
        const locked = next ? lockLabel(next, level, renown) : null
        return (
          <div key={skillId} className="rounded-lg border border-line bg-panel p-3 text-parchment">
            <button
              type="button"
              className="flex w-full flex-wrap items-center gap-2 text-left"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : skillId)}
            >
              <SkillIcon id={skillId} size={18} />
              <span className="text-card">{skill.name}</span>
              <span className="text-meta text-muted">{roman ? `Vol. ${roman} / ${volumes.length} read` : `0 / ${volumes.length} read`}</span>
              <span className="text-meta text-sage">+{read}% XP</span>
              <ChevronDown size={16} className={cx('ml-auto shrink-0', expanded && 'rotate-180')} aria-hidden />
            </button>
            {next ? (
              presentActivity(next, viewer).visible ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-meta text-muted">{next.name}</span>
                {inputChips(next, inventory, pageDiscount).map((input) => (
                  <ItemChip key={input.name} name={input.name} owned={input.owned} needed={input.needed} />
                ))}
                <Button
                  size="sm"
                  disabled={locked != null}
                  disabledReason={locked ? `Requires ${locked}` : undefined}
                  onClick={() => onCraft(next)}
                >
                  Craft
                </Button>
              </div>
              ) : (
                <p className="mt-2 text-meta text-muted">Requires Scribing level {next.requiredLevel}</p>
              )
            ) : (
              <p className="mt-2 text-meta text-sage">All {volumes.length} volumes read</p>
            )}
            {expanded && (
              <ul className="mt-2 space-y-1">
                {volumes.map((volume) => {
                  const parsed = parseTomeActivityId(volume.id)
                  const volumeNo = parsed?.volume ?? 0
                  const view = presentActivity(volume, viewer)
                  const status = volumeNo <= read ? 'Read' : volumeNo === read + 1 ? 'Next' : lockLabel(volume, level, renown)
                  return (
                    <li key={volume.id}>
                      <button
                        type="button"
                        className={cx(
                          'flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-meta',
                          selectedId === volume.id ? 'bg-raised text-gold' : 'text-parchment hover:bg-raised',
                        )}
                        onClick={() => onSelect(volume)}
                      >
                        <span>{view.visible ? volume.name : `Requires Scribing level ${volume.requiredLevel}`}</span>
                        <span className="text-muted">{view.visible ? status : ''}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
