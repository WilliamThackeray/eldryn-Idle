import { Droplets, Dumbbell, EyeOff, Flame, Heart, Shield, Zap, type LucideIcon } from 'lucide-react'
import { LAIRS, type LairEffect } from '../../data/lairs'
import { getTitle } from '../../data/lodge'
import { getItem } from '../../data/items'
import { BIOME_LABELS, getMonster } from '../../data/monsters'
import { TIER_TABLE, tierRow } from '../../data/tiers'
import { rewardLabel, renownRank } from '../../engine/bounties'
import { MONSTER_MOD_LABEL, type MonsterModId } from '../../engine/combat/monsterMods'
import { useGameStore } from '../../store/gameStore'
import { Badge, Chip } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ItemChip } from '../../components/ui/ItemChip'

const MOD_ICON: Record<MonsterModId, LucideIcon> = {
  frenzied: Zap,
  armored: Shield,
  regenerating: Heart,
  venomous: Droplets,
  enraged: Flame,
  elusive: EyeOff,
  hulking: Dumbbell,
}

function dropMarks(itemId: string): string | undefined {
  const item = getItem(itemId)
  const skill = item?.gear?.stats?.skillCheck
  const skilling = !!skill && Object.values(skill).some((value) => (value ?? 0) > 0)
  const combat = TIER_TABLE.some((row) => row.sources.some((source) => source.id === itemId))
  const note = [skilling ? 'Skilling gear' : null, combat ? 'Combat material' : null].filter(Boolean).join(' · ')
  return note || undefined
}

export function LairsTab() {
  const marksLifetime = useGameStore((state) => state.marksLifetime)
  const classId = useGameStore((state) => state.classId)
  const inCombat = useGameStore((state) => state.activeAction?.kind === 'combat')
  const startLair = useGameStore((state) => state.startLair)
  const rank = renownRank(marksLifetime)

  return (
    <div className="space-y-3">
      {LAIRS.map((lair) => {
        const monster = getMonster(lair.monsterId)
        const row = tierRow(lair.tier)
        const locked =
          (row?.zone.comingSoon ? 'Coming soon' : null) ?? (rank < lair.renownRequired ? `Renown ${lair.renownRequired}` : null)
        return (
          <Card key={lair.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-card text-gold">{lair.name}</h3>
                <span className={row?.color ?? 'text-muted'}>{row?.label}</span>
                <Chip>{BIOME_LABELS[lair.biome]}</Chip>
                {locked ? <Badge tone="hard">{locked}</Badge> : <Badge tone="sage">Open</Badge>}
              </div>
              <Button
                size="sm"
                variant="danger"
                disabled={!!locked || !classId || !!inCombat}
                disabledReason={locked ?? (!classId ? 'Create a character first' : inCombat ? 'Already fighting' : undefined)}
                onClick={() => startLair(lair.id)}
              >
                Fight
              </Button>
            </div>
            {monster && (
              <p className="text-body text-muted">
                {monster.name} · AC {monster.ac} · HP {monster.hp} ·{' '}
                {monster.attacks.map((attack) => `${attack.name} +${attack.toHit} (${attack.damage})`).join(', ')}
              </p>
            )}
            <ul className="space-y-1 text-body">
              {lair.lairActions.map((action) => (
                <li key={action.id}>
                  <span className="text-rarity-rare">{action.name}</span>
                  <span className="text-muted"> · every {action.everyNIntervals} intervals · {effectLine(action.effect)}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1">
              {monster?.lootTable.map((entry) => (
                <ItemChip
                  key={entry.itemId}
                  name={getItem(entry.itemId)?.name ?? entry.itemId}
                  note={[entry.chance < 1 ? `${Math.round(entry.chance * 100)}%` : null, dropMarks(entry.itemId)]
                    .filter(Boolean)
                    .join(' · ') || undefined}
                />
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function effectLine(effect: LairEffect): string {
  if (effect.type === 'slow') return `your next interval +${Math.round(effect.intervalPct * 100)}%`
  if (effect.type === 'damage') return `${effect.save} save DC ${effect.dc} or ${effect.dice} ${effect.damageType}`
  if (effect.type === 'debuff') return `${effect.save} save DC ${effect.dc} or −${effect.toHit} to hit for ${effect.intervals} intervals`
  return `monster gains ${effect.mod}`
}

export function BountiesTab({ onOpenBoard }: { onOpenBoard: () => void }) {
  const contracts = useGameStore((state) => state.contracts)
  const pinned = useGameStore((state) => state.pinnedContractId)
  const inCombat = useGameStore((state) => state.activeAction?.kind === 'combat')
  const classId = useGameStore((state) => state.classId)
  const abandon = useGameStore((state) => state.abandonContract)
  const pin = useGameStore((state) => state.pinContract)
  const hunt = useGameStore((state) => state.startBountyHunt)

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={onOpenBoard}>
          Bounty Board
        </Button>
      </div>
      {contracts.length === 0 && <p className="text-body text-muted">No active contracts. Take one from the board.</p>}
      {contracts.map((contract) => {
        const monster = getMonster(contract.monsterId)
        return (
          <Card key={contract.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={contract.kind === 'bounty' ? 'rare' : 'gold'}>{contract.kind === 'bounty' ? 'Bounty' : 'Cull'}</Badge>
              <h3 className="text-card text-gold">{contract.kind === 'bounty' ? contract.name : monster?.name}</h3>
              <Chip>{BIOME_LABELS[contract.biome]}</Chip>
              <Chip>{contract.marks} Marks</Chip>
            </div>
            {contract.kind === 'cull' ? (
              <p className="text-body">
                {contract.have}/{contract.need} kills
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {contract.modifiers.map((mod) => {
                  const Icon = MOD_ICON[mod]
                  return (
                    <Chip key={mod} tone="rare">
                      <Icon size={12} aria-hidden /> {MONSTER_MOD_LABEL[mod]}
                    </Chip>
                  )
                })}
              </div>
            )}
            {contract.kind === 'bounty' && contract.reward.kind !== 'none' && (
              <p className="text-meta text-muted">
                Reward: {contract.reward.kind === 'title' ? getTitle(contract.reward.titleId)?.name : rewardLabel(contract.reward)}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {contract.kind === 'bounty' && (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={!classId || !!inCombat}
                  disabledReason={!classId ? 'Create a character first' : 'Already fighting'}
                  onClick={() => hunt(contract.id)}
                >
                  Hunt
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => pin(pinned === contract.id ? null : contract.id)}>
                {pinned === contract.id ? 'Unpin' : 'Pin'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => abandon(contract.id)}>
                Abandon
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
