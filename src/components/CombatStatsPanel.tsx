import type { MonsterDef } from '../data/monsters'
import type { ClassId } from '../data/classes'
import type { SkillId } from '../data/skills'
import type { SkillProgress } from '../types/game'
import type { Equipment } from '../engine/equipment'
import type { Bestiaries } from '../engine/history'
import type { Inventory } from '../engine/inventory'
import type { SpellLoadout } from '../engine/spells'
import {
  computeCombatStats,
  type CombatStats,
  type StatBreakdown,
} from '../engine/combatStats'

interface CombatStatsPanelProps {
  skills: Record<SkillId, SkillProgress>
  equipment: Equipment
  classId: ClassId | null
  classXp: number
  inventory: Inventory
  spellLoadout?: SpellLoadout
  monster?: MonsterDef | null
  compact?: boolean
  bestiaries?: Bestiaries
}

function formatSigned(value: number, digits = 0): string {
  const rounded = digits > 0 ? value.toFixed(digits) : String(Math.round(value * 100) / 100)
  if (value > 0) return `+${digits > 0 ? Number(rounded).toFixed(digits) : Math.round(value)}`
  return digits > 0 ? Number(rounded).toFixed(digits) : String(Math.round(value))
}

function formatBreakdown(label: string, stat: StatBreakdown, format: (n: number) => string): string {
  if (stat.parts.length === 0) return `${label} ${format(stat.value)}`
  const parts = stat.parts.map((part) => `${part.label} ${formatSigned(part.value, 2)}`).join(' · ')
  return `${label} ${format(stat.value)} = ${parts}`
}

function StatHover({
  label,
  stat,
  display,
  format = (n) => String(n),
}: {
  label: string
  stat: StatBreakdown
  display: string
  format?: (n: number) => string
}) {
  return (
    <span className="group relative cursor-help border-b border-dotted border-sage/50" title={formatBreakdown(label, stat, format)}>
      <span className="font-semibold text-gold">{display}</span>
      <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-1 hidden w-64 rounded border border-brown/40 bg-ink p-2 text-xs text-parchment shadow-lg group-hover:block">
        {formatBreakdown(label, stat, format)}
      </span>
    </span>
  )
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

export function CombatStatsPanel({
  skills,
  equipment,
  classId,
  classXp,
  inventory,
  spellLoadout,
  monster = null,
  compact = false,
  bestiaries,
}: CombatStatsPanelProps) {
  if (!classId) {
    return (
      <div className="rounded-lg border border-brown/40 bg-panel p-4 text-sm text-parchment/70">
        No class selected
      </div>
    )
  }

  const stats: CombatStats = computeCombatStats(
    { skills, equipment, classId, classXp, inventory, spellLoadout, bestiaries },
    monster ?? undefined,
  )

  const dice = stats.damageDice.parts[0]?.label ?? '—'
  const flat = stats.damageFlat.value

  return (
    <div className={`rounded-lg border border-brown/40 bg-panel p-4 text-sm ${compact ? 'space-y-2' : 'space-y-3'}`}>
      <h3 className="font-bold text-gold">{compact ? 'Combat' : 'Combat Stats'}</h3>
      <dl className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        <div>
          <dt className="text-xs text-sage">To-hit</dt>
          <dd>
            <StatHover
              label="To-hit"
              stat={stats.toHit}
              display={formatSigned(stats.toHit.value)}
              format={formatSigned}
            />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-sage">Damage</dt>
          <dd>
            <StatHover
              label="Damage flat"
              stat={stats.damageFlat}
              display={`${dice}${flat ? ` ${formatSigned(flat)}` : ''}`}
              format={formatSigned}
            />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-sage">Interval</dt>
          <dd>
            <StatHover
              label="Interval"
              stat={stats.intervalSec}
              display={`${stats.intervalSec.value.toFixed(1)}s`}
              format={(n) => `${n.toFixed(2)}s`}
            />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-sage">AC</dt>
          <dd>
            <StatHover label="AC" stat={stats.ac} display={String(stats.ac.value)} format={formatSigned} />
          </dd>
        </div>
        {!compact && (
          <>
            <div>
              <dt className="text-xs text-sage">Max HP</dt>
              <dd>
                <StatHover label="Max HP" stat={stats.maxHp} display={String(stats.maxHp.value)} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-sage">Crit</dt>
              <dd>
                <StatHover
                  label="Crit"
                  stat={stats.critRange}
                  display={stats.critRange.parts[0]?.label ?? '20'}
                />
              </dd>
            </div>
          </>
        )}
      </dl>

      {!compact && stats.resistances.value.length > 0 && (
        <p className="text-xs text-parchment/80">
          Resist: {stats.resistances.value.join(', ')}
        </p>
      )}

      {stats.matchup && (
        <div className="space-y-1 border-t border-brown/40 pt-2 text-xs">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              Hit{' '}
              <StatHover
                label="Your hit chance"
                stat={stats.matchup.yourHitChance}
                display={pct(stats.matchup.yourHitChance.value)}
                format={pct}
              />
            </span>
            <span>
              Be hit{' '}
              <StatHover
                label="Its hit chance"
                stat={stats.matchup.itsHitChance}
                display={pct(stats.matchup.itsHitChance.value)}
                format={pct}
              />
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              DPS{' '}
              <StatHover
                label="Your DPS"
                stat={stats.matchup.yourDps}
                display={stats.matchup.yourDps.value.toFixed(2)}
              />
            </span>
            <span>
              Its DPS{' '}
              <StatHover
                label="Its DPS"
                stat={stats.matchup.itsDps}
                display={stats.matchup.itsDps.value.toFixed(2)}
              />
            </span>
            <span>
              TTK{' '}
              <StatHover
                label="Time to kill"
                stat={stats.matchup.timeToKillSec}
                display={`${stats.matchup.timeToKillSec.value.toFixed(1)}s`}
              />
            </span>
            <span>Damage ×{stats.matchup.triangleMultiplier}</span>
          </div>
        </div>
      )}
    </div>
  )
}
