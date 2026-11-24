import { useEffect, useMemo, useState } from 'react'
import { getClass } from '../../data/classes'
import { BESTIARY_TYPES } from '../../data/historyContent'
import { getItem, type ItemId } from '../../data/items'
import { getMonster } from '../../data/monsters'
import { getShopUpgrade, type OwnedUpgrades } from '../../data/shop'
import { CHECK_SKILLS } from '../../data/checkSkills'
import { getSkill, SKILLS, type TradeSkillId } from '../../data/skills'
import { checkModifier, formatCheck } from '../../engine/checks'
import { getSpell, spellsForClass, type SpellId } from '../../data/spells'
import { ladderPerksFor, perRankPerkFor } from '../../data/abilityPerks'
import { ProgressBar } from '../../components/ProgressBar'
import { CombatStatsPanel } from '../../components/CombatStatsPanel'
import { ItemDetail } from '../../components/ItemDetail'
import { PaperDoll } from '../../components/PaperDoll'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageLayout } from '../../components/ui/PageLayout'
import { SubHeading } from '../../components/ui/SectionHeading'
import { StatTile } from '../../components/ui/StatTile'
import { TabPanel, Tabs } from '../../components/ui/Tabs'
import { cx } from '../../components/ui/format'
import { useUiPrefs } from '../../store/uiPrefs'
import { activePerks, deriveAbilities, type DerivedAbility } from '../../engine/abilities'
import { computeCombatStats, type StatBreakdown } from '../../engine/combatStats'
import { type EquipmentSlot } from '../../engine/equipment'
import { sourcesOf, type ItemLink } from '../../engine/itemIndex'
import type { Bestiaries, Tomes } from '../../engine/history'
import type { Inventory } from '../../engine/inventory'
import { ECHO_XP_PCT } from '../../engine/config'
import {
  componentCostForCast,
  effectiveCasterType,
  hasComponents,
  knownSpellsForClasses,
  missingComponentName,
  slotsFor,
  spellFitsSlot,
  spellOwnerClass,
  unlockSkillFor,
  unlockSkillLevel,
} from '../../engine/spells'
import { levelForXp, progressToNext, tier } from '../../engine/xp'
import { useGameStore } from '../../store/gameStore'
import type { AbilityAbbr, SkillProgress } from '../../types/game'
import type { PageFocus } from '../pageFocus'

const TABS = ['overview', 'abilities', 'equipment', 'spellbook', 'bonuses'] as const
type Tab = (typeof TABS)[number]

const ABILITY_BORDER: Record<AbilityAbbr, string> = {
  STR: 'border-ability-str',
  DEX: 'border-ability-dex',
  CON: 'border-ability-con',
  INT: 'border-ability-int',
  WIS: 'border-ability-wis',
  CHA: 'border-ability-cha',
}
const ABILITY_TEXT: Record<AbilityAbbr, string> = {
  STR: 'text-ability-str',
  DEX: 'text-ability-dex',
  CON: 'text-ability-con',
  INT: 'text-ability-int',
  WIS: 'text-ability-wis',
  CHA: 'text-ability-cha',
}
const ABILITY_BAR: Record<AbilityAbbr, string> = {
  STR: 'bg-ability-str',
  DEX: 'bg-ability-dex',
  CON: 'bg-ability-con',
  INT: 'bg-ability-int',
  WIS: 'bg-ability-wis',
  CHA: 'bg-ability-cha',
}

interface CharacterPageProps {
  focus?: { kind: 'spell'; spellId: string } | null
  onFocusConsumed?: () => void
  onNavigate?: (page: string, focus?: PageFocus) => void
}

