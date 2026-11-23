import { activity, drop } from './define'
import { fillDisplay } from './display'

export const miningActivities = fillDisplay(
  [
    activity({
      skillId: 'mining',
      id: 'mine-iron',
      name: 'Mine Iron',
      description: 'Work a surface vein of iron.',
      requiredLevel: 1,
      outputs: [
        drop('iron-ore'),
        drop('mica-chip', 1, 1, 0.25),
        drop('sulfur', 1, 1, 0.25),
      ],
      rareTable: [drop('coal', 1, 1, 0.05)],
    }),
    activity({
      skillId: 'mining',
      id: 'mine-coal',
      name: 'Mine Coal',
      description: 'Dig coal for the forge.',
      requiredLevel: 15,
      outputs: [drop('coal'), drop('mica-chip', 1, 1, 0.25), drop('sulfur', 1, 1, 0.25)],
    }),
    activity({
      skillId: 'mining',
      id: 'mine-silver',
      name: 'Mine Silver',
      description: 'Follow a silver vein.',
      requiredLevel: 30,
      outputs: [
        drop('silver-ore'),
        drop('mica-chip', 1, 1, 0.25),
        drop('sulfur', 1, 1, 0.25),
      ],
    }),
    activity({
      skillId: 'mining',
      id: 'mine-gold',
      name: 'Mine Gold Ore',
      description: 'Chip gold ore out of the rock.',
      requiredLevel: 40,
      outputs: [drop('gold-ore'), drop('mica-chip', 1, 1, 0.25), drop('sulfur', 1, 1, 0.25)],
    }),
    activity({
      skillId: 'mining',
      id: 'mine-mithral',
      name: 'Mine Mithral',
      description: 'Work a deep mithral seam.',
      requiredLevel: 60,
      outputs: [
        drop('mithral-ore'),
        drop('mica-chip', 1, 1, 0.25),
        drop('sulfur', 1, 1, 0.25),
      ],
    }),
    activity({
      skillId: 'mining',
      id: 'mine-adamantine',
      name: 'Mine Adamantine',
      description: 'Break adamantine out of the deep rock.',
      requiredLevel: 80,
      outputs: [
        drop('adamantine-ore'),
        drop('mica-chip', 1, 1, 0.25),
        drop('sulfur', 1, 1, 0.25),
      ],
    }),
    activity({
      skillId: 'mining',
      id: 'pan-for-gold',
      name: 'Pan for Gold',
      description: 'Wash a pan in a stream for a few coins.',
      requiredLevel: 1,
      outputs: [drop('field-notes')],
      gold: { min: 2, max: 6 },
    }),
    activity({
      skillId: 'mining',
      id: 'forest-ruins',
      name: 'Forest Ruins',
      description: 'Dig a forest ruin for pages, gems, and coin.',
      requiredLevel: 10,
      outputs: [drop('ancient-page'), drop('gem', 1, 1, 0.25)],
      gold: { min: 4, max: 10 },
    }),
  ],
  (def, index) => ({
    category: def.id.startsWith('mine-') ? 'Mining' : 'Excavation',
    sortOrder: index,
  }),
)
