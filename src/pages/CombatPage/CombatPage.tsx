import { useEffect, useMemo, useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import { getClass, type ClassId } from '../../data/classes'
import { DUNGEONS, getDungeon } from '../../data/dungeons'
import { getItem } from '../../data/items'
import {
  BIOME_LABELS,
  HUNT_BIOMES,
  getMonster,
  monstersForBiome,
  type BiomeId,
  type MonsterDef,
} from '../../data/monsters'
import { dungeonUnlocked } from '../../engine/quest'
import { dropsFor, tierForBiome, tierForDungeon } from '../../data/tiers'
import { maskCraftLabel } from '../../engine/presentActivity'
import type { TradeSkillId } from '../../data/skills'
import { deriveAbilities } from '../../engine/abilities'
import {
  averageDamage,
  difficultyHint,
  playerMaxHp,
  playerToHitBonus,
} from '../../engine/combat'
import { CombatStatsPanel } from '../../components/CombatStatsPanel'
import { LoadoutButton } from '../../components/LoadoutDrawer'
import { ProgressBar } from '../../components/ProgressBar'
import { Badge, Chip } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ItemChip } from '../../components/ui/ItemChip'
import { PageLayout, SidePanel } from '../../components/ui/PageLayout'
import { StatTile } from '../../components/ui/StatTile'
import { Tabs } from '../../components/ui/Tabs'
import { Tooltip } from '../../components/ui/Tooltip'
import { BountiesTab, LairsTab } from './CombatTabs'
import { difficultyBadge } from './difficultyBadge'
import { useUiPrefs } from '../../store/uiPrefs'
import { RESPAWN_MS } from '../../engine/config'
import type { Bestiaries } from '../../engine/history'
import type { Equipment } from '../../engine/equipment'
import type { Inventory } from '../../engine/inventory'
import type { SpellLoadout } from '../../engine/spells'
import { hitChance } from '../../engine/combat'
import { equippedFoodCount, foodHealAmount, foodOutlook } from '../../engine/combat/food'
import { computeCombatStats } from '../../engine/combatStats'
import { buildRunOrder } from '../../engine/dungeon'
import { levelForXp, tier } from '../../engine/xp'
import { useGameStore } from '../../store/gameStore'
import type { SkillProgress } from '../../types/game'

type CombatTab = 'hunting' | 'lairs' | 'dungeons' | 'bounties'

interface CombatPageProps {
  focus?:
    | { kind: 'monster'; monsterId: string; biome: BiomeId }
    | { kind: 'dungeon'; dungeonId: string }
    | { kind: 'combat-tab'; tab: CombatTab }
    | null
  onFocusConsumed?: () => void
  onOpenBoard?: () => void
}

