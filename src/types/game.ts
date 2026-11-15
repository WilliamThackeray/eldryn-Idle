export type AbilityAbbr = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'

export interface SkillProgress {
  xp: number
}

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  description: string
}
