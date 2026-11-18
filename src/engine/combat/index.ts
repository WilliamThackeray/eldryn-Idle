export type { CombatAction, CombatFight, CombatLootGain } from './state'
export {
  beginDungeonFight,
  createFight,
  maxHp,
  monsterIntervalBaseMs,
  playerMaxHp,
  savingThrow,
  tryRelentless,
} from './state'
export type { CombatAdvanceInput, CombatAdvanceResult } from './state'
export { advanceCombat } from './step'
export {
  averageDamage,
  critThreshold,
  difficultyHint,
  hitChance,
  nickProc,
  playerToHitBonus,
} from './attack'
