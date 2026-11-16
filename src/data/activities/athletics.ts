import { activity, drop, stack } from './define'

const slag = [drop('slag')]

export const athleticsActivities = [
  activity({ skillId: 'athletics', id: 'mine-iron', name: 'Mine Iron', description: 'Work a surface vein of iron.', requiredLevel: 1, outputs: [drop('iron-ore')], rareTable: [drop('coal', 1, 1, 0.05)] }),
  activity({ skillId: 'athletics', id: 'mine-coal', name: 'Mine Coal', description: 'Dig coal for the forge.', requiredLevel: 15, outputs: [drop('coal')] }),
  activity({ skillId: 'athletics', id: 'mine-silver', name: 'Mine Silver', description: 'Follow a silver vein.', requiredLevel: 30, outputs: [drop('silver-ore')] }),
  activity({ skillId: 'athletics', id: 'mine-gold', name: 'Mine Gold Ore', description: 'Chip gold ore out of the rock.', requiredLevel: 40, outputs: [drop('gold-ore')] }),
  activity({ skillId: 'athletics', id: 'mine-mithral', name: 'Mine Mithral', description: 'Work a deep mithral seam.', requiredLevel: 60, outputs: [drop('mithral-ore')] }),
  activity({ skillId: 'athletics', id: 'mine-adamantine', name: 'Mine Adamantine', description: 'Break adamantine out of the deep rock.', requiredLevel: 80, outputs: [drop('adamantine-ore')] }),
  activity({ skillId: 'athletics', id: 'smith-iron', name: 'Smith Iron Bar', description: 'Smelt iron ore into a bar.', requiredLevel: 1, inputs: [stack('iron-ore')], outputs: [drop('iron-bar')], byproducts: slag }),
  activity({ skillId: 'athletics', id: 'smith-steel', name: 'Smith Steel Bar', description: 'Smelt iron ore with coal into steel.', requiredLevel: 15, inputs: [stack('iron-ore'), stack('coal')], outputs: [drop('steel-bar')], byproducts: slag }),
  activity({ skillId: 'athletics', id: 'smith-silver', name: 'Smith Silver Bar', description: 'Smelt silver ore into a bar.', requiredLevel: 30, inputs: [stack('silver-ore')], outputs: [drop('silver-bar')], byproducts: slag }),
  activity({ skillId: 'athletics', id: 'smith-gold', name: 'Smith Gold Bar', description: 'Smelt gold ore into a bar.', requiredLevel: 40, inputs: [stack('gold-ore')], outputs: [drop('gold-bar')], byproducts: slag }),
  activity({ skillId: 'athletics', id: 'smith-mithral', name: 'Smith Mithral Bar', description: 'Smelt mithral ore into a bar.', requiredLevel: 60, inputs: [stack('mithral-ore')], outputs: [drop('mithral-bar')], byproducts: slag }),
  activity({ skillId: 'athletics', id: 'smith-adamantine', name: 'Smith Adamantine Bar', description: 'Smelt adamantine ore into a bar.', requiredLevel: 80, inputs: [stack('adamantine-ore')], outputs: [drop('adamantine-bar')], byproducts: slag }),
]
