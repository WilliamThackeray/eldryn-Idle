import { activity, drop, stack } from './define'

// shortcut: one plot is a long-interval activity, upgrade when plots are plantable objects.
const PLOT_MS = 30 * 60 * 1000

export const natureActivities = [
  activity({ skillId: 'nature', id: 'cook-forest-fish', name: 'Cook Forest Fish', description: 'Cook a raw forest fish.', requiredLevel: 1, inputs: [stack('raw-forest-fish')], outputs: [drop('cooked-forest-fish')] }),
  activity({ skillId: 'nature', id: 'cook-meat', name: 'Cook Meat', description: 'Roast raw meat.', requiredLevel: 1, inputs: [stack('raw-meat')], outputs: [drop('cooked-meat')] }),
  activity({ skillId: 'nature', id: 'cook-fowl', name: 'Cook Fowl', description: 'Roast raw fowl.', requiredLevel: 20, inputs: [stack('raw-fowl')], outputs: [drop('cooked-fowl')] }),
  activity({ skillId: 'nature', id: 'cook-desert-fish', name: 'Cook Desert Fish', description: 'Cook a raw oasis fish.', requiredLevel: 20, inputs: [stack('raw-desert-fish')], outputs: [drop('cooked-desert-fish')] }),
  activity({ skillId: 'nature', id: 'cook-coastal-fish', name: 'Cook Coastal Fish', description: 'Cook a raw coastal fish.', requiredLevel: 40, inputs: [stack('raw-coastal-fish')], outputs: [drop('cooked-coastal-fish')] }),
  activity({ skillId: 'nature', id: 'herb-plot', name: 'Herb Plot', description: 'One plot. Grows forest herbs on a long timer.', requiredLevel: 1, outputs: [drop('forest-herbs', 1, 3)], baseIntervalMs: PLOT_MS }),
]
