import { expect, test } from 'vitest'
import { LAIRS } from '../data/lairs'
import { getMonster } from '../data/monsters'
import { initialSkillProgress } from '../data/skills'
import { abandonContract, buyLodge, emptyBountyBoard, generateOffers, noteCullKill, refreshBountyBoard, renownRank, type ActiveContract } from './bounties'
import { advanceCombat, createFight } from './combat'
import { dueLairActions, resolveLairActions } from './combat/lairActions'
import { modifiedAc } from './combat/monsterMods'
import { BOUNTY_REFRESH_MS, LODGE_TITLE_MARKS, RENOWN_MARKS } from './config'
import { emptyEquipment } from './equipment'
import { mulberry32, type Rng } from './rng'

const skills = initialSkillProgress()

function contract(partial: Partial<ActiveContract> & Pick<ActiveContract, 'id' | 'kind' | 'monsterId'>): ActiveContract {
  return {
    biome: 'forest',
    tier: 1,
    marks: 8,
    need: 2,
    have: 0,
    name: '',
    modifiers: [],
    reward: { kind: 'none' },
    ...partial,
  }
}

test('offers come only from the unlocked biomes', () => {
  const { offers } = generateOffers(mulberry32(1), ['forest'], 3, null)
  expect(offers).toHaveLength(3)
  for (const offer of offers) {
    expect(offer.biome).toBe('forest')
    expect(getMonster(offer.monsterId)?.biomes).toContain('forest')
  }
})

test('the board keeps offers until the refresh interval, including an offline clock', () => {
  const first = refreshBountyBoard(emptyBountyBoard(1_000), 1_000, mulberry32(2), ['forest'])
  const held = refreshBountyBoard(first, 1_000 + BOUNTY_REFRESH_MS - 1, mulberry32(3), ['forest'])
  expect(held.offers.map((offer) => offer.id)).toEqual(first.offers.map((offer) => offer.id))
  const later = refreshBountyBoard(first, 1_000 + BOUNTY_REFRESH_MS, mulberry32(4), ['forest'])
  expect(later.offers.map((offer) => offer.id)).not.toEqual(first.offers.map((offer) => offer.id))
  expect(later.refreshedAt).toBe(1_000 + BOUNTY_REFRESH_MS)
})

test('cull progress counts only the hunted monster and pays when the count is met', () => {
  const cull = contract({ id: 'cull', kind: 'cull', monsterId: 'deer', need: 2, marks: 8 })
  const other = noteCullKill([cull], 'wolf', 'hunt')
  expect(other.marks).toBe(0)
  expect(other.contracts[0]?.have).toBe(0)
  const ignored = noteCullKill([cull], 'deer', 'lair')
  expect(ignored.contracts[0]?.have).toBe(0)
  const mid = noteCullKill([cull], 'deer', 'hunt')
  expect(mid.marks).toBe(0)
  expect(mid.contracts[0]?.have).toBe(1)
  const done = noteCullKill(mid.contracts, 'deer', 'hunt')
  expect(done.marks).toBe(8)
  expect(done.contracts).toEqual([])
})

test('armored raises AC and a 13 misses it', () => {
  const wolf = getMonster('wolf')!
  expect(modifiedAc(wolf, ['armored'])).toBe(15)
  const plain = fightOf('wolf', [])
  const armored = fightOf('wolf', ['armored'])
  const hit = advanceCombat(combatInput(plain, () => 0.52, 8_000))
  const miss = advanceCombat(combatInput(armored, () => 0.52, 8_000))
  expect(hit.fight?.monsterHp).toBeLessThan(wolf.hp)
  expect(miss.fight?.monsterHp).toBe(wolf.hp)
})

test('regenerating heals on the monster interval', () => {
  const ogre = getMonster('ogre')!
  const fight = fightOf('ogre', ['regenerating'])
  fight.playerHp = 500
  fight.playerMaxHp = 500
  fight.monsterHp = fight.monsterMaxHp - 1
  fight.monsterProgressMs = fight.monsterIntervalMs
  fight.playerProgressMs = 1
  fight.playerIntervalMs = 1_000_000
  const result = advanceCombat(combatInput(fight, () => 0.99, 1))
  expect(result.fight?.log.some((line) => line.includes('Regenerating'))).toBe(true)
  expect(result.fight?.monsterHp).toBe(fight.monsterMaxHp)
})

