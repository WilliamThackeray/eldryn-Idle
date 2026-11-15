import { BookOpen, Dumbbell, Eye, Footprints, Package, ShoppingCart, Sparkles, Swords } from 'lucide-react'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ABILITIES } from '../data/abilities'
import { SKILL_ABILITY_GROUPS, SKILLS } from '../data/skills'
import type { AbilityAbbr } from '../types/game'
import { Link } from './Link'
import { Section } from './Section'

interface SidebarProps {
  currentPage: string
  setCurrentPage: (page: string) => void
}

const GROUP_ICONS: Record<(typeof SKILL_ABILITY_GROUPS)[number], LucideIcon> = {
  STR: Dumbbell,
  DEX: Footprints,
  INT: BookOpen,
  WIS: Eye,
  CHA: Sparkles,
}

export function Sidebar({ currentPage, setCurrentPage }: SidebarProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    combat: true,
    STR: true,
    DEX: true,
    INT: true,
    WIS: true,
    CHA: true,
  })

  const toggle = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="w-64 bg-[#1f1f1f] text-[#DAD6D6] h-screen p-4 flex flex-col gap-4 overflow-auto">
      <Link
        icon={<ShoppingCart size={20} />}
        label="Shop"
        onClick={() => setCurrentPage('shop')}
        active={currentPage === 'shop'}
      />
      <Link
        icon={<Package size={20} />}
        label="Inventory"
        onClick={() => setCurrentPage('inventory')}
        active={currentPage === 'inventory'}
      />

      <Section
        title="Combat"
        icon={<Swords size={20} />}
        isOpen={open.combat}
        onToggle={() => toggle('combat')}
        skills={[{ id: 'monsterHunting', name: 'Monster Hunting' }]}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />

      {SKILL_ABILITY_GROUPS.map((abbr) => {
        const ability = ABILITIES.find((entry) => entry.abbr === abbr)
        const Icon = GROUP_ICONS[abbr]
        return (
          <Section
            key={abbr}
            title={abilityName(ability?.name, abbr)}
            icon={<Icon size={20} />}
            isOpen={open[abbr]}
            onToggle={() => toggle(abbr)}
            skills={SKILLS.filter((skill) => skill.ability === abbr).map((skill) => ({
              id: skill.id,
              name: skill.name,
            }))}
            currentPage={currentPage}
            onNavigate={setCurrentPage}
          />
        )
      })}
    </div>
  )
}

function abilityName(name: string | undefined, abbr: AbilityAbbr): string {
  return name ?? abbr
}
