export type { CombatAction, CombatFight, CombatLootGain } from './state'
export {
  beginDungeonFight,
  createFight,
  maxHp,
  monsterIntervalBaseMs,
  savingThrow,
  tryRelentless,
} from './state'
export type { CombatAdvanceInput, CombatAdvanceResult } from './state'
export { advanceCombat } from './step'
export { averageDamage, difficultyHint, nickProc, playerToHitBonus } from './attack'
