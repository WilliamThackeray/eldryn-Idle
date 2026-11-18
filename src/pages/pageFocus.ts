import type { BiomeId } from '../data/monsters'
import type { SkillId } from '../data/skills'

export type PageFocus =
  | { kind: 'activity'; skillId: SkillId; activityId: string }
  | { kind: 'monster'; monsterId: string; biome: BiomeId }
  | { kind: 'dungeon'; dungeonId: string }
  | { kind: 'spell'; spellId: string }
  | { kind: 'quest'; questId: string }
