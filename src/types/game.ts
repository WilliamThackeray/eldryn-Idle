export interface Skill {
  id: string;
  name: string;
  category: "combat" | "passive" | "non-combat";
  currentXP: number;
  level: number;
  description: string;
}

export interface Ability {
  id: string;
  name: string;
  abbr: string;
  score: number;
  modifier: number;
  description: string;
}

export interface Character {
  name: string;
  combatSkills: Skill[];
  passiveSkills: Skill[];
  nonCombatSkills: Skill[];
  inventory: InventoryItem[];
  abilities: Ability[];
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
