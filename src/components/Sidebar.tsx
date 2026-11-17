import {
  Axe,
  Crosshair,
  Drama,
  Dumbbell,
  Eye,
  Footprints,
  Hand,
  HeartPulse,
  Leaf,
  MessageCircle,
  PawPrint,
  Scale,
  ScrollText,
  Search,
  Sparkles,
  Theater,
  TreePine,
  User,
  Wand2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SKILL_ABILITY_GROUPS, SKILLS, type SkillId } from '../data/skills'
import { Link } from './Link'
import { Section } from './Section'

interface SidebarProps {
  currentPage: string
  setCurrentPage: (page: string) => void
}

const SKILL_ICONS: Record<Exclude<SkillId, 'vitality'>, LucideIcon> = {
  athletics: Dumbbell,
  acrobatics: Footprints,
  sleightOfHand: Hand,
  stealth: Eye,
  arcana: Wand2,
  history: ScrollText,
  investigation: Search,
  nature: Leaf,
  religion: Sparkles,
  animalHandling: PawPrint,
  insight: Scale,
  medicine: HeartPulse,
  perception: Crosshair,
  survival: TreePine,
  deception: Drama,
  intimidation: Axe,
  performance: Theater,
  persuasion: MessageCircle,
}

export function Sidebar({ currentPage, setCurrentPage }: SidebarProps) {
  return (
    <aside className="relative z-40 flex h-full w-16 shrink-0 flex-col items-center gap-3 overflow-y-auto border-r border-brown/40 bg-ink py-3">
      <Link
        icon={<User size={20} />}
        label="Character"
        onClick={() => setCurrentPage('character')}
        active={currentPage === 'character'}
      />
      {SKILL_ABILITY_GROUPS.map((abbr) => (
        <Section
          key={abbr}
          title={abbr}
          skills={SKILLS.filter((skill) => skill.ability === abbr).map((skill) => {
            const Icon = SKILL_ICONS[skill.id as Exclude<SkillId, 'vitality'>]
            return {
              id: skill.id,
              name: skill.name,
              icon: <Icon size={20} />,
            }
          })}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
        />
      ))}
    </aside>
  )
}
