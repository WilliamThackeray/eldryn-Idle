import React from 'react';

interface LinkProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active: boolean;
}

export const Link: React.FC<LinkProps> = ({ icon, label, onClick, active }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors
        ${active 
          ? 'bg-[#A61C3C] text-[#DAD6D6]' 
          : 'hover:bg-[#694A38] text-[#DAD6D6]'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};