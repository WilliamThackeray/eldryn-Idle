import { useEffect, useMemo, useState } from 'react'
import { getClass, type ClassId } from '../../data/classes'
import { DUNGEONS, getDungeon } from '../../data/dungeons'
import { getItem } from '../../data/items'
import {
  BIOMES,
  BIOME_LABELS,
  getMonster,
  monstersForBiome,
  type BiomeId,
  type MonsterDef,
} from '../../data/monsters'
import type { SkillId } from '../../data/skills'
import { deriveAbilities } from '../../engine/abilities'
import {
  averageDamage,
  difficultyHint,
  playerMaxHp,
  playerToHitBonus,
} from '../../engine/combat'
import { CombatStatsPanel } from '../../components/CombatStatsPanel'
import { ProgressBar } from '../../components/ProgressBar'
import { RESPAWN_MS } from '../../engine/config'
import { equippedFoodCount, foodHealAmount, foodOutlook } from '../../engine/combat/food'
import { computeCombatStats } from '../../engine/combatStats'
import { buildRunOrder } from '../../engine/dungeon'
import { levelForXp, tier } from '../../engine/xp'
import { useGameStore } from '../../store/gameStore'
import type { SkillProgress } from '../../types/game'

type CombatTab = 'hunting' | 'dungeons'

interface CombatPageProps {
  focus?:
    | { kind: 'monster'; monsterId: string; biome: BiomeId }
    | { kind: 'dungeon'; dungeonId: string }
    | null
  onFocusConsumed?: () => void
}

