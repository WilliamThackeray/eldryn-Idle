import { useMemo, useState } from 'react'
import { getClass, type ClassId } from '../../data/classes'
import { getItem } from '../../data/items'
import {
  BIOMES,
  BIOME_LABELS,
  monstersForBiome,
  type BiomeId,
  type MonsterDef,
} from '../../data/monsters'
import type { SkillId } from '../../data/skills'
import { deriveAbilities } from '../../engine/abilities'
import {
  averageDamage,
  difficultyHint,
  maxHp,
  playerToHitBonus,
} from '../../engine/combat'
import { ProgressBar } from '../../components/ProgressBar'
import { RESPAWN_MS } from '../../engine/config'
import { levelForXp, tier } from '../../engine/xp'
import { useGameStore } from '../../store/gameStore'
import type { SkillProgress } from '../../types/game'

export function CombatPage() {
  const [biome, setBiome] = useState<BiomeId>('forest')
  const activeClassId = useGameStore((state) => state.activeClassId)
  const classes = useGameStore((state) => state.classes)
  const skills = useGameStore((state) => state.skills)
  const equipment = useGameStore((state) => state.equipment)
  const combat = useGameStore((state) => state.combat)
  const activeAction = useGameStore((state) => state.activeAction)
  const log = useGameStore((state) => state.log)
  const startHunt = useGameStore((state) => state.startHunt)
  const stopActivity = useGameStore((state) => state.stopActivity)

  const monsters = useMemo(() => monstersForBiome(biome), [biome])
  const hunting = activeAction?.kind === 'combat'
  const classXp = activeClassId ? classes[activeClassId].xp : 0
  const toHit = playerToHitBonus(skills, equipment, classXp)

  const combatLines = log.flatMap((entry) => (entry.kind === 'combat' ? entry.lines : []))
  const displayLog = combat?.log?.length ? combat.log : combatLines

  const killsPerHour =
    combat && combat.sessionMs > 0 ? (combat.kills / combat.sessionMs) * 3_600_000 : 0

  const playerIntervalProgress =
    combat == null
      ? 0
      : combat.phase === 'rest'
        ? Math.min(100, (combat.restProgressMs / RESPAWN_MS) * 100)
        : combat.playerIntervalMs > 0
          ? Math.min(100, (combat.playerProgressMs / combat.playerIntervalMs) * 100)
          : 0
  const monsterIntervalProgress =
    combat == null || combat.phase === 'rest' || combat.monsterIntervalMs <= 0
      ? 0
      : Math.min(100, (combat.monsterProgressMs / combat.monsterIntervalMs) * 100)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {BIOMES.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setBiome(id)}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              biome === id ? 'bg-crimson text-parchment' : 'bg-panel text-parchment hover:bg-brown'
            }`}
          >
            {BIOME_LABELS[id]}
          </button>
        ))}
      </div>

      {hunting && combat ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="space-y-4 rounded-lg border border-brown/40 bg-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gold">{activeAction.label}</h2>
              <button
                type="button"
                onClick={() => stopActivity()}
                className="rounded-lg bg-crimson px-3 py-1.5 text-sm text-parchment hover:bg-brown"
              >
                Stop
              </button>
            </div>

            <HpBlock
              label="You"
              hp={combat.playerHp}
              maxHp={combat.playerMaxHp}
              barClassName="bg-sage"
            />
            <div>
              <div className="mb-1 flex justify-between text-xs text-parchment/70">
                <span>{combat.phase === 'rest' ? 'Resting' : 'Your interval'}</span>
                <span>
                  {combat.phase === 'rest'
                    ? `${(combat.restProgressMs / 1000).toFixed(1)}s / ${RESPAWN_MS / 1000}s`
                    : `${(combat.playerProgressMs / 1000).toFixed(1)}s / ${(combat.playerIntervalMs / 1000).toFixed(1)}s`}
                </span>
              </div>
              <ProgressBar progress={playerIntervalProgress} label="Player interval" />
            </div>

            <HpBlock
              label={monsters.find((m) => m.id === combat.monsterId)?.name ?? 'Monster'}
              hp={combat.monsterHp}
              maxHp={combat.monsterMaxHp}
              barClassName="bg-crimson"
            />
            <div>
              <div className="mb-1 flex justify-between text-xs text-parchment/70">
                <span>Enemy interval</span>
                <span>
                  {combat.phase === 'rest'
                    ? '—'
                    : `${(combat.monsterProgressMs / 1000).toFixed(1)}s / ${(combat.monsterIntervalMs / 1000).toFixed(1)}s`}
                </span>
              </div>
              <ProgressBar progress={monsterIntervalProgress} barClassName="bg-crimson" label="Monster interval" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded border border-brown/40 p-2">
                <div className="text-parchment/70">Kills / hour</div>
                <div className="font-bold text-gold">{killsPerHour.toFixed(1)}</div>
              </div>
              <div className="rounded border border-brown/40 p-2">
                <div className="text-parchment/70">Kills this hunt</div>
                <div className="font-bold text-gold">{combat.kills}</div>
              </div>
            </div>

            <div>
              <h3 className="mb-1 font-bold">Loot gained</h3>
              {combat.lootGained.length === 0 ? (
                <p className="text-sm text-parchment/70">None yet.</p>
              ) : (
                <ul className="text-sm">
                  {combat.lootGained.map((item) => (
                    <li key={item.id}>
                      {item.name} ×{item.quantity}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-brown/40 bg-panel p-4">
            <h3 className="mb-2 font-bold text-gold">Combat log</h3>
            <div className="max-h-[28rem] space-y-1 overflow-auto font-mono text-xs leading-relaxed">
              {displayLog.length === 0 ? (
                <p className="text-parchment/70">Waiting for the first interval…</p>
              ) : (
                displayLog.map((line, index) => (
                  <p key={`${index}-${line.slice(0, 12)}`}>{line}</p>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {!activeClassId && (
            <p className="rounded-lg border border-crimson/50 bg-panel p-3 text-sm text-crimson">
              Pick a class on the Character page before hunting.
            </p>
          )}
          {monsters.map((monster) => (
            <MonsterRow
              key={monster.id}
              monster={monster}
              toHit={toHit}
              playerHpEstimate={estimatePlayerHp(activeClassId, classXp, skills)}
              disabled={!activeClassId}
              onFight={() => startHunt(monster.id, biome)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function estimatePlayerHp(
  activeClassId: ClassId | null,
  classXp: number,
  skills: Record<SkillId, SkillProgress>,
): number {
  if (!activeClassId) return 10
  const cls = getClass(activeClassId)
  const con = deriveAbilities(skills).find((ability) => ability.abbr === 'CON')?.modifier ?? 0
  return maxHp(cls.hitDie, tier(levelForXp(classXp)), con)
}

function MonsterRow({
  monster,
  toHit,
  playerHpEstimate,
  disabled,
  onFight,
}: {
  monster: MonsterDef
  toHit: number
  playerHpEstimate: number
  disabled: boolean
  onFight: () => void
}) {
  const avgDamage = monster.attacks.reduce((sum, attack) => sum + averageDamage(attack.damage), 0)
  const hint = difficultyHint({
    playerToHitBonus: toHit,
    monsterAc: monster.ac,
    playerHp: playerHpEstimate,
    monsterAvgDamagePerInterval: avgDamage,
  })
  const drops = monster.lootTable
    .map((entry) => getItem(entry.itemId)?.name ?? entry.itemId)
    .join(', ')

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brown/40 bg-panel p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-lg font-bold text-gold">{monster.name}</h3>
          <span className="text-sm text-parchment/70">
            CR {formatCr(monster.cr)} · AC {monster.ac} · HP {monster.hp}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${
              hint === 'Easy' ? 'bg-sage/30 text-sage' : hint === 'Hard' ? 'bg-crimson/30 text-crimson' : 'bg-brown text-parchment'
            }`}
          >
            {hint}
          </span>
        </div>
        <p className="mt-1 text-sm text-parchment/80">Drops: {drops || '—'}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onFight}
        className="rounded-lg bg-crimson px-4 py-2 text-sm font-bold text-parchment transition-colors hover:bg-brown disabled:cursor-not-allowed disabled:opacity-40"
      >
        Fight
      </button>
    </div>
  )
}

function HpBlock({
  label,
  hp,
  maxHp,
  barClassName,
}: {
  label: string
  hp: number
  maxHp: number
  barClassName: string
}) {
  const progress = maxHp > 0 ? Math.min(100, (hp / maxHp) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-bold">{label}</span>
        <span>
          {Math.ceil(hp)} / {maxHp}
        </span>
      </div>
      <ProgressBar progress={progress} barClassName={barClassName} label={`${label} HP`} className="h-3" />
    </div>
  )
}

function formatCr(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}
