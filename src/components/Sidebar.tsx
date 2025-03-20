import React, { useState } from 'react';
import { ShoppingCart, Package, Swords, Brain, Sparkles } from 'lucide-react';
import { Link } from './Link';
import { Section } from './Section';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const [sections, setSections] = useState({
    combat: true,
    passive: true,
    nonCombat: true
  });

  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
        isOpen={sections.combat}
        onToggle={() => toggleSection('combat')}
        skills={[
          { id: "ammunition", name: "Ammunition" },
          { id: "finesse", name: "Finesse" },
          { id: "heavy", name: "Heavy" },
          { id: "light", name: "Light" },
          { id: "loading", name: "Loading" },
          { id: "range", name: "Range" },
          { id: "reach", name: "Reach" },
          { id: "special", name: "Special" },
          { id: "thrown", name: "Thrown" },
          { id: "twoHanded", name: "Two-Handed" },
          { id: "versatile", name: "Versatile" }
        ]}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />

      <Section
        title="Passive"
        icon={<Brain size={20} />}
        isOpen={sections.passive}
        onToggle={() => toggleSection('passive')}
        skills={[
          { id: 'passivetbd', name: 'TBD' }
        ]}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />

      <Section
        title="Non-Combat"
        icon={<Sparkles size={20} />}
        isOpen={sections.nonCombat}
        onToggle={() => toggleSection('nonCombat')}
        skills={[
          { id: "acrobatics", name: "Acrobatics" },
          { id: "animalHandling", name: "Animal Handling" },
          { id: "arcana", name: "Arcana" },
          { id: "athletics", name: "Athletics" },
          { id: "deception", name: "Deception" },
          { id: "history", name: "History" },
          { id: "insight", name: "Insight" },
          { id: "intimidation", name: "Intimidation" },
          { id: "investigation", name: "Investigation" },
          { id: "medicine", name: "Medicine" },
          { id: "nature", name: "Nature" },
          { id: "perception", name: "Perception" },
          { id: "performance", name: "Performance" },
          { id: "persuasion", name: "Persuasion" },
          { id: "religion", name: "Religion" },
          { id: "sleightOfHand", name: "Sleight of Hand" },
          { id: "stealth", name: "Stealth" },
          { id: "survival", name: "Survival" }
        ]}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />
    </div>
  );
};