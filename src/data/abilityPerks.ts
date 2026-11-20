import type { AbilityAbbr } from '../types/game'

export type PerkEffect =
  | { type: 'skillYieldPct'; ability: AbilityAbbr; value: number; perRank?: true }
  | { type: 'skillGoldPct'; ability: AbilityAbbr; value: number; perRank?: true }
  | { type: 'maxHpPct'; value: number; perRank?: true }
  | { type: 'foodHealPct'; value: number }
  | { type: 'sellPricePct'; value: number }
  | { type: 'nickRange'; value: number }
  | { type: 'spellSaveDc'; value: number }
  | { type: 'brutalCritDice'; value: number }
  | { type: 'surviveAt1' }
  | { type: 'saveBarChance'; value: number } // TODO(Prompt 14)
  | { type: 'heavyWeaponIntervalPct'; value: number } // TODO(Prompt 15)
  | { type: 'ignoreHeavyArmorStr' } // TODO(Prompt 13)
  | { type: 'lockpickDoubleLootChance'; value: number } // TODO(Prompt 14)
  | { type: 'evasion' } // TODO(Prompt 15)
  | { type: 'extraAttackChance'; value: number } // TODO(Prompt 15)
  | { type: 'shortRestAdvantage' } // TODO(Prompt 15)
  | { type: 'poisonResistance' } // TODO(Prompt 15)
  | { type: 'componentSaveChance'; value: number } // TODO(Prompt 16)
  | { type: 'historyTomePages'; value: number }
  | { type: 'extraSpellSlot'; value: number } // TODO(Prompt 16)
  | { type: 'doubleGatherChance'; value: number } // TODO(Prompt 14)
  | { type: 'forageWhileHunting' } // TODO(Prompt 15)
  | { type: 'wisSaveBonus'; value: number } // TODO(Prompt 15) hook exists; not in this pass
  | { type: 'rareSpawnMultiplier'; value: number } // TODO(Prompt 15)
  | { type: 'extraQuestApproach'; value: number } // TODO(Prompt 19)
  | { type: 'favorPct'; value: number }
  | { type: 'shopDiscountPct'; value: number }

export interface AbilityPerk {
  ability: AbilityAbbr
  rank: number
  id: string
  name: string
  description: string
  effect: PerkEffect
}

