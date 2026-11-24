import { activity, drop, stack } from './define'
import { fillDisplay } from './display'

export const huntingActivities = fillDisplay(
  [
    activity({
      skillId: 'hunting',
      id: 'trap-small',
      name: 'Trap Small Animals',
      description: 'Set snares for small game.',
      requiredLevel: 1,
      outputs: [drop('small-animal'), drop('animal-scraps')],
    }),
    activity({
      skillId: 'hunting',
      id: 'trap-fowl',
      name: 'Trap Air Fowl',
      description: 'Net birds on the wing.',
      requiredLevel: 20,
      outputs: [drop('air-fowl'), drop('animal-scraps')],
    }),
    activity({
      skillId: 'hunting',
      id: 'trap-medium',
      name: 'Trap Medium Animals',
      description: 'Set traps for wolves, boar, and the like.',
      requiredLevel: 30,
      outputs: [drop('medium-animal'), drop('animal-scraps')],
    }),
    activity({
      skillId: 'hunting',
      id: 'trap-large',
      name: 'Trap Large Animals',
      description: 'Set traps for bears, elk, and the like.',
      requiredLevel: 50,
      outputs: [drop('large-animal'), drop('animal-scraps')],
    }),
    activity({
      skillId: 'hunting',
      id: 'track-forest',
      name: 'Track Forest Game',
      description: 'Follow forest spoor for hides and meat.',
      requiredLevel: 10,
      outputs: [drop('hide'), drop('raw-meat')],
      rareTable: [drop('hide', 1, 1, 0.35), drop('raw-meat', 1, 2, 0.35)],
    }),
    activity({
      skillId: 'hunting',
      id: 'track-hills',
      name: 'Track Hills Game',
      description: 'Follow hill spoor for hides and meat.',
      requiredLevel: 30,
      outputs: [drop('hide'), drop('raw-meat', 1, 2)],
      rareTable: [drop('hide', 1, 2, 0.4), drop('raw-meat', 2, 3, 0.35)],
    }),
    activity({
      skillId: 'hunting',
      id: 'track-swamp',
      name: 'Track Swamp Game',
      description: 'Follow swamp spoor for hides and meat.',
      requiredLevel: 60,
      outputs: [drop('hide', 1, 2), drop('raw-meat', 2, 3)],
      rareTable: [drop('hide', 2, 3, 0.4), drop('bones', 1, 2, 0.3)],
    }),
    activity({
      skillId: 'hunting',
      id: 'butcher-small',
      name: 'Butcher Small Animal',
      description: 'Break a small catch into meat, hide, and bones.',
      requiredLevel: 1,
      inputs: [stack('small-animal')],
      outputs: [drop('raw-meat'), drop('hide'), drop('bones')],
    }),
    activity({
      skillId: 'hunting',
      id: 'butcher-fowl',
      name: 'Butcher Air Fowl',
      description: 'Break a bird into meat and bones.',
      requiredLevel: 20,
      inputs: [stack('air-fowl')],
      outputs: [drop('raw-fowl'), drop('bones'), drop('feathers', 1, 2)],
    }),
    activity({
      skillId: 'hunting',
      id: 'butcher-medium',
      name: 'Butcher Medium Animal',
      description: 'Break a medium catch into meat, hide, and bones.',
      requiredLevel: 30,
      inputs: [stack('medium-animal')],
      outputs: [drop('raw-meat', 2), drop('hide'), drop('bones', 2)],
    }),
    activity({
      skillId: 'hunting',
      id: 'butcher-large',
      name: 'Butcher Large Animal',
      description: 'Break a large catch into meat, hide, and bones.',
      requiredLevel: 50,
      inputs: [stack('large-animal')],
      outputs: [drop('raw-meat', 3), drop('hide', 2), drop('bones', 3)],
    }),
    activity({
      skillId: 'hunting',
      id: 'ranch',
      name: 'Husbandry',
      description: 'Tend the ranch for wool, eggs, and feathers.',
      requiredLevel: 1,
      outputs: [drop('eggs', 1, 2), drop('wool', 1, 1, 0.6), drop('feathers', 1, 2, 0.5)],
    }),
  ],
  (def, index) => ({
    category: def.id.startsWith('trap-')
      ? 'Trapping'
      : def.id.startsWith('track-')
        ? 'Tracking'
        : def.id.startsWith('butcher-')
          ? 'Butchering'
          : 'Husbandry',
    sortOrder: index,
  }),
)
