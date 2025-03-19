import { GameState } from '../types/game';

export const initialGameState: GameState = {
  character: {
    skills: [
      {
        id: 'swordsmanship',
        name: 'Swordsmanship',
        category: 'combat',
        currentXP: 0,
        level: 1,
        description: 'Master the art of sword fighting'
      },
      {
        id: 'archery',
        name: 'Archery',
        category: 'combat',
        currentXP: 0,
        level: 1,
        description: 'Become proficient with bow and arrow'
      },
      {
        id: 'meditation',
        name: 'Meditation',
        category: 'passive',
        currentXP: 0,
        level: 1,
        description: 'Increase mental focus and regeneration'
      },
      {
        id: 'sleightOfHand',
        name: 'Sleight of Hand',
        category: 'non-combat',
        currentXP: 0,
        level: 1,
        description: 'Master the art of dexterity and finesse'
      }
    ],
    inventory: []
  },
  lastSaved: new Date().toISOString()
};