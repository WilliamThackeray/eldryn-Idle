import { activity, drop, stack } from './define'
import type { ItemId } from '../items'

const dust = [drop('arcane-dust', 5, 10)]

function enchant(
  id: string,
  label: string,
  requiredLevel: number,
  base: ItemId,
  output: ItemId,
  gem: ItemId,
  reagent: ItemId,
) {
  return activity({
    skillId: 'enchanting',
    id,
    name: `Enchant: ${label}`,
    description: `Consume dust, a gem, and a reagent to enchant the base item.`,
    requiredLevel,
    inputs: [stack(base), stack('arcane-dust', 5), stack(gem), stack(reagent)],
    outputs: [drop(output)],
    category: 'Enchantments',
  })
}

export const enchantingActivities = [
  activity({
    skillId: 'enchanting',
    id: 'read-omens',
    name: 'Read Omens',
    description: 'Study the signs. Gather Arcane Dust.',
    requiredLevel: 1,
    outputs: dust,
    category: 'Arcane Study',
  }),
  activity({
    skillId: 'enchanting',
    id: 'scrying-pool',
    name: 'Scrying Pool',
    description: 'Practice divination. Gather Arcane Dust.',
    requiredLevel: 20,
    outputs: dust,
    category: 'Arcane Study',
  }),
  enchant(
    'enchant-longsword-plus1',
    'Longsword → Longsword +1',
    10,
    'longsword',
    'longsword+1',
    'cut-quartz',
    'sulfur',
  ),
  enchant(
    'enchant-chain-mail-plus1',
    'Chain Mail Chest → Chain Mail Chest +1',
    30,
    'chain-mail-chest',
    'chain-mail-chest+1',
    'cut-quartz',
    'sulfur',
  ),
  enchant(
    'enchant-steel-flame',
    'Steel Longsword → Steel Longsword (Flame)',
    40,
    'steel-longsword',
    'steel-longsword-flame',
    'cut-amethyst',
    'sulfur',
  ),
  enchant(
    'enchant-leather-fire-resist',
    'Leather Chest → Leather Chest (Fire Resist)',
    50,
    'leather-chest',
    'leather-chest-fire-resist',
    'cut-quartz',
    'sap',
  ),
  enchant(
    'enchant-silvered-frost',
    'Silvered Longsword → Silvered Longsword (Frost)',
    60,
    'silvered-longsword',
    'silvered-longsword-frost',
    'cut-sapphire',
    'sulfur',
  ),
  enchant(
    'enchant-mithral-shock',
    'Mithral Longsword → Mithral Longsword (Shock)',
    70,
    'mithral-longsword',
    'mithral-longsword-shock',
    'cut-sapphire',
    'sulfur',
  ),
  enchant(
    'enchant-smiths-ring',
    'Ring → Smith\'s Ring',
    80,
    'ring',
    'smiths-ring',
    'cut-amethyst',
    'sulfur',
  ),
  enchant(
    'enchant-alchemists-ring',
    'Ring → Alchemist\'s Ring',
    90,
    'ring',
    'alchemists-ring',
    'cut-amethyst',
    'sulfur',
  ),
]
