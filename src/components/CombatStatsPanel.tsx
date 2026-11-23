import type { MonsterDef } from '../data/monsters'
import type { ClassId } from '../data/classes'
import type { TradeSkillId } from '../data/skills'
import type { SkillProgress } from '../types/game'
import type { Equipment } from '../engine/equipment'
import type { Bestiaries } from '../engine/history'
import type { Inventory } from '../engine/inventory'
import type { SpellLoadout } from '../engine/spells'
import { StatTile } from './ui/StatTile'
import {
  computeCombatStats,
  type CombatStats,
  type StatBreakdown,
} from '../engine/combatStats'

interface CombatStatsPanelProps {
  skills: Record<TradeSkillId, SkillProgress>
  equipment: Equipment
  classId: ClassId | null
  classXp: number
  inventory: Inventory
  spellLoadout?: SpellLoadout
  monster?: MonsterDef | null
  compact?: boolean
  bestiaries?: Bestiaries
  showMatchup?: boolean
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

function CompactStat({
  label,
  stat,
  display,
  format,
}: {
  label: string
  stat: StatBreakdown
  display: string
  format?: (n: number) => string
}) {
  return (
    <div>
      <div className="text-xs text-sage">{label}</div>
      <StatHover label={label} stat={stat} display={display} format={format} />
    </div>
  )
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
  showMatchup = true,
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
    <div className={`rounded-lg border border-line bg-panel ${compact ? 'space-y-2 p-4 text-sm' : 'space-y-3 p-5'}`}>
      <h3 className="font-bold text-gold">{compact ? 'Combat' : 'Combat Stats'}</h3>
      <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-3 sm:grid-cols-3'}`}>
        {compact ? (
          <>
            <CompactStat label="To-hit" stat={stats.toHit} display={formatSigned(stats.toHit.value)} format={formatSigned} />
            <CompactStat label="Damage" stat={stats.damageFlat} display={`${dice}${flat ? ` ${formatSigned(flat)}` : ''}`} format={formatSigned} />
            <CompactStat label="Interval" stat={stats.intervalSec} display={`${stats.intervalSec.value.toFixed(1)}s`} format={(n) => `${n.toFixed(2)}s`} />
            <CompactStat label="AC" stat={stats.ac} display={String(stats.ac.value)} format={formatSigned} />
          </>
        ) : (
          <>
            <StatTile label="To-hit" value={formatSigned(stats.toHit.value)} breakdown={formatBreakdown('To-hit', stats.toHit, formatSigned)} />
            <StatTile label="Damage" value={`${dice}${flat ? ` ${formatSigned(flat)}` : ''}`} breakdown={formatBreakdown('Damage flat', stats.damageFlat, formatSigned)} />
            <StatTile label="Interval" value={`${stats.intervalSec.value.toFixed(1)}s`} breakdown={formatBreakdown('Interval', stats.intervalSec, (n) => `${n.toFixed(2)}s`)} />
            <StatTile label="AC" value={stats.ac.value} breakdown={formatBreakdown('AC', stats.ac, formatSigned)} />
            <StatTile label="Max HP" value={stats.maxHp.value} breakdown={formatBreakdown('Max HP', stats.maxHp, String)} />
            <StatTile label="Crit" value={stats.critRange.parts[0]?.label ?? '20'} breakdown={formatBreakdown('Crit', stats.critRange, String)} />
          </>
        )}
      </div>

      {!compact && stats.resistances.value.length > 0 && (
        <p className="text-xs text-parchment/80">
          Resist: {stats.resistances.value.join(', ')}
        </p>
      )}

      {showMatchup && stats.matchup && (
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