export function CombatPage({ focus = null, onFocusConsumed }: CombatPageProps) {
  const combat = useGameStore((state) => state.combat)
  const [tab, setTab] = useState<CombatTab>(() => (combat?.dungeonId ? 'dungeons' : 'hunting'))
  useEffect(() => {
    if (combat?.dungeonId) setTab('dungeons')
  }, [combat?.dungeonId])
  const [biome, setBiome] = useState<BiomeId>('forest')
  const [highlightMonsterId, setHighlightMonsterId] = useState<string | null>(null)
  const [selectedMonsterId, setSelectedMonsterId] = useState<string | null>(null)
  const [highlightDungeonId, setHighlightDungeonId] = useState<string | null>(null)
  const spellLoadouts = useGameStore((state) => state.spellLoadouts)

  useEffect(() => {
    if (!focus) return
    if (focus.kind === 'monster') {
      setTab('hunting')
      setBiome(focus.biome)
      setHighlightMonsterId(focus.monsterId)
      setHighlightDungeonId(null)
    } else {
      setTab('dungeons')
      setHighlightDungeonId(focus.dungeonId)
      setHighlightMonsterId(null)
    }
    onFocusConsumed?.()
  }, [focus, onFocusConsumed])
  const classId = useGameStore((state) => state.classId)
  const classXp = useGameStore((state) => state.classXp)
  const skills = useGameStore((state) => state.skills)
  const equipment = useGameStore((state) => state.equipment)
  const inventory = useGameStore((state) => state.inventory)
  const activeAction = useGameStore((state) => state.activeAction)
  const log = useGameStore((state) => state.log)
  const startHunt = useGameStore((state) => state.startHunt)
  const startDungeon = useGameStore((state) => state.startDungeon)
  const stopActivity = useGameStore((state) => state.stopActivity)
  const stopWhenOutOfFood = useGameStore((state) => state.stopWhenOutOfFood)
  const setStopWhenOutOfFood = useGameStore((state) => state.setStopWhenOutOfFood)

  const monsters = useMemo(() => monstersForBiome(biome), [biome])
  const inCombat = activeAction?.kind === 'combat'
  const inDungeon = Boolean(combat?.dungeonId)
  const toHit = playerToHitBonus(skills, equipment, classXp, classId)
  const matchupMonster =
    (combat?.monsterId ? getMonster(combat.monsterId) : null) ??
    (selectedMonsterId ? getMonster(selectedMonsterId) : null) ??
    (highlightMonsterId ? getMonster(highlightMonsterId) : null) ??
    monsters[0] ??
    null

  const combatLines = log.flatMap((entry) => (entry.kind === 'combat' ? entry.lines : []))
  const displayLog = combat?.log?.length ? combat.log : combatLines

  const killsPerHour =
    combat && combat.sessionMs > 0 ? (combat.kills / combat.sessionMs) * 3_600_000 : 0
  const runsPerHour =
    combat && combat.sessionMs > 0 ? (combat.runsCompleted / combat.sessionMs) * 3_600_000 : 0

  const foodSummary = useMemo(() => {
    const count = equippedFoodCount(equipment, inventory)
    const heal = foodHealAmount(equipment, skills)
    if (count <= 0 || heal == null || heal <= 0 || !classId || !matchupMonster) {
      return null
    }
    const stats = computeCombatStats(
      {
        skills,
        equipment,
        classId,
        classXp,
        inventory,
        spellLoadout: spellLoadouts[classId],
      },
      matchupMonster,
    )
    const ttk = stats.matchup?.timeToKillSec.value ?? 0
    const itsDps = stats.matchup?.itsDps.value ?? 0
    const maxHp = combat?.playerMaxHp ?? estimatePlayerHp(classId, classXp, skills, equipment)
    const hpLost = Math.min(maxHp, itsDps * ttk)
    const cycleSec = ttk + RESPAWN_MS / 1000
    const outlook = foodOutlook({ foodCount: count, healPerBite: heal, hpLostPerKill: hpLost, cycleSec })
    if (!outlook) return null
    return { count, heal, ...outlook }
  }, [equipment, inventory, skills, classId, classXp, matchupMonster, combat?.playerMaxHp, spellLoadouts])

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

  const dungeon = combat?.dungeonId ? getDungeon(combat.dungeonId) : undefined
  const runOrder = dungeon ? buildRunOrder(dungeon) : []
  const nodeLabel =
    dungeon && combat
      ? runOrder[combat.nodeIndex]?.kind ?? '…'
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setTab('hunting')}
          className={`rounded-lg px-3 py-2 text-sm transition-colors ${
            tab === 'hunting' ? 'bg-crimson text-parchment' : 'bg-panel text-parchment hover:bg-brown'
          }`}
        >
          Hunting
        </button>
        <button
          type="button"
          onClick={() => setTab('dungeons')}
          className={`rounded-lg px-3 py-2 text-sm transition-colors ${
            tab === 'dungeons' ? 'bg-crimson text-parchment' : 'bg-panel text-parchment hover:bg-brown'
          }`}
        >
          Dungeons
        </button>
        <label className="flex items-center gap-2 text-sm text-parchment/80">
          <input
            type="checkbox"
            checked={stopWhenOutOfFood !== false}
            onChange={(event) => setStopWhenOutOfFood(event.target.checked)}
          />
          Stop when out of food
        </label>
      </div>

      {inCombat && combat && (tab === 'dungeons') === inDungeon ? (
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

            {inDungeon && dungeon && (
              <div className="rounded border border-brown/40 p-2 text-sm">
                <div className="font-bold text-gold">{dungeon.name}</div>
                <div className="text-parchment/70">
                  Node {combat.nodeIndex + 1}/{runOrder.length} · {nodeLabel}
                  {combat.restKind ? ` · ${combat.restKind} rest` : ''}
                </div>
                {combat.roomLog.length > 0 && (
                  <p className="mt-1 text-xs text-parchment/80">{combat.roomLog[combat.roomLog.length - 1]}</p>
                )}
              </div>
            )}

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
              label={getMonster(combat.monsterId)?.name ?? 'Monster'}
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
                <div className="text-parchment/70">{inDungeon ? 'Runs / hour' : 'Kills / hour'}</div>
                <div className="font-bold text-gold">
                  {(inDungeon ? runsPerHour : killsPerHour).toFixed(1)}
                </div>
              </div>
              <div className="rounded border border-brown/40 p-2">
                <div className="text-parchment/70">{inDungeon ? 'Runs completed' : 'Kills this hunt'}</div>
                <div className="font-bold text-gold">{inDungeon ? combat.runsCompleted : combat.kills}</div>
              </div>
              <div className="col-span-2 rounded border border-brown/40 p-2">
                <div className="text-parchment/70">Food</div>
                {foodSummary ? (
                  <div className="font-bold text-gold">
                    {foodSummary.foodPerHour.toFixed(1)} / hour · empty in{' '}
                    {formatHours(foodSummary.hoursUntilEmpty)} ({foodSummary.count} left)
                  </div>
                ) : (
                  <div className="font-bold text-parchment/70">No food equipped</div>
                )}
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
      ) : tab === 'hunting' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
          <div className="space-y-3">
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
            {monsters.map((monster) => (
              <MonsterRow
                key={monster.id}
                monster={monster}
                toHit={toHit}
                playerHpEstimate={estimatePlayerHp(classId, classXp, skills, equipment)}
                disabled={!classId || inCombat}
                highlighted={
                  selectedMonsterId === monster.id || highlightMonsterId === monster.id
                }
                onSelect={() => setSelectedMonsterId(monster.id)}
                onFight={() => startHunt(monster.id, biome)}
              />
            ))}
          </div>
          <div className="space-y-3">
            <CombatStatsPanel
              compact
              skills={skills}
              equipment={equipment}
              classId={classId}
              classXp={classXp}
              inventory={inventory}
              spellLoadout={classId ? spellLoadouts[classId] : undefined}
              monster={matchupMonster}
            />
            <div className="rounded-lg border border-brown/40 bg-panel p-3 text-sm">
              <div className="text-parchment/70">Food</div>
              {foodSummary ? (
                <div className="font-bold text-gold">
                  {foodSummary.foodPerHour.toFixed(1)} / hour · empty in{' '}
                  {formatHours(foodSummary.hoursUntilEmpty)}
                </div>
              ) : (
                <div className="text-parchment/70">No food equipped</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {DUNGEONS.map((d) => {
            const entry = d.entryItemId ? getItem(d.entryItemId) : null
            const haveEntry = !d.entryItemId || (inventory[d.entryItemId] ?? 0) > 0
            const encounterNames = [...d.encounters, d.boss]
              .map((id) => getMonster(id)?.name ?? id)
              .join(' → ')
            return (
              <div
                key={d.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-panel p-4 ${
                  highlightDungeonId === d.id ? 'border-gold' : 'border-brown/40'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-lg font-bold text-gold">{d.name}</h3>
                    <span className="text-sm text-parchment/70">
                      {BIOME_LABELS[d.biome]} · Tier {d.recommendedTier}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-parchment/80">{encounterNames}</p>
                  {entry && (
                    <p className="mt-1 text-xs text-parchment/70">
                      Entry: {entry.name}
                      {haveEntry ? '' : ' (missing)'}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!classId || inCombat || !haveEntry}
                  onClick={() => startDungeon(d.id)}
                  className="rounded-lg bg-crimson px-4 py-2 text-sm font-bold text-parchment transition-colors hover:bg-brown disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Enter
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function estimatePlayerHp(
  classId: ClassId | null,
  classXp: number,
  skills: Record<SkillId, SkillProgress>,
  equipment: Parameters<typeof playerMaxHp>[4],
): number {
  if (!classId) return 10
  const cls = getClass(classId)
  const con = deriveAbilities(skills).find((ability) => ability.abbr === 'CON')?.modifier ?? 0
  return playerMaxHp(cls.hitDie, tier(levelForXp(classXp)), con, skills, equipment)
}

function MonsterRow({
  monster,
  toHit,
  playerHpEstimate,
  disabled,
  highlighted = false,
  onSelect,
  onFight,
}: {
  monster: MonsterDef
  toHit: number
  playerHpEstimate: number
  disabled: boolean
  highlighted?: boolean
  onSelect: () => void
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
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect()
      }}
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-panel p-4 ${
        highlighted ? 'border-gold' : 'border-brown/40'
      }`}
    >
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
        {archetypeLine(monster.archetype) && (
          <p className="mt-1 text-xs text-sage">{archetypeLine(monster.archetype)}</p>
        )}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          onFight()
        }}
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

function formatHours(hours: number): string {
  if (!(hours > 0) || !Number.isFinite(hours)) return '—'
  if (hours < 1 / 60) return `${Math.round(hours * 3600)}s`
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return `${hours.toFixed(1)}h`
}

function archetypeLine(archetype: MonsterDef['archetype']): string | null {
  if (archetype === 'armored') return 'Armored: weak to Magic, resists Ranged'
  if (archetype === 'skirmisher') return 'Skirmisher: weak to Ranged, resists Melee'
  if (archetype === 'warded') return 'Warded: weak to Melee, resists Magic'
  return null
}
