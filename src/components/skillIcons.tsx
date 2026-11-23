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
  Wand2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { isSkillId, type SkillId } from '../data/skills'

const SKILL_ICONS: Partial<Record<SkillId, LucideIcon>> = {
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

export function SkillIcon({ id, size = 20 }: { id: string; size?: number }) {
  const Icon = (isSkillId(id) ? SKILL_ICONS[id] : undefined) ?? HeartPulse
  return <Icon size={size} aria-hidden />
}