export const ABILITY_PERKS = [
  // STR
  {
    ability: 'STR',
    rank: 1,
    id: 'str-yield',
    name: 'Athletic Yield',
    description: '+1% Athletics yield per Rank.',
    effect: { type: 'skillYieldPct', ability: 'STR', value: 0.01, perRank: true },
  },
  {
    ability: 'STR',
    rank: 5,
    id: 'str-save-bar',
    name: 'Spare the Bar',
    description: '10% chance to save a bar when smithing.',
    effect: { type: 'saveBarChance', value: 0.1 },
  },
  {
    ability: 'STR',
    rank: 10,
    id: 'str-heavy-interval',
    name: 'Heavy Hands',
    description: 'Heavy weapons −5% interval.',
    effect: { type: 'heavyWeaponIntervalPct', value: -0.05 },
  },
  {
    ability: 'STR',
    rank: 15,
    id: 'str-ignore-armor',
    name: 'Burden Bearer',
    description: 'Ignore heavy armor STR requirements.',
    effect: { type: 'ignoreHeavyArmorStr' },
  },
  {
    ability: 'STR',
    rank: 20,
    id: 'str-brutal',
    name: 'Brutal',
    description: '+1 damage die on crits.',
    effect: { type: 'brutalCritDice', value: 1 },
  },

  // DEX
  {
    ability: 'DEX',
    rank: 1,
    id: 'dex-yield',
    name: 'Nimble Yield',
    description: '+1% DEX skill yield per Rank.',
    effect: { type: 'skillYieldPct', ability: 'DEX', value: 0.01, perRank: true },
  },
  {
    ability: 'DEX',
    rank: 5,
    id: 'dex-lockpick',
    name: 'Lucky Lockpick',
    description: '10% chance of double loot when lockpicking.',
    effect: { type: 'lockpickDoubleLootChance', value: 0.1 },
  },
  {
    ability: 'DEX',
    rank: 10,
    id: 'dex-nick',
    name: 'Nick Range',
    description: 'Nick procs on 1–3.',
    effect: { type: 'nickRange', value: 3 },
  },
  {
    ability: 'DEX',
    rank: 15,
    id: 'dex-evasion',
    name: 'Evasion',
    description: 'Evasion against area effects.',
    effect: { type: 'evasion' },
  },
  {
    ability: 'DEX',
    rank: 20,
    id: 'dex-extra-attack',
    name: 'Flurry',
    description: '10% chance of an extra attack.',
    effect: { type: 'extraAttackChance', value: 0.1 },
  },

  // CON
  {
    ability: 'CON',
    rank: 1,
    id: 'con-max-hp',
    name: 'Hardy',
    description: '+1% max HP per Rank.',
    effect: { type: 'maxHpPct', value: 0.01, perRank: true },
  },
  {
    ability: 'CON',
    rank: 5,
    id: 'con-food',
    name: 'Hearty Appetite',
    description: 'Food heals +10%.',
    effect: { type: 'foodHealPct', value: 0.1 },
  },
  {
    ability: 'CON',
    rank: 10,
    id: 'con-short-rest',
    name: 'Second Wind Rest',
    description: 'Short-rest hit die rolls twice, keep the higher.',
    effect: { type: 'shortRestAdvantage' },
  },
  {
    ability: 'CON',
    rank: 15,
    id: 'con-poison',
    name: 'Iron Gut',
    description: 'Poison resistance.',
    effect: { type: 'poisonResistance' },
  },
  {
    ability: 'CON',
    rank: 20,
    id: 'con-survive',
    name: 'Relentless',
    description: 'Survive at 1 HP once per fight.',
    effect: { type: 'surviveAt1' },
  },

  // INT
  {
    ability: 'INT',
    rank: 1,
    id: 'int-yield',
    name: 'Scholarly Yield',
    description: '+1% INT skill yield per Rank.',
    effect: { type: 'skillYieldPct', ability: 'INT', value: 0.01, perRank: true },
  },
  {
    ability: 'INT',
    rank: 5,
    id: 'int-components',
    name: 'Careful Components',
    description: '5% chance to save components.',
    effect: { type: 'componentSaveChance', value: 0.05 },
  },
  {
    ability: 'INT',
    rank: 10,
    id: 'int-tomes',
    name: 'Library Pass',
    description: 'Tomes cost 1 fewer Ancient Page.',
    effect: { type: 'historyTomePages', value: 1 },
  },
  {
    ability: 'INT',
    rank: 15,
    id: 'int-save-dc',
    name: 'Arcane Focus',
    description: '+1 spell save DC.',
    effect: { type: 'spellSaveDc', value: 1 },
  },
  {
    ability: 'INT',
    rank: 20,
    id: 'int-extra-slot',
    name: 'Expanded Rotation',
    description: 'One extra slot in the spell rotation.',
    effect: { type: 'extraSpellSlot', value: 1 },
  },

  // WIS
  {
    ability: 'WIS',
    rank: 1,
    id: 'wis-yield',
    name: 'Wise Yield',
    description: '+1% WIS skill yield per Rank.',
    effect: { type: 'skillYieldPct', ability: 'WIS', value: 0.01, perRank: true },
  },
  {
    ability: 'WIS',
    rank: 5,
    id: 'wis-double-gather',
    name: 'Keen Eye',
    description: '10% chance of double gathering.',
    effect: { type: 'doubleGatherChance', value: 0.1 },
  },
  {
    ability: 'WIS',
    rank: 10,
    id: 'wis-forage',
    name: 'Trail Forager',
    description: 'Forage food while hunting.',
    effect: { type: 'forageWhileHunting' },
  },
  {
    ability: 'WIS',
    rank: 15,
    id: 'wis-saves',
    name: 'Unshaken',
    description: '+2 to WIS saves.',
    effect: { type: 'wisSaveBonus', value: 2 },
  },
  {
    ability: 'WIS',
    rank: 20,
    id: 'wis-rare-spawn',
    name: 'Beast Whisperer',
    description: 'Rare spawn chance ×2.',
    effect: { type: 'rareSpawnMultiplier', value: 2 },
  },

  // CHA
  {
    ability: 'CHA',
    rank: 1,
    id: 'cha-gold',
    name: 'Silver Tongue',
    description: '+1% gold from CHA skills per Rank.',
    effect: { type: 'skillGoldPct', ability: 'CHA', value: 0.01, perRank: true },
  },
  {
    ability: 'CHA',
    rank: 5,
    id: 'cha-sell',
    name: 'Haggler',
    description: 'Sell prices +5%.',
    effect: { type: 'sellPricePct', value: 0.05 },
  },
  {
    ability: 'CHA',
    rank: 10,
    id: 'cha-quest',
    name: 'Persuasive Path',
    description: 'One extra quest approach.',
    effect: { type: 'extraQuestApproach', value: 1 },
  },
  {
    ability: 'CHA',
    rank: 15,
    id: 'cha-favor',
    name: 'Guild Favorite',
    description: '+25% Guild Favor.',
    effect: { type: 'favorPct', value: 0.25 },
  },
  {
    ability: 'CHA',
    rank: 20,
    id: 'cha-shop',
    name: 'Preferred Customer',
    description: 'Shop discount 10%.',
    effect: { type: 'shopDiscountPct', value: 0.1 },
  },
] as const satisfies readonly AbilityPerk[]

export type AbilityPerkId = (typeof ABILITY_PERKS)[number]['id']

export function ladderPerksFor(ability: AbilityAbbr): AbilityPerk[] {
  return ABILITY_PERKS.filter((perk) => perk.ability === ability && perk.rank >= 5)
}

export function perRankPerkFor(ability: AbilityAbbr): AbilityPerk | undefined {
  return ABILITY_PERKS.find((perk) => perk.ability === ability && perk.rank === 1)
}
