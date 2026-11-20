import { expect, test } from 'vitest'
import { initialSkillProgress } from '../data/skills'
import { NOTICE_BOARD_MS, NOTICE_BOARD_REROLL_FAVOR } from './config'
import { emptyQuestProgress } from './quest'
import { emptyNoticeBoard, refreshIfDue, rerollBoard } from './noticeBoard'

test('notice board keeps offers under 4 hours and refreshes at 4 hours', () => {
  const skills = initialSkillProgress()
  const questProgress = emptyQuestProgress()
  const rng = () => 0.1
  const now = 1_000_000
  const board = refreshIfDue(emptyNoticeBoard(now), now, rng, skills, questProgress)
  expect(board.offers.length).toBe(3)
  expect(board.refreshedAt).toBe(now)

  const kept = refreshIfDue(board, now + NOTICE_BOARD_MS - 1, rng, skills, questProgress)
  expect(kept.offers).toEqual(board.offers)
  expect(kept.refreshedAt).toBe(now)

  const refreshed = refreshIfDue(board, now + NOTICE_BOARD_MS, () => 0.9, skills, questProgress)
  expect(refreshed.refreshedAt).toBe(now + NOTICE_BOARD_MS)
  expect(refreshed.offers.length).toBe(3)
})

test('reroll spends Favor and keeps refreshedAt', () => {
  const skills = initialSkillProgress()
  const questProgress = emptyQuestProgress()
  const board = refreshIfDue(emptyNoticeBoard(500), 500, () => 0.2, skills, questProgress)
  const result = rerollBoard(board, NOTICE_BOARD_REROLL_FAVOR, () => 0.8, skills, questProgress)
  expect(result.ok).toBe(true)
  expect(result.favor).toBe(0)
  expect(result.board.refreshedAt).toBe(board.refreshedAt)
  expect(result.board.offers.length).toBe(3)

  const broke = rerollBoard(board, 0, () => 0.5, skills, questProgress)
  expect(broke.ok).toBe(false)
})