export function CharacterPage({
  focus = null,
  onFocusConsumed,
  onNavigate,
}: CharacterPageProps) {
  const characterName = useGameStore((state) => state.characterName)
  const skills = useGameStore((state) => state.skills)
  const classId = useGameStore((state) => state.classId)
  const classXp = useGameStore((state) => state.classXp)
  const secondaryClassId = useGameStore((state) => state.secondaryClassId)
  const secondaryClassXp = useGameStore((state) => state.secondaryClassXp)
  const echoes = useGameStore((state) => state.echoes)
  const clericFocus = useGameStore((state) => state.clericFocus)
  const isInDungeonOrQuest = useGameStore((state) => state.isInDungeonOrQuest)
  const equipment = useGameStore((state) => state.equipment)
  const inventory = useGameStore((state) => state.inventory)
  const spellLoadouts = useGameStore((state) => state.spellLoadouts)
  const setSpellSlot = useGameStore((state) => state.setSpellSlot)
  const unequipSlot = useGameStore((state) => state.unequipSlot)
  const equipItem = useGameStore((state) => state.equipItem)
  const tomes = useGameStore((state) => state.tomes)
  const bestiaries = useGameStore((state) => state.bestiaries)
  const upgrades = useGameStore((state) => state.upgrades)
  const savedTab = useUiPrefs((state) => state.lastTab.character)
  const setLastTab = useUiPrefs((state) => state.setLastTab)
  const [pickedTab, setPickedTab] = useState<Tab | null>(null)
  const [highlightSpellId, setHighlightSpellId] = useState<string | null>(null)
  const [detailSlot, setDetailSlot] = useState<EquipmentSlot | null>(null)

  useEffect(() => {
    if (!focus) return
    setPickedTab('spellbook')
    setLastTab('character', 'spellbook')
    setHighlightSpellId(focus.spellId)
    onFocusConsumed?.()
  }, [focus, onFocusConsumed, setLastTab])

  const abilities = deriveAbilities(skills)
  const active = classId ? getClass(classId) : null
  const secondary = secondaryClassId ? getClass(secondaryClassId) : null
  const activeLevel = levelForXp(classXp)
  const secondaryLevel = secondaryClassId ? levelForXp(secondaryClassXp) : null
  const activeProgress = progressToNext(classXp)
  const classTier = tier(activeLevel)
  const detailItemId = (detailSlot ? equipment[detailSlot] : null) as ItemId | null

  const unlockSkillId = classId ? unlockSkillFor(classId) : null
  const unlockLevel = unlockSkillId ? levelForXp(skills[unlockSkillId]?.xp ?? 0) : 0
  const secondaryUnlockId = secondaryClassId ? unlockSkillFor(secondaryClassId) : null
  const secondaryUnlockLevel = secondaryUnlockId
    ? levelForXp(skills[secondaryUnlockId]?.xp ?? 0)
    : 0
  const casterType = classId ? effectiveCasterType(classId) : null
  const slotStructure = useMemo(
    () => (casterType ? slotsFor(casterType, classTier) : []),
    [casterType, classTier],
  )
  const classSpells = useMemo(() => {
    if (!classId) return []
    const primary = spellsForClass(classId)
    if (!secondaryClassId) return primary
    const secondarySpells = spellsForClass(secondaryClassId)
    const seen = new Set(primary.map((spell) => spell.id))
    return [...primary, ...secondarySpells.filter((spell) => !seen.has(spell.id))]
  }, [classId, secondaryClassId])
  const knownIds = useMemo(() => {
    if (!classId) return new Set<string>()
    return new Set(knownSpellsForClasses(classId, secondaryClassId, skills).map((spell) => spell.id))
  }, [classId, secondaryClassId, skills])
  const loadout = classId ? spellLoadouts[classId] : undefined

  function openLink(link: ItemLink) {
    if (!onNavigate) return
    if (link.kind === 'activity') {
      onNavigate(link.skillId, { kind: 'activity', skillId: link.skillId, activityId: link.activityId })
      return
    }
    if (link.kind === 'monster') {
      const monster = getMonster(link.monsterId)
      const biome = monster?.biomes[0]
      if (!biome) return
      onNavigate('monsterHunting', { kind: 'monster', monsterId: link.monsterId, biome })
      return
    }
    if (link.kind === 'dungeon') {
      onNavigate('monsterHunting', { kind: 'dungeon', dungeonId: link.dungeonId })
      return
    }
    if (link.kind === 'spell') {
      onNavigate('character', { kind: 'spell', spellId: link.spellId })
      return
    }
    if (link.kind === 'shop') {
      onNavigate('shop')
      return
    }
    if (link.kind === 'quest') {
      onNavigate('mile-camp', { kind: 'quest', questId: link.questId })
      return
    }
    if (link.kind === 'combat') {
      onNavigate('monsterHunting')
    }
  }

  function slotWarning(spellId: SpellId | null, slotLevel: number): string | null {
    if (!classId || !spellId) return null
    const spell = getSpell(spellId)
    if (!spell) return null
    const cost = componentCostForCast({ spell, classId })
    if (hasComponents(inventory, cost)) return null
    const missing = missingComponentName(inventory, cost) ?? 'components'
    if (slotLevel === 0) return `Out of ${missing}: will attack with the main hand`
    const cantrip = getSpell(
      (loadout?.slots[0] ?? classSpells.find((entry) => entry.level === 0)?.id) as SpellId,
    )
    if (!cantrip) return `Out of ${missing}: will attack with the main hand`
    const cantripCost = componentCostForCast({ spell: cantrip, classId })
    if (!hasComponents(inventory, cantripCost)) {
      const cantripMissing = missingComponentName(inventory, cantripCost) ?? 'components'
      return `Out of ${missing}: will cast ${cantrip.name} — also out of ${cantripMissing}: will attack with the main hand`
    }
    return `Out of ${missing}: will cast ${cantrip.name}`
  }

  const showSpells = Boolean(casterType || classSpells.length > 0)
  const tabItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'abilities', label: 'Abilities' },
    { id: 'equipment', label: 'Equipment' },
    ...(showSpells ? [{ id: 'spellbook', label: 'Spellbook' }] : []),
    { id: 'bonuses', label: 'Bonuses' },
  ]
  const remembered = savedTab === 'gear' ? 'equipment' : savedTab
  const tab: Tab =
    pickedTab && tabItems.some((entry) => entry.id === pickedTab)
      ? pickedTab
      : remembered && tabItems.some((entry) => entry.id === remembered)
        ? (remembered as Tab)
        : 'overview'

  useEffect(() => {
    if (!highlightSpellId || tab !== 'spellbook') return
    document.getElementById(`spell-${highlightSpellId}`)?.scrollIntoView({ block: 'nearest' })
  }, [highlightSpellId, tab])

  function chooseTab(next: string) {
    if (!(TABS as readonly string[]).includes(next)) return
    setPickedTab(next as Tab)
    setLastTab('character', next)
  }

  const combat = classId
    ? computeCombatStats({
        skills,
        equipment,
        classId,
        classXp,
        inventory,
        spellLoadout: loadout,
        bestiaries,
      })
    : null

  return (
    <PageLayout
      side={
        tab === 'equipment' ? (
          <div className="rounded-lg border border-line bg-panel p-3">
            <ItemDetail
              itemId={detailItemId}
              owned={detailItemId ? 1 : 0}
              equipment={equipment}
              inventory={inventory}
              skills={skills}
              classXp={classXp}
              classId={classId}
              isInDungeonOrQuest={isInDungeonOrQuest}
              mode="worn"
              emptyLabel="Click a worn item"
              onUnequip={() => {
                if (!detailSlot) return
                unequipSlot(detailSlot)
                setDetailSlot(null)
              }}
            />
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <Tabs name="character" label="Character" tabs={tabItems} value={tab} onChange={chooseTab} />
        <TabPanel name="character" id={tab} active>
          {tab === 'overview' && (
            <Card className="space-y-4">
              <div>
                <h2 className="text-page font-bold text-gold">{characterName}</h2>
                <p className="text-body text-parchment">
                  {active ? `${active.name} · Level ${activeLevel} · Tier ${classTier}` : 'No class'}
                </p>
              </div>
              <ProgressBar progress={activeProgress.progress} label="Class experience" />
              <p className="text-meta text-muted">
                {active ? `Primary ${active.name} ${activeLevel}` : 'No class'}
                {secondary && secondaryLevel != null ? ` · Secondary ${secondary.name} ${secondaryLevel}` : ''}
                {echoes > 0 ? ` · Echo ${echoes} (+${echoes * ECHO_XP_PCT}% XP)` : ''}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <StatTile label="HP" value={combat ? combat.maxHp.value : '—'} breakdown={combat ? statTip(combat.maxHp) : undefined} />
                <StatTile label="AC" value={combat ? combat.ac.value : '—'} breakdown={combat ? statTip(combat.ac) : undefined} />
              </div>
              <div className="grid grid-cols-3 gap-2 min-[1100px]:grid-cols-6">
                {abilities.map((ability) => (
                  <div
                    key={ability.abbr}
                    className={cx('rounded-md border bg-ink px-2 py-1.5 text-center', ABILITY_BORDER[ability.abbr])}
                  >
                    <div className={cx('text-meta font-semibold', ABILITY_TEXT[ability.abbr])}>{ability.abbr}</div>
                    <div className="text-card text-parchment">{ability.score}</div>
                    <div className="text-meta text-muted">
                      {ability.modifier >= 0 ? `+${ability.modifier}` : ability.modifier}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-line pt-3">
                <SubHeading title="Checks" />
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {CHECK_SKILLS.map((check) => {
                    const mod = checkModifier(
                      { skills, classId, classXp },
                      check.id,
                    )
                    return (
                      <li key={check.id} className="flex items-center justify-between gap-2 text-meta">
                        <span className="text-parchment">{formatCheck(mod)}</span>
                        {mod.proficient && (
                          <span className="rounded bg-sage/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sage">
                            Proficient
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
              {active && (
                <div className="space-y-2 border-t border-line pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <StatTile label="Hit Die" value={`1d${active.hitDie}`} />
                    <StatTile label="Saves" value={active.saveProficiencies.join(', ')} />
                  </div>
                  <p className="text-body font-semibold text-parchment">{active.signatureAbility.name}</p>
                  <p className="text-meta text-muted">{active.signatureAbility.description}</p>
                  {active.id === 'cleric' && <p className="text-meta text-sage">Focus {clericFocus}</p>}
                </div>
              )}
            </Card>
          )}

          {tab === 'abilities' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1100px]:grid-cols-3">
              {abilities.map((ability) => (
                <AbilityCard key={ability.id} ability={ability} />
              ))}
            </div>
          )}

          {tab === 'equipment' && (
            <div className="space-y-4">
              {isInDungeonOrQuest && (
                <p className="text-meta text-muted">Swapping is locked in a dungeon or quest.</p>
              )}
              <div className="grid items-start gap-4 min-[1200px]:grid-cols-[auto_minmax(0,1fr)]">
                <PaperDoll
                  equipment={equipment}
                  inventory={inventory}
                  classXp={classXp}
                  locked={isInDungeonOrQuest}
                  onSelectWorn={setDetailSlot}
                  onEquip={equipItem}
                />
                <div className="space-y-4">
                  <CombatStatsPanel
                    skills={skills}
                    equipment={equipment}
                    classId={classId}
                    classXp={classXp}
                    inventory={inventory}
                    spellLoadout={loadout}
                    bestiaries={bestiaries}
                  />
                </div>
              </div>
            </div>
          )}

      {tab === 'spellbook' && (
        <section className="rounded-lg border border-brown/40 bg-panel p-5 shadow-lg">
          <h3 className="mb-3 font-bold text-gold">Spellbook</h3>
          {!classId || (casterType == null && classSpells.length === 0) ? (
            <p className="text-sm text-parchment/70">This class has no spells.</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-sage">
                Unlock skill: {unlockSkillId ? getSkill(unlockSkillId).name : '—'} level {unlockLevel}
                {secondaryUnlockId
                  ? ` · Secondary: ${getSkill(secondaryUnlockId).name} level ${secondaryUnlockLevel}`
                  : ''}
              </p>

              {casterType && (
                <>
                  <h4 className="mb-2 font-semibold text-sage">Slot loadout</h4>
                  <ul className="mb-6 space-y-2">
                    {slotStructure.map((slot, index) => {
                      const selected = loadout?.slots[index] ?? null
                      const options = classSpells.filter(
                        (spell) => spellFitsSlot(spell, slot.level) && knownIds.has(spell.id),
                      )
                      const owner = selected
                        ? spellOwnerClass(selected, classId, secondaryClassId)
                        : classId
                      const warning = slotWarning(selected, slot.level)
                      return (
                        <li
                          key={`${slot.level}-${index}`}
                          className="flex flex-col gap-1 rounded-md bg-ink/40 px-3 py-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="w-28 text-sage">
                              {slot.level === 0 ? 'Cantrip' : `Slot ${slot.level}`}
                            </span>
                            <select
                              value={selected ?? ''}
                              onChange={(event) => {
                                const value = event.target.value
                                setSpellSlot(classId, index, value ? (value as SpellId) : null)
                              }}
                              className="min-w-[12rem] rounded-lg border border-brown/40 bg-ink/50 px-2 py-1 text-parchment"
                            >
                              <option value="">Empty</option>
                              {options.map((spell) => (
                                <option key={spell.id} value={spell.id}>
                                  {spell.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {warning && <p className="text-xs text-crimson">{warning}</p>}
                          {selected && owner !== classId && (
                            <p className="text-xs text-parchment/50">From {getClass(owner).name}</p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}

              <h4 className="mb-2 font-semibold text-sage">Known & locked</h4>
              <ul className="space-y-2 text-sm">
                {classSpells.map((spell) => {
                  const owner = spellOwnerClass(spell.id as SpellId, classId, secondaryClassId)
                  const ownerUnlock = unlockSkillFor(owner)
                  const ownerLevel = ownerUnlock ? levelForXp(skills[ownerUnlock]?.xp ?? 0) : 0
                  const need = unlockSkillLevel(spell.level)
                  const known = ownerLevel >= need
                  const cost = componentCostForCast({ spell, classId: owner })
                  return (
                    <li
                      key={spell.id}
                      id={`spell-${spell.id}`}
                      className={`rounded px-3 py-2 ${
                        highlightSpellId === spell.id ? 'bg-gold/20 ring-1 ring-gold' : 'bg-ink/30'
                      }`}
                    >
                      <div className="flex justify-between gap-2">
                        <span>
                          {spell.name}{' '}
                          <span className="text-sage">
                            (L{spell.level === 0 ? '0 cantrip' : spell.level}
                            {owner !== classId ? ` · ${getClass(owner).name}` : ''})
                          </span>
                        </span>
                        <span className={known ? 'text-sage' : 'text-parchment/50'}>
                          {known ? 'Known' : `Unlocks at ${need}`}
                        </span>
                      </div>
                      <ComponentLines cost={cost} inventory={inventory} onOpenLink={openLink} />
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>
      )}

          {tab === 'bonuses' && (
            <Bonuses
              skills={skills}
              tomes={tomes}
              bestiaries={bestiaries}
              upgrades={upgrades}
              echoes={echoes}
            />
          )}
        </TabPanel>
      </div>
    </PageLayout>
  )
}


function statTip(stat: StatBreakdown): string {
  if (stat.parts.length === 0) return String(stat.value)
  return `${stat.value} = ${stat.parts.map((part) => `${part.label} ${part.value}`).join(' · ')}`
}

function AbilityCard({ ability }: { ability: DerivedAbility }) {
  const [open, setOpen] = useState(false)
  const ladder = ladderPerksFor(ability.abbr)
  const earned = ladder.filter((perk) => ability.rank >= perk.rank)
  const upcoming = ladder.filter((perk) => ability.rank < perk.rank)
  const next = upcoming[0]
  const later = upcoming.slice(1)
  const perRank = perRankPerkFor(ability.abbr)
  const modifier = ability.modifier >= 0 ? `+${ability.modifier}` : String(ability.modifier)
  return (
    <Card className="relative">
      <span className={cx('absolute inset-y-0 left-0 w-1', ABILITY_BAR[ability.abbr])} aria-hidden />
      <div className="flex items-baseline justify-between gap-2">
        <span className={cx('text-section font-bold', ABILITY_TEXT[ability.abbr])}>{ability.score}</span>
        <span className="text-card text-parchment">{modifier}</span>
      </div>
      <p className="text-meta text-muted">{ability.name}</p>
      <p className="mt-2 text-meta text-muted">Rank {ability.rank}/20</p>
      <ProgressBar
        progress={ability.rankProgress}
        className="mt-1 h-1.5"
        barClassName={ABILITY_BAR[ability.abbr]}
        label={`${ability.name} rank`}
      />
      {perRank && (
        <p className="mt-2 text-meta text-muted">+1% per Rank, now +{ability.rank}%</p>
      )}
      {earned.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-meta text-parchment">
          {earned.map((perk) => (
            <li key={perk.id}>
              R{perk.rank} {perk.name}
            </li>
          ))}
        </ul>
      )}
      {next && (
        <div className="mt-2 rounded px-2 py-1.5 ring-1 ring-gold">
          <p className="text-meta font-semibold text-gold">
            R{next.rank} {next.name}
          </p>
          <p className="text-meta text-parchment">{next.description}</p>
        </div>
      )}
      {later.length > 0 && (
        <div className="mt-1">
          <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? 'Hide' : `+${later.length} more`}
          </Button>
          {open && (
            <ul className="space-y-0.5 text-meta text-muted">
              {later.map((perk) => (
                <li key={perk.id}>
                  R{perk.rank} {perk.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

function Bonuses({
  skills,
  tomes,
  bestiaries,
  upgrades,
  echoes,
}: {
  skills: Record<TradeSkillId, SkillProgress>
  tomes: Tomes
  bestiaries: Bestiaries
  upgrades: OwnedUpgrades
  echoes: number
}) {
  const tomeRows = SKILLS.filter((skill) => skill.id !== 'scribing' && (tomes[skill.id] ?? 0) > 0)
  const books = BESTIARY_TYPES.filter((type) => (bestiaries[type] ?? 0) > 0)
  const perks = activePerks({ skills })
  const bought = Object.entries(upgrades).flatMap(([id, index]) => {
    const upgrade = getShopUpgrade(id)
    if (!upgrade || typeof index !== 'number' || index < 0) return []
    const tier = upgrade.tiers[index]
    return [{ id, name: upgrade.name, tier: index + 1, detail: tier?.effect.kind === 'soon' ? 'Coming soon' : null }]
  })
  return (
    <Card className="space-y-4">
      <div>
        <SubHeading title="History tomes" />
        {tomeRows.length === 0 ? (
          <p className="text-meta text-muted">None yet</p>
        ) : (
          <ul className="space-y-1 text-body text-parchment">
            {tomeRows.map((skill) => {
              const volumes = tomes[skill.id] ?? 0
              const extras = [volumes >= 5 ? '−5% interval' : null, volumes >= 10 ? '+1 check' : null].filter(Boolean)
              return (
                <li key={skill.id}>
                  {skill.name} Vol. {volumes} (+{Math.min(volumes, 10)}% XP
                  {extras.length ? `; ${extras.join(', ')}` : ''})
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div>
        <SubHeading title="Bestiaries" />
        {books.length === 0 ? (
          <p className="text-meta text-muted">None yet</p>
        ) : (
          <ul className="space-y-1 text-body text-parchment">
            {books.map((type) => (
              <li key={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)} Vol. {bestiaries[type]} (+{bestiaries[type]} to hit)
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <SubHeading title="Ability perks" />
        {perks.length === 0 ? (
          <p className="text-meta text-muted">None yet</p>
        ) : (
          <ul className="space-y-1 text-body text-parchment">
            {perks.map((perk) => (
              <li key={perk.id}>
                {perk.ability} R{perk.rank} {perk.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <SubHeading title="Shop upgrades" />
        {bought.length === 0 ? (
          <p className="text-meta text-muted">None yet</p>
        ) : (
          <ul className="space-y-1 text-body text-parchment">
            {bought.map((upgrade) => (
              <li key={upgrade.id}>
                {upgrade.name} tier {upgrade.tier}
                {upgrade.detail ? ` · ${upgrade.detail}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <SubHeading title="Echo" />
        {echoes > 0 ? (
          <p className="text-body text-parchment">
            Echo {echoes} (+{echoes * ECHO_XP_PCT}% XP)
          </p>
        ) : (
          <p className="text-meta text-muted">No Echo yet.</p>
        )}
      </div>
    </Card>
  )
}

function ComponentLines({
  cost,
  inventory,
  onOpenLink,
}: {
  cost: ReturnType<typeof componentCostForCast>
  inventory: Inventory
  onOpenLink: (link: ItemLink) => void
}) {
  if (cost.length === 0) {
    return <p className="mt-1 text-xs text-parchment/50">No components</p>
  }
  return (
    <ul className="mt-1 space-y-1 text-xs text-parchment/80">
      {cost.map((stack) => {
        const owned = inventory[stack.itemId] ?? 0
        const name = getItem(stack.itemId)?.name ?? stack.itemId
        const sources = sourcesOf(stack.itemId)
        return (
          <li key={stack.itemId}>
            <span className={owned >= stack.quantity ? 'text-sage' : 'text-crimson'}>
              {name} ×{stack.quantity} (own {owned})
            </span>
            {sources.length > 0 && (
              <span className="ml-2 text-parchment/50">
                from{' '}
                {sources.slice(0, 3).map((link, index) => (
                  <button
                    key={`${link.kind}-${link.label}-${index}`}
                    type="button"
                    onClick={() => onOpenLink(link)}
                    className="mr-1 text-gold underline-offset-2 hover:underline"
                  >
                    {link.label}
                  </button>
                ))}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
