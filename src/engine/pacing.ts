import { ACTIVITIES } from '../data/activities'
import { SKILLS, type TradeSkillId } from '../data/skills'
import { QUALITY_XP_MULTIPLIER } from './config'
import { qualityOdds, type ActivityCheckState, type QualityTier } from './skillCheck'
import { xpForLevel } from './xp'

const MARKS = [10, 30, 50, 70, 99] as const

function skillsAt(skillId: TradeSkillId, level: number): ActivityCheckState['skills'] {
  const skills = {} as ActivityCheckState['skills']
  for (const skill of SKILLS) skills[skill.id] = { xp: skill.id === skillId ? xpForLevel(level) : 0 }
  return skills
}

function expectedXp(skillId: TradeSkillId, level: number): { xp: number; interval: number } | null {
  const state: ActivityCheckState = { skills: skillsAt(skillId, level) }
  const open = ACTIVITIES.filter((activity) => activity.skillId === skillId && activity.requiredLevel <= level)
  if (open.length === 0) return null
  const best = open.reduce((pick, activity) => {
    if (activity.xp > pick.xp) return activity
    if (activity.xp === pick.xp && activity.baseIntervalMs < pick.baseIntervalMs) return activity
    return pick
  })
  const odds = qualityOdds(state, best)
  let mult = 0
  for (const tier of Object.keys(odds) as QualityTier[]) {
    mult += (odds[tier] / 100) * QUALITY_XP_MULTIPLIER[tier]
  }
  return { xp: best.xp * mult, interval: best.baseIntervalMs }
}

/** Hours to each mark, always on the highest-XP unlocked activity. Inputs are free. */
export function pacingHours(): Record<string, Record<number, number>> {
  const table: Record<string, Record<number, number>> = {}
  for (const skill of SKILLS) {
    if (skill.id === 'vitality') continue
    let ms = 0
    const marks: Record<number, number> = {}
    for (let level = 1; level < 99; level++) {
      const best = expectedXp(skill.id, level)
      const need = xpForLevel(level + 1) - xpForLevel(level)
      if (best && best.xp > 0) ms += (need / best.xp) * best.interval
      if ((MARKS as readonly number[]).includes(level + 1)) marks[level + 1] = ms / 3_600_000
    }
    table[skill.name] = marks
  }
  return table
}

export function formatPacingReport(): string {
  const table = pacingHours()
  const header = ['Skill', ...MARKS.map((mark) => `Lv ${mark}`)].join('\t')
  const lines = Object.entries(table).map(([name, marks]) =>
    [name, ...MARKS.map((mark) => formatHours(marks[mark] ?? 0))].join('\t'),
  )
  return [header, ...lines].join('\n')
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return `${hours.toFixed(1)}h`
}

export function unlockLadderMarkdown(): string {
  const lines = ['# Unlock ladders', '', 'Counted activities are the ones a player can see. Scribing tomes are one line per volume; spell inscriptions follow the spell.', '']
  for (const skill of SKILLS) {
    if (skill.id === 'vitality') continue
    lines.push(`## ${skill.name}`, '', '| Level | Activities |', '| --- | --- |')
    const rows = ACTIVITIES.filter((activity) => activity.skillId === skill.id && counts(activity.id))
    const levels = [...new Set(rows.map((activity) => activity.requiredLevel))].sort((a, b) => a - b)
    for (const level of levels) {
      const names = rows.filter((activity) => activity.requiredLevel === level).map((activity) => activity.name)
      lines.push(`| ${level} | ${names.join(', ')} |`)
    }
    if (skill.id === 'scribing') {
      lines.push('', 'Tome volumes (one line, every target skill): 5, 14, 23, 32, 41, 50, 59, 68, 77, 86. A volume stays hidden until the target skill is at least (volume − 1) × 10.', '')
      lines.push('Spell inscriptions unlock at the spell’s level and only for spells on the class list.', '')
    }
    lines.push('')
  }
  return lines.join('\n')
}

function counts(id: string): boolean {
  if (id.startsWith('craft-tome-')) return false
  if (id.startsWith('scribe-') || id.startsWith('inscribe-')) return false
  return true
}
