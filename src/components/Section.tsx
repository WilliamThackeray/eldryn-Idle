import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  skills: Array<{ id: string; name: string; }>;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Section: React.FC<SectionProps> = ({
  title,
  icon,
  isOpen,
  onToggle,
  skills,
  currentPage,
  onNavigate
}) => {
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#694A38] text-[#DAD6D6]"
      >
        {icon}
        <span>{title}</span>
        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </button>
      
      {isOpen && (
        <div className="ml-8 flex flex-col gap-1">
          {skills.map(skill => (
            <button
              key={skill.id}
              onClick={() => onNavigate(skill.id)}
              className={`px-4 py-2 rounded-lg text-left transition-colors
                ${currentPage === skill.id 
                  ? 'bg-[#A61C3C] text-[#DAD6D6]' 
                  : 'hover:bg-[#694A38] text-[#DAD6D6]'
                }`}
            >
              {skill.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};