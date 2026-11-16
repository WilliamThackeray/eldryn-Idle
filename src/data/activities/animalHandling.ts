import { activity, drop } from './define'

export const animalHandlingActivities = [
  activity({ skillId: 'animalHandling', id: 'ranch', name: 'Ranch', description: 'Tend the ranch. Eggs for now.', requiredLevel: 1, outputs: [drop('eggs', 1, 2)] }),
  activity({ skillId: 'animalHandling', id: 'small-animal-drills', name: 'Small Animal Drills', description: 'Handling drills. A live animal is not spent yet.', requiredLevel: 10 }),
  activity({ skillId: 'animalHandling', id: 'air-fowl-drills', name: 'Air Fowl Drills', description: 'Call and glove drills. A live bird is not spent yet.', requiredLevel: 20 }),
]
