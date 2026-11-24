import { useEffect, useState } from 'react'
import { BIOME_LABELS, getMonster, type BiomeId } from '../../data/monsters'
import { LODGE_OFFERS } from '../../data/lodge'
import { BOUNTY_REFRESH_MS } from '../../engine/config'
import { lodgeOfferLocked, renownProgress, renownRank, rewardLabel, unlockedHuntBiomes } from '../../engine/bounties'
import { MONSTER_MOD_LABEL } from '../../engine/combat/monsterMods'
import { useGameStore } from '../../store/gameStore'
import { Badge, Chip } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ProgressBar } from '../../components/ProgressBar'

export function BountyBoard() {
  const board = useGameStore((state) => state.bountyBoard)
  const marks = useGameStore((state) => state.marks)
  const marksLifetime = useGameStore((state) => state.marksLifetime)
  const extraBoard = useGameStore((state) => state.extraBoardSlot)
  const extraActive = useGameStore((state) => state.extraActiveContract)
  const accept = useGameStore((state) => state.acceptContract)
  const reroll = useGameStore((state) => state.rerollBounties)
  const refresh = useGameStore((state) => state.refreshBountyBoard)
  const buy = useGameStore((state) => state.buyLodgeOffer)
  const [now, setNow] = useState(() => Date.now())
  const [bait, setBait] = useState<BiomeId>('forest')
  const biomes = unlockedHuntBiomes()
  const rank = renownRank(marksLifetime)
  const progress = renownProgress(marksLifetime)

  useEffect(() => {
    refresh()
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const refreshIn = Math.max(0, BOUNTY_REFRESH_MS - (now - board.refreshedAt))

  return (
    <section className="space-y-4">
      <Card className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-card text-gold">Hunter's Lodge · Renown {progress.rank}</h3>
          <span className="text-meta text-muted">{marks} Marks</span>
        </div>
        <ProgressBar
          progress={progress.span > 0 ? (progress.into / progress.span) * 100 : 100}
          label={progress.next == null ? 'Renown 10' : `${progress.into}/${progress.span} to Renown ${progress.rank + 1}`}
        />
        <p className="text-meta text-muted">Board refreshes in {formatMs(refreshIn)}.</p>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {board.offers.map((offer) => {
          const monster = getMonster(offer.monsterId)
          return (
            <Card key={offer.id} className="space-y-2">
              <div className="flex flex-wrap gap-1">
                <Badge tone={offer.kind === 'bounty' ? 'rare' : 'gold'}>{offer.kind === 'bounty' ? 'Bounty' : 'Cull'}</Badge>
                <Chip>{BIOME_LABELS[offer.biome]}</Chip>
                <Chip>Tier {offer.tier}</Chip>
              </div>
              <h4 className="text-card text-parchment">{offer.kind === 'bounty' ? offer.name : monster?.name}</h4>
              <p className="text-body text-muted">
                {offer.kind === 'cull' ? `Kill ${offer.need}` : offer.modifiers.map((mod) => MONSTER_MOD_LABEL[mod]).join(', ')}
              </p>
              <p className="text-meta text-gold">
                {offer.marks} Marks{offer.kind === 'bounty' && offer.reward.kind !== 'none' ? ` · ${rewardLabel(offer.reward)}` : ''}
              </p>
              <Button size="sm" onClick={() => accept(offer.id)}>
                Accept
              </Button>
            </Card>
          )
        })}
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-card text-gold">Lodge shop</h3>
          <Button size="sm" variant="secondary" disabled={marks < 5} disabledReason="Need 5 Marks" onClick={() => reroll()}>
            Reroll
          </Button>
        </div>
        {board.baitBiome && <p className="text-meta text-sage">Bait set: next Bounty targets {BIOME_LABELS[board.baitBiome]}.</p>}
        <div className="grid gap-2">
          {LODGE_OFFERS.filter((offer) => offer.kind !== 'reroll').map((offer) => {
            const lock = lodgeOfferLocked(offer, rank)
            const owned =
              (offer.kind === 'board' && extraBoard) || (offer.kind === 'active' && extraActive)
            const free = offer.kind === 'bait' && board.baitCharges > 0
            return (
              <div key={offer.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2">
                <div>
                  <p className="text-body text-parchment">
                    {offer.name} <span className="text-meta text-muted">{free ? 'free charge' : `${offer.marks} Marks`}</span>
                  </p>
                  <p className="text-meta text-muted">{offer.detail}</p>
                  {lock && <p className="text-meta text-lack">{lock}</p>}
                </div>
                {offer.kind === 'bait' && (
                  <select
                    aria-label="Bait biome"
                    className="rounded border border-line bg-ink px-2 py-1 text-body"
                    value={bait}
                    onChange={(event) => setBait(event.target.value as BiomeId)}
                  >
                    {biomes.map((biome) => (
                      <option key={biome} value={biome}>
                        {BIOME_LABELS[biome]}
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  size="sm"
                  disabled={!!lock || owned || (!free && marks < offer.marks)}
                  disabledReason={lock ?? (owned ? 'Already owned' : 'Not enough Marks')}
                  onClick={() => buy(offer.id, offer.kind === 'bait' ? bait : undefined)}
                >
                  Buy
                </Button>
              </div>
            )
          })}
        </div>
      </Card>
    </section>
  )
}

function formatMs(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