export function CombatPage({ focus = null, onFocusConsumed, onOpenBoard }: CombatPageProps) {
  const combat = useGameStore((state) => state.combat)
  const [tab, setTabState] = useState<CombatTab>(() => {
    if (combat?.kind === 'lair') return 'lairs'
    if (combat?.kind === 'bounty') return 'bounties'
    if (combat?.dungeonId) return 'dungeons'
    const saved = useUiPrefs.getState().lastTab.combat
    return saved === 'dungeons' || saved === 'lairs' || saved === 'bounties' ? saved : 'hunting'
  })
  const setTab = (next: CombatTab) => {
    setTabState(next)
    useUiPrefs.getState().setLastTab('combat', next)
  }
  useEffect(() => {
    if (combat?.kind === 'lair') setTab('lairs')
    else if (combat?.kind === 'bounty') setTab('bounties')
    else if (combat?.dungeonId) setTab('dungeons')
  }, [combat?.dungeonId, combat?.kind])
  const [biome, setBiome] = useState<BiomeId>('forest')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [highlightMonsterId, setHighlightMonsterId] = useState<string | null>(null)
  const [selectedMonsterId, setSelectedMonsterId] = useState<string | null>(null)
  const [highlightDungeonId, setHighlightDungeonId] = useState<string | null>(null)
  const spellLoadouts = useGameStore((state) => state.spellLoadouts)
  const knownSpells = useGameStore((state) => state.knownSpells)

  useEffect(() => {
    if (!focus) return
    if (focus.kind === 'monster') {
      setTab('hunting')
      setBiome(focus.biome)
      setHighlightMonsterId(focus.monsterId)
      setHighlightDungeonId(null)
    } else if (focus.kind === 'combat-tab') {
      setTab(focus.tab)
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
  const bestiaries = useGameStore((state) => state.bestiaries)
  const activeAction = useGameStore((state) => state.activeAction)
  const log = useGameStore((state) => state.log)
  const startHunt = useGameStore((state) => state.startHunt)
  const startDungeon = useGameStore((state) => state.startDungeon)
  const stopActivity = useGameStore((state) => state.stopActivity)
  const stopWhenOutOfFood = useGameStore((state) => state.stopWhenOutOfFood)
  const setStopWhenOutOfFood = useGameStore((state) => state.setStopWhenOutOfFood)
  const questProgress = useGameStore((state) => state.questProgress)

  const huntTabs = useMemo(() => {
    if (biome === 'quest') return [...HUNT_BIOMES, 'quest' as const]
    return HUNT_BIOMES
  }, [biome])
  const monsters = useMemo(() => monstersForBiome(biome), [biome])
  const visibleDungeons = useMemo(
    () => DUNGEONS.filter((d) => dungeonUnlocked(d.id, d.requiresQuest, questProgress)),
    [questProgress],
  )
  const inCombat = activeAction?.kind === 'combat'
  const inDungeon = Boolean(combat?.dungeonId)
  const matchupMonster =
    (combat?.monsterId ? getMonster(combat.monsterId) : null) ??
    (selectedMonsterId ? getMonster(selectedMonsterId) : null) ??
    (highlightMonsterId ? getMonster(highlightMonsterId) : null) ??
    monsters[0] ??
    null
  const toHit = playerToHitBonus(
    skills,
    equipment,
    classXp,
    classId,
    matchupMonster ? bestiaries[matchupMonster.creatureType] ?? 0 : 0,
  )

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
        knownSpellIds: knownSpells,
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
    <PageLayout>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          name="combat"
          label="Combat"
          value={tab}
          onChange={(id) => setTab(id as CombatTab)}
          tabs={[
            { id: 'hunting', label: 'Hunting' },
            { id: 'lairs', label: 'Lairs' },
            { id: 'dungeons', label: 'Dungeons' },
            { id: 'bounties', label: 'Bounties' },
          ]}
        />
        <div className="relative ml-auto flex items-center gap-2">
          <LoadoutButton loadoutKey="combat" />
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={settingsOpen}
            aria-label="Hunt settings"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <Settings size={16} aria-hidden />
            Settings
          </Button>
          {settingsOpen && (
            <div role="dialog" aria-label="Hunt settings" className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-line bg-ink p-3 shadow-xl">
              <label className="flex items-center gap-2 text-body text-parchment">
                <input
                  type="checkbox"
                  checked={stopWhenOutOfFood !== false}
                  onChange={(event) => setStopWhenOutOfFood(event.target.checked)}
                />
                Stop when out of food
              </label>
            </div>
          )}
        </div>
      </div>

      {inCombat && combat && tab === (combat.kind === 'lair' ? 'lairs' : combat.kind === 'bounty' ? 'bounties' : inDungeon ? 'dungeons' : 'hunting') ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="space-y-4 rounded-lg border border-brown/40 bg-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gold">{activeAction.label}</h2>
              <Button size="sm" variant="danger" onClick={() => stopActivity()}>
                Stop
              </Button>
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
              label={combat.displayName ?? getMonster(combat.monsterId)?.name ?? 'Monster'}
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
                {foodSummary && matchupMonster ? (
                  <div className="font-bold text-gold">{foodLine(matchupMonster.name, foodSummary)}</div>
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

          <SidePanel className="rounded-lg border border-line bg-panel p-4">
            <h3 className="mb-2 font-bold text-gold">Combat log</h3>
            <CombatLog lines={displayLog} />
          </SidePanel>
        </div>
      ) : tab === 'hunting' ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
          <div className="space-y-3">
            <Tabs
              name="biome"
              label="Biome"
              variant="pill"
              value={biome}
              onChange={(id) => setBiome(id as BiomeId)}
              tabs={huntTabs.map((id) => {
                const row = tierForBiome(id)
                return {
                  id,
                  label: BIOME_LABELS[id],
                  count: row ? `${row.name} · ${row.levelMin}–${row.levelMax}` : undefined,
                  locked: row?.zone.comingSoon,
                }
              })}
            />
            {tierForBiome(biome)?.zone.comingSoon ? (
              <p className="text-sm text-parchment/70">Coming soon.</p>
            ) : monsters.map((monster) => (
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
          <SidePanel className="space-y-3">
            <CombatStatsPanel
              compact
              showMatchup={false}
              skills={skills}
              equipment={equipment}
              classId={classId}
              classXp={classXp}
              inventory={inventory}
              spellLoadout={classId ? spellLoadouts[classId] : undefined}
              knownSpellIds={knownSpells}
              monster={matchupMonster}
              bestiaries={bestiaries}
            />
            <MatchupPanel monster={matchupMonster} classId={classId} skills={skills} equipment={equipment} classXp={classXp} inventory={inventory} spellLoadout={classId ? spellLoadouts[classId] : undefined} knownSpellIds={knownSpells} bestiaries={bestiaries} foodSummary={foodSummary} />
          </SidePanel>
        </div>
      ) : tab === 'lairs' ? (
        <LairsTab />
      ) : tab === 'bounties' ? (
        <BountiesTab onOpenBoard={onOpenBoard ?? (() => undefined)} />
      ) : (
        <div className="space-y-3">
          {visibleDungeons.map((d) => {
            const entry = d.entry ? getItem(d.entry.itemId) : null
            const need = d.entry?.quantity ?? 0
            const have = d.entry ? (inventory[d.entry.itemId] ?? 0) : 0
            const haveEntry = !d.entry || have >= need
            const row = tierForDungeon(d.id)
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
                    <span className={`text-sm ${row?.color ?? 'text-parchment/70'}`}>
                      {BIOME_LABELS[d.biome]}
                      {row ? ` · ${row.name} · ${row.levelMin}–${row.levelMax}` : ''}
                      {d.comingSoon ? ' · Coming soon' : ''}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-parchment/80">{encounterNames}</p>
                  {entry && d.entry && (
                    <p className="mt-1 text-xs text-parchment/70">
                      Entry: {entry.name} ×{need} ({have}/{need})
                      {haveEntry ? '' : ' (missing)'}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!classId || inCombat || !haveEntry || d.comingSoon}
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
    </PageLayout>
  )
}

function estimatePlayerHp(
  classId: ClassId | null,
  classXp: number,
  skills: Record<TradeSkillId, SkillProgress>,
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
  const skills = useGameStore((state) => state.skills)
  const renown = useGameStore((state) => state.renown)
  const classId = useGameStore((state) => state.classId)
  const secondaryClassId = useGameStore((state) => state.secondaryClassId)
  const questProgress = useGameStore((state) => state.questProgress)
  const viewer = { skills, renown, classId, secondaryClassId, questProgress }
  const avgDamage = monster.attacks.reduce((sum, attack) => sum + averageDamage(attack.damage), 0)
  const hint = difficultyHint({
    playerToHitBonus: toHit,
    monsterAc: monster.ac,
    playerHp: playerHpEstimate,
    monsterAvgDamagePerInterval: avgDamage,
  })
  const badge = difficultyBadge(hint, hitChance(toHit, monster.ac), playerHpEstimate, avgDamage)
  const archetype = archetypeLine(monster.archetype)

  return (
    <Card selected={highlighted} className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-card text-gold">{monster.name}</h3>
          <Chip>CR {formatCr(monster.cr)}</Chip>
          <Chip>AC {monster.ac}</Chip>
          <Chip>HP {monster.hp}</Chip>
          <Badge tone={badge.tone}>{badge.label}</Badge>
          {archetype && (
            <Tooltip content={TRIANGLE_TIP}>
              <Chip tone="gold">{archetype.name}</Chip>
            </Tooltip>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {monster.lootTable.length === 0 && <span className="text-meta text-muted">No drops</span>}
          {monster.lootTable.map((entry) => {
            const gates = dropsFor(entry.itemId)
            const chance = entry.chance < 1 ? `${Math.round(entry.chance * 100)}%` : undefined
            const gated = gates.length
              ? `Drops for: ${gates.map((gate) => `${maskCraftLabel(gate.skill, gate.name, viewer)} (${gate.skill})`).join(', ')}`
              : undefined
            return (
              <ItemChip
                key={entry.itemId}
                name={getItem(entry.itemId)?.name ?? entry.itemId}
                note={[chance, gated].filter(Boolean).join(' · ') || undefined}
              />
            )
          })}
        </div>
      </button>
      <Button
        size="sm"
        variant="danger"
                disabled={disabled}
                disabledReason={disabled ? 'Cannot start a fight right now' : undefined}
        onClick={onFight}
      >
        Fight
      </Button>
    </Card>
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

const TRIANGLE_TIP =
  'Armored is weak to Magic and resists Ranged. Skirmisher is weak to Ranged and resists Melee. Warded is weak to Melee and resists Magic.'

function archetypeLine(archetype: MonsterDef['archetype']): { name: string } | null {
  if (archetype === 'armored') return { name: 'Armored' }
  if (archetype === 'skirmisher') return { name: 'Skirmisher' }
  if (archetype === 'warded') return { name: 'Warded' }
  return null
}

function foodLine(
  name: string,
  summary: { foodPerHour: number; hoursUntilEmpty: number; count: number },
): string {
  return `Food vs ${name}: ~${Math.round(summary.foodPerHour)}/hr · ${summary.count} owned · ${formatFoodWait(summary.hoursUntilEmpty)}`
}

function formatFoodWait(hours: number): string {
  if (!(hours > 0) || !Number.isFinite(hours)) return '—'
  const minutes = Math.round(hours * 60)
  if (minutes < 90) return `~${Math.max(1, minutes)} min`
  return `~${hours.toFixed(1)} hr`
}

function logTone(line: string): string {
  const text = line.toLowerCase()
  if (text.startsWith('lair action:') || text.startsWith('bounty:')) return 'text-rarity-rare'
  if (text.startsWith('eat ') || text.startsWith('no food')) return 'text-ability-con'
  if (text.includes('(crit)')) return 'text-gold'
  if (text.startsWith('cast ')) return 'text-ability-int'
  if (text.includes('heal')) return 'text-sage'
  if (text.includes('misses')) return 'text-muted'
  return 'text-parchment'
}

function CombatLog({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  useEffect(() => {
    const el = ref.current
    if (!el || !stick.current) return
    el.scrollTop = el.scrollHeight
  }, [lines])
  return (
    <div
      ref={ref}
      onScroll={() => {
        const el = ref.current
        if (!el) return
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32
      }}
      className="max-h-[28rem] space-y-1 overflow-auto font-mono text-meta leading-relaxed"
    >
      {lines.length === 0 ? (
        <p className="text-muted">Waiting for the first interval…</p>
      ) : (
        lines.map((line, index) => (
          <p key={`${index}-${line.slice(0, 12)}`} className={logTone(line)}>
            {line}
          </p>
        ))
      )}
    </div>
  )
}

function MatchupPanel({
  monster,
  classId,
  skills,
  equipment,
  classXp,
  inventory,
  spellLoadout,
  knownSpellIds,
  bestiaries,
  foodSummary,
}: {
  monster: MonsterDef | null
  classId: ClassId | null
  skills: Record<TradeSkillId, SkillProgress>
  equipment: Equipment
  classXp: number
  inventory: Inventory
  spellLoadout?: SpellLoadout
  knownSpellIds?: readonly string[]
  bestiaries?: Bestiaries
  foodSummary: { foodPerHour: number; hoursUntilEmpty: number; count: number } | null
}) {
  const stats =
    classId && monster
      ? computeCombatStats(
          { skills, equipment, classId, classXp, inventory, spellLoadout, bestiaries, knownSpellIds },
          monster,
        )
      : null
  const matchup = stats?.matchup
  return (
    <Card className="space-y-2">
      <h3 className="text-card text-gold">{monster ? monster.name : 'Matchup'}</h3>
      {matchup ? (
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Your hit" value={`${Math.round(matchup.yourHitChance.value * 100)}%`} />
          <StatTile label="Their hit" value={`${Math.round(matchup.itsHitChance.value * 100)}%`} />
          <StatTile label="Your DPS" value={matchup.yourDps.value.toFixed(1)} />
          <StatTile label="Their DPS" value={matchup.itsDps.value.toFixed(1)} />
          <StatTile label="Time to kill" value={`${matchup.timeToKillSec.value.toFixed(1)}s`} />
          <StatTile label="Triangle" value={`×${matchup.triangleMultiplier}`} />
        </div>
      ) : (
        <p className="text-meta text-muted">Select a monster.</p>
      )}
      <p className="text-body text-parchment">
        {foodSummary && monster ? foodLine(monster.name, foodSummary) : 'No food equipped'}
      </p>
    </Card>
  )
}
