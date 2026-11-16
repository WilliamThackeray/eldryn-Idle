import { useState } from 'react'
import { CLASSES, getClass, type ClassId } from '../../data/classes'
import { getItem } from '../../data/items'
import { RARITY_TEXT } from '../../components/rarity'
import { deriveAbilities } from '../../engine/abilities'
import {
  armorClass,
  weaponDamageLabel,
  weaponIntervalBase,
  type EquipmentSlot,
} from '../../engine/equipment'
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

export function CharacterPage() {
  const characterName = useGameStore((state) => state.characterName)
  const skills = useGameStore((state) => state.skills)
  const activeClassId = useGameStore((state) => state.activeClassId)
  const classes = useGameStore((state) => state.classes)
  const clericFocus = useGameStore((state) => state.clericFocus)
  const isInDungeonOrQuest = useGameStore((state) => state.isInDungeonOrQuest)
  const equipment = useGameStore((state) => state.equipment)
  const equipmentSets = useGameStore((state) => state.equipmentSets)
  const setActiveClass = useGameStore((state) => state.setActiveClass)
  const setClericFocus = useGameStore((state) => state.setClericFocus)
  const unequipSlot = useGameStore((state) => state.unequipSlot)
  const saveEquipmentSet = useGameStore((state) => state.saveEquipmentSet)
  const loadEquipmentSet = useGameStore((state) => state.loadEquipmentSet)
  const deleteEquipmentSet = useGameStore((state) => state.deleteEquipmentSet)
  const [setName, setSetName] = useState('')

  const abilities = deriveAbilities(skills)
  const dexMod = abilities.find((ability) => ability.abbr === 'DEX')?.modifier ?? 0
  const ac = armorClass(equipment, dexMod)
  const mainHand = equipment.mainHand ? getItem(equipment.mainHand) : undefined
  const damage = weaponDamageLabel(equipment)
  const intervalSec = weaponIntervalBase(mainHand?.gear?.weapon)
  const active = activeClassId ? getClass(activeClassId) : null
  const activeXp = activeClassId ? classes[activeClassId].xp : 0
  const activeLevel = levelForXp(activeXp)
  const activeProgress = progressToNext(activeXp)

  return (
    <div className="space-y-6 text-parchment">
      <section className="rounded-lg border border-brown/40 bg-panel p-5 shadow-lg">
        <h2 className="mb-1 text-2xl font-bold text-gold">{characterName}</h2>
        {active ? (
          <p className="text-sm text-sage">
            {active.name} · Class Level {activeLevel} · Tier {tier(activeLevel)} ·{' '}
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {abilities.map((ability) => (
            <div key={ability.id} className="rounded-md bg-ink/50 px-3 py-2 text-sm">
              <div className="text-xs uppercase tracking-wide text-sage/80">{ability.abbr}</div>
              <div className="font-semibold">
                {ability.score} ({ability.modifier >= 0 ? `+${ability.modifier}` : ability.modifier})
              </div>
            </div>
          ))}
        </div>
      </section>

      {active && (
        <section className="rounded-lg border border-brown/40 bg-panel p-5 shadow-lg">
          <h3 className="mb-3 font-bold text-gold">Active class</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Hit Die" value={`1d${active.hitDie}`} />
            <Stat label="Saves" value={active.saveProficiencies.join(', ')} />
          </dl>
          <p className="mt-3 text-sm font-semibold">{active.signatureAbility.name}</p>
          <p className="mt-1 text-sm text-parchment/80">{active.signatureAbility.description}</p>
          {active.id === 'cleric' && (
            <div className="mt-3 flex gap-2">
              {(['INT', 'STR'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setClericFocus(option)}
                  className={`rounded px-3 py-1 text-sm ${
                    clericFocus === option ? 'bg-crimson text-parchment' : 'bg-brown/60 text-parchment/80'
                  }`}
                >
                  Focus {option}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

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

      <section className="rounded-lg border border-brown/40 bg-panel p-5 shadow-lg">
        <h3 className="mb-3 font-bold text-gold">Classes</h3>
        {isInDungeonOrQuest && (
          <p className="mb-3 text-sm text-parchment/70">Switching is locked in a dungeon or quest.</p>
        )}
        <ul className="space-y-2">
          {CLASSES.map((entry) => {
            const xp = classes[entry.id as ClassId].xp
            const level = levelForXp(xp)
            const isActive = entry.id === activeClassId
            return (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-ink/40 px-3 py-2"
              >
                <div>
                  <span className="font-semibold text-parchment">{entry.name}</span>
                  <span className="ml-2 text-sm text-sage">
                    Level {level} · Tier {tier(level)}
                  </span>
                  {isActive && <span className="ml-2 text-xs text-gold">Active</span>}
                </div>
                <button
                  type="button"
                  disabled={isActive || isInDungeonOrQuest}
                  onClick={() => setActiveClass(entry.id)}
                  className="rounded-lg bg-sage px-3 py-1 text-sm text-ink transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Switch
                </button>
              </li>
            )
          })}
        </ul>
      </section>
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
