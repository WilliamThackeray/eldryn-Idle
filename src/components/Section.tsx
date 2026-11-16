import type { ReactNode } from 'react'
import { Link } from './Link'

interface SectionProps {
  title: string
  skills: Array<{ id: string; name: string; icon: ReactNode }>
  currentPage: string
  onNavigate: (page: string) => void
}

export function Section({ title, skills, currentPage, onNavigate }: SectionProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-sage/80">{title}</span>
      {skills.map((skill) => (
        <Link
          key={skill.id}
          icon={skill.icon}
          label={skill.name}
          onClick={() => onNavigate(skill.id)}
          active={currentPage === skill.id}
        />
      ))}
    </div>
  )
}