test('defeat drops the bounty contract and abandon drops it too', () => {
  const bounty = contract({
    id: 'named',
    kind: 'bounty',
    monsterId: 'wolf',
    name: 'Grimfang, the Wolf',
    marks: 20,
  })
  expect(abandonContract([bounty], 'named')).toEqual([])
  const fight = fightOf('wolf', [])
  fight.kind = 'bounty'
  fight.contractId = 'named'
  fight.playerHp = 1
  fight.playerIntervalMs = 1_000_000
  const result = advanceCombat({ ...combatInput(fight, () => 0.99, fight.monsterIntervalMs), contracts: [bounty] })
  expect(result.contracts).toEqual([])
  expect(result.lastLog?.some((line) => line.includes('contract is lost'))).toBe(true)
})

test('renown is the lifetime threshold and the lodge refuses a locked purchase', () => {
  expect(renownRank(0)).toBe(0)
  expect(renownRank(RENOWN_MARKS[0]! - 1)).toBe(0)
  expect(renownRank(RENOWN_MARKS[0]!)).toBe(1)
  expect(renownRank(RENOWN_MARKS[RENOWN_MARKS.length - 1]!)).toBe(10)
  const board = emptyBountyBoard()
  const lodge = {
    marks: LODGE_TITLE_MARKS,
    board,
    extraBoard: false,
    extraActive: false,
    inventory: {},
    ownedTitles: [],
    equippedTitleId: null,
  }
  expect(buyLodge(lodge, 'title-cull', 0, mulberry32(1), ['forest'])).toBeNull()
  expect(buyLodge({ ...lodge, marks: LODGE_TITLE_MARKS - 1 }, 'title-cull', 1, mulberry32(1), ['forest'])).toBeNull()
  expect(buyLodge(lodge, 'title-cull', 1, mulberry32(1), ['forest'])?.ownedTitles).toEqual(['the-cull'])
})

test('lair actions fire on their interval and a failed save deals damage', () => {
  const webs = LAIRS[0]!.lairActions
  expect(dueLairActions(webs, 2)).toEqual([])
  expect(dueLairActions(webs, 3).map((action) => action.id)).toEqual(['clinging-webs'])
  const fight = fightOf('spider-matriarch', [])
  fight.kind = 'lair'
  fight.lairId = 'spider-hollow'
  fight.playerHp = 500
  fight.playerMaxHp = 500
  fight.playerProgressMs = 1
  fight.playerIntervalMs = 1000
  fight.monsterIntervalMs = 1_000_000
  fight.monsterProgressMs = 0
  const hunted = advanceCombat(combatInput(fight, () => 0, 20_000))
  expect(hunted.fight?.log.some((line) => line.includes('Clinging Webs'))).toBe(true)

  const rocks = fightOf('ogre-chieftain', [])
  rocks.kind = 'lair'
  rocks.lairId = 'ogres-den'
  rocks.playerIntervalCount = 4
  rocks.playerHp = 40
  const saved = resolveLairActions({
    fight: rocks,
    monster: getMonster('ogre-chieftain')!,
    skills,
    activeClassId: 'fighter',
    classXp: 0,
    rng: () => 0,
    trace: true,
    modifiers: { DEX: 0 },
  })
  expect(saved.defeated).toBe(false)
  expect(rocks.playerHp).toBeLessThan(40)
  expect(rocks.log.some((line) => /Falling Rocks: DEX save \d+ vs 13, failed: \d+ bludgeoning/.test(line))).toBe(true)
})

function fightOf(monsterId: string, mods: ActiveContract['modifiers']) {
  const fight = createFight({
    monsterId,
    biome: 'forest',
    skills,
    equipment: { ...emptyEquipment(), mainHand: 'shortsword' },
    activeClassId: 'fighter',
    classXp: 0,
    rng: mulberry32(1),
    trace: true,
    monsterMods: mods,
  })
  if (!fight) throw new Error(monsterId)
  fight.openingDone = true
  return fight
}

function combatInput(fight: NonNullable<ReturnType<typeof createFight>>, rng: Rng, elapsedMs: number) {
  return {
    fight,
    skills,
    inventory: { shortsword: 1 },
    gold: 0,
    equipment: { ...emptyEquipment(), mainHand: 'shortsword' as const },
    activeClassId: 'fighter' as const,
    classXp: 0,
    elapsedMs,
    rng,
    trace: true,
  }
}
