import {
  Anvil,
  Axe,
  Fish,
  FlaskConical,
  Gem,
  Hand,
  HeartPulse,
  Leaf,
  Mountain,
  PawPrint,
  Pickaxe,
  Scale,
  ScrollText,
  Shirt,
  Sparkles,
  Theater,
  TreePine,
  Wand2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { isSkillId, type TradeSkillId } from '../data/skills'

const SKILL_ICONS: Partial<Record<TradeSkillId, LucideIcon>> = {
  mining: Pickaxe,
  smithing: Anvil,
  woodcutting: Axe,
  woodcraft: TreePine,
  leatherworking: Shirt,
  jewelcrafting: Gem,
  thievery: Hand,
  cooking: FlaskConical,
  vitality: HeartPulse,
  alchemy: FlaskConical,
  scribing: ScrollText,
  enchanting: Wand2,
  weaving: Sparkles,
  foraging: Leaf,
  fishing: Fish,
  hunting: PawPrint,
  commerce: Scale,
  performance: Theater,
  binding: Mountain,
}

export function SkillIcon({ id, size = 20 }: { id: string; size?: number }) {
  const Icon = (isSkillId(id) ? SKILL_ICONS[id] : undefined) ?? HeartPulse
  return <Icon size={size} aria-hidden />
}
