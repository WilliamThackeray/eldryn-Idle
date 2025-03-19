export interface Skill {
  id: string;
  name: string;
  category: 'combat' | 'passive' | 'non-combat';
  currentXP: number;
  level: number;
  description: string;
}

export interface Character {
  skills: Skill[];
  inventory: InventoryItem[];
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  description: string;
}

export interface GameState {
  character: Character;
  lastSaved: string;
}