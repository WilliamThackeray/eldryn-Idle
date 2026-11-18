import { useMemo, useState } from 'react'
import { getClass } from '../../data/classes'
import { getItem } from '../../data/items'
import { getSkill } from '../../data/skills'
import { spellsForClass, type SpellId } from '../../data/spells'
import { RARITY_TEXT } from '../../components/rarity'
import { ladderPerksFor, perRankPerkFor } from '../../data/abilityPerks'
import { ProgressBar } from '../../components/ProgressBar'
import { deriveAbilities } from '../../engine/abilities'
import {
  armorClass,
  weaponDamageLabel,
  weaponIntervalBase,
  type EquipmentSlot,
} from '../../engine/equipment'
import {
  effectiveCasterType,
  slotsFor,
  spellFitsSlot,
  unlockSkillFor,
  unlockSkillLevel,
} from '../../engine/spells'
import { levelForXp, progressToNext, tier } from '../../engine/xp'
import { useGameStore } from '../../store/gameStore'

const SLOT_GRID: { slot: EquipmentSlot; label: string }[] = [
  { slot: 'helmet', label: 'Helmet' },
  { slot: 'necklace', label: 'Necklace' },
  { slot: 'cloak', label: 'Cloak' },
  { slot: 'chest', label: 'Chest' },
  { slot: 'mainHand', label: 'Main Hand' },
  { slot: 'offHand', label: 'Off Hand' },
  { slot: 'gauntlets', label: 'Gauntlets' },
  { slot: 'belt', label: 'Belt' },
  { slot: 'chaps', label: 'Chaps' },
  { slot: 'boots', label: 'Boots' },
  { slot: 'ring1', label: 'Ring 1' },
  { slot: 'ring2', label: 'Ring 2' },
  { slot: 'ammo', label: 'Ammo' },
  { slot: 'food', label: 'Food' },
  { slot: 'potion', label: 'Potion' },
  { slot: 'attuned1', label: 'Attuned 1' },
  { slot: 'attuned2', label: 'Attuned 2' },
  { slot: 'attuned3', label: 'Attuned 3' },
  { slot: 'summon1', label: 'Summon 1' },
  { slot: 'summon2', label: 'Summon 2' },
]

type Tab = 'gear' | 'spellbook'

