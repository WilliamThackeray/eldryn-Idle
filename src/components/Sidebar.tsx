import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ShoppingCart, Package, Swords, Brain, Sparkles } from 'lucide-react';
import { Link } from './Link';
import { Section } from './Section';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const [sections, setSections] = useState({
    combat: true,
    passive: true,
    nonCombat: true
  });

  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="w-64 bg-[#1f1f1f] text-[#DAD6D6] h-screen p-4 flex flex-col gap-4">
      <Link 
        icon={<ShoppingCart size={20} />}
        label="Shop"
        onClick={() => onNavigate('shop')}
        active={currentPage === 'shop'}
      />
      <Link
        icon={<Package size={20} />}
        label="Inventory"
        onClick={() => onNavigate('inventory')}
        active={currentPage === 'inventory'}
      />
      
      <Section
        title="Combat"
        icon={<Swords size={20} />}
        isOpen={sections.combat}
        onToggle={() => toggleSection('combat')}
        skills={[
          { id: 'swordsmanship', name: 'Swordsmanship' },
          { id: 'archery', name: 'Archery' }
        ]}
        currentPage={currentPage}
        onNavigate={onNavigate}
      />

      <Section
        title="Passive"
        icon={<Brain size={20} />}
        isOpen={sections.passive}
        onToggle={() => toggleSection('passive')}
        skills={[
          { id: 'meditation', name: 'Meditation' }
        ]}
        currentPage={currentPage}
        onNavigate={onNavigate}
      />

      <Section
        title="Non-Combat"
        icon={<Sparkles size={20} />}
        isOpen={sections.nonCombat}
        onToggle={() => toggleSection('nonCombat')}
        skills={[
          { id: 'sleightOfHand', name: 'Sleight of Hand' }
        ]}
        currentPage={currentPage}
        onNavigate={onNavigate}
      />
    </div>
  );
};