export function CharacterPage() {
  const characterName = useGameStore((state) => state.characterName)
  const skills = useGameStore((state) => state.skills)
  const classId = useGameStore((state) => state.classId)
  const classXp = useGameStore((state) => state.classXp)
  const clericFocus = useGameStore((state) => state.clericFocus)
  const isInDungeonOrQuest = useGameStore((state) => state.isInDungeonOrQuest)
  const equipment = useGameStore((state) => state.equipment)
  const equipmentSets = useGameStore((state) => state.equipmentSets)
  const spellLoadouts = useGameStore((state) => state.spellLoadouts)
  const setSpellSlot = useGameStore((state) => state.setSpellSlot)
  const unequipSlot = useGameStore((state) => state.unequipSlot)
  const saveEquipmentSet = useGameStore((state) => state.saveEquipmentSet)
  const loadEquipmentSet = useGameStore((state) => state.loadEquipmentSet)
  const deleteEquipmentSet = useGameStore((state) => state.deleteEquipmentSet)
  const [setName, setSetName] = useState('')
  const [tab, setTab] = useState<Tab>('gear')

  const abilities = deriveAbilities(skills)
  const dexMod = abilities.find((ability) => ability.abbr === 'DEX')?.modifier ?? 0
  const ac = armorClass(equipment, dexMod)
  const mainHand = equipment.mainHand ? getItem(equipment.mainHand) : undefined
  const damage = weaponDamageLabel(equipment)
  const intervalSec = weaponIntervalBase(mainHand?.gear?.weapon)
  const active = classId ? getClass(classId) : null
  const activeLevel = levelForXp(classXp)
  const activeProgress = progressToNext(classXp)
  const classTier = tier(activeLevel)

  const unlockSkillId = classId ? unlockSkillFor(classId) : null
  const unlockLevel = unlockSkillId ? levelForXp(skills[unlockSkillId]?.xp ?? 0) : 0
  const casterType = classId ? effectiveCasterType(classId) : null
  const slotStructure = useMemo(
    () => (casterType ? slotsFor(casterType, classTier) : []),
    [casterType, classTier],
  )
  const classSpells = classId ? spellsForClass(classId) : []
  const loadout = classId ? spellLoadouts[classId] : undefined

  return (
    <div className="space-y-6 text-parchment">
      <section className="rounded-lg border border-brown/40 bg-panel p-5 shadow-lg">
        <h2 className="mb-1 text-2xl font-bold text-gold">{characterName}</h2>
        {active ? (
          <p className="text-sm text-sage">
            {active.name} · Class Level {activeLevel} · Tier {classTier} ·{' '}
            {activeProgress.capped
              ? `${activeProgress.xp} XP`
              : `${activeProgress.xp} / ${activeProgress.xpToNextLevel} XP`}
          </p>
        ) : (
          <p className="text-sm text-sage">No class selected</p>
        )}
      </section>

      <section className="rounded-lg border border-brown/40 bg-panel p-5 shadow-lg">
        <h3 className="mb-3 font-bold text-gold">Abilities</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {abilities.map((ability) => {
            const ladder = ladderPerksFor(ability.abbr)
            const nextMilestone = ladder.find((perk) => perk.rank > ability.rank)
            const perRank = perRankPerkFor(ability.abbr)
            return (
              <div key={ability.id} className="rounded-md bg-ink/50 px-3 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-xs uppercase tracking-wide text-sage/80">{ability.abbr}</div>
                  <div className="text-xs text-sage">Rank {ability.rank}/20</div>
                </div>
                <div className="font-semibold">
                  {ability.score} ({ability.modifier >= 0 ? `+${ability.modifier}` : ability.modifier})
                </div>
                <div className="mt-2">
                  <ProgressBar
                    progress={ability.rankProgress}
                    className="h-1.5"
                    label={`${ability.abbr} rank progress`}
                  />
                </div>
                {perRank && (
                  <p className="mt-2 text-xs text-parchment/70">
                    +1% per Rank, now +{ability.rank}%
                  </p>
                )}
                <ul className="mt-2 space-y-1">
                  {ladder.map((perk) => {
                    const earned = ability.rank >= perk.rank
                    const next = nextMilestone?.id === perk.id
                    return (
                      <li
                        key={perk.id}
                        className={`rounded px-2 py-1.5 ${
                          earned
                            ? 'bg-sage/20 text-parchment'
                            : next
                              ? 'ring-1 ring-gold/70 text-gold'
                              : 'text-parchment/40'
                        }`}
                      >
                        <div className="text-xs font-semibold">
                          R{perk.rank} {perk.name}
                        </div>
                        <div className="text-[11px] leading-snug opacity-80">{perk.description}</div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {active && (
        <section className="rounded-lg border border-brown/40 bg-panel p-5 shadow-lg">
          <h3 className="mb-3 font-bold text-gold">Class</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Hit Die" value={`1d${active.hitDie}`} />
            <Stat label="Saves" value={active.saveProficiencies.join(', ')} />
          </dl>
          <p className="mt-3 text-sm font-semibold">{active.signatureAbility.name}</p>
          <p className="mt-1 text-sm text-parchment/80">{active.signatureAbility.description}</p>
          {active.id === 'cleric' && (
            <p className="mt-3 text-sm text-sage">Focus {clericFocus}</p>
          )}
        </section>
      )}

      <div className="flex gap-2">
        {(['gear', 'spellbook'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-2 text-sm capitalize ${
              tab === id ? 'bg-crimson text-parchment' : 'bg-panel text-parchment hover:bg-brown'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {tab === 'gear' && (
        <section className="rounded-lg border border-brown/40 bg-panel p-5 shadow-lg">
          <h3 className="mb-3 font-bold text-gold">Equipment</h3>
          {isInDungeonOrQuest && (
            <p className="mb-3 text-sm text-parchment/70">Swapping is locked in a dungeon or quest.</p>
          )}
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <Stat label="AC" value={String(ac)} />
            <Stat label="Weapon" value={mainHand ? `${mainHand.name} · ${damage}` : 'Unarmed'} />
            <Stat label="Interval" value={`${intervalSec.toFixed(1)}s`} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {SLOT_GRID.map(({ slot, label }) => {
              const id = equipment[slot]
              const def = id ? getItem(id) : undefined
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={!def || isInDungeonOrQuest}
                  onClick={() => unequipSlot(slot)}
                  className="rounded-md border border-brown/40 bg-ink/40 px-2 py-3 text-left text-sm disabled:cursor-default"
                >
                  <div className="text-xs uppercase tracking-wide text-sage/80">{label}</div>
                  <div className={def ? RARITY_TEXT[def.rarity] : 'text-parchment/50'}>
                    {def?.name ?? 'Empty'}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-4 space-y-3">
            <h4 className="font-semibold text-sage">Loadouts</h4>
            <div className="flex flex-wrap gap-2">
              <input
                value={setName}
                onChange={(event) => setSetName(event.target.value)}
                placeholder="Loadout name"
                className="rounded-lg border border-brown/40 bg-ink/50 px-3 py-1 text-sm text-parchment"
              />
              <button
                type="button"
                onClick={() => {
                  saveEquipmentSet(setName)
                  setSetName('')
                }}
                className="rounded-lg bg-sage px-3 py-1 text-sm text-ink transition-colors hover:bg-gold"
              >
                Save
              </button>
            </div>
            <ul className="space-y-2">
              {equipmentSets.map((entry) => (
                <li
                  key={entry.name}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-ink/40 px-3 py-2"
                >
                  <span>{entry.name}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isInDungeonOrQuest}
                      onClick={() => loadEquipmentSet(entry.name)}
                      className="rounded-lg bg-sage px-3 py-1 text-sm text-ink transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEquipmentSet(entry.name)}
                      className="rounded-lg bg-brown/60 px-3 py-1 text-sm text-parchment transition-colors hover:bg-crimson"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {tab === 'spellbook' && (
        <section className="rounded-lg border border-brown/40 bg-panel p-5 shadow-lg">
          <h3 className="mb-3 font-bold text-gold">Spellbook</h3>
          {!classId || !casterType ? (
            <p className="text-sm text-parchment/70">This class has no spells.</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-sage">
                Unlock skill: {unlockSkillId ? getSkill(unlockSkillId).name : '—'} level {unlockLevel}
              </p>

              <h4 className="mb-2 font-semibold text-sage">Slot loadout</h4>
              <ul className="mb-6 space-y-2">
                {slotStructure.map((slot, index) => {
                  const selected = loadout?.slots[index] ?? null
                  const options = classSpells.filter(
                    (spell) =>
                      spellFitsSlot(spell, slot.level) && unlockLevel >= unlockSkillLevel(spell.level),
                  )
                  return (
                    <li
                      key={`${slot.level}-${index}`}
                      className="flex flex-wrap items-center gap-3 rounded-md bg-ink/40 px-3 py-2 text-sm"
                    >
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
                    </li>
                  )
                })}
              </ul>

              <h4 className="mb-2 font-semibold text-sage">Known & locked</h4>
              <ul className="space-y-1 text-sm">
                {classSpells.map((spell) => {
                  const need = unlockSkillLevel(spell.level)
                  const known = unlockLevel >= need
                  return (
                    <li key={spell.id} className="flex justify-between gap-2 rounded bg-ink/30 px-3 py-1.5">
                      <span>
                        {spell.name}{' '}
                        <span className="text-sage">
                          (L{spell.level === 0 ? '0 cantrip' : spell.level})
                        </span>
                      </span>
                      <span className={known ? 'text-sage' : 'text-parchment/50'}>
                        {known ? 'Known' : `Unlocks at ${need}`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>
      )}

    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-ink/50 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-sage/80">{label}</dt>
      <dd className="font-semibold text-parchment">{value}</dd>
    </div>
  )
}